# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Offline contracts for the SZL Frontier Hugging Face writer and source witness."""
from __future__ import annotations

import ast
import importlib.util
import json
import re
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
PUBLISHER = ROOT / ".github/scripts/publish_frontier.py"
WORKFLOW = ROOT / ".github/workflows/hf-sync.yml"
DOCKERFILE = ROOT / "Dockerfile"
SPACE_CARD = ROOT / "README.md"
DATASET_DIR = ROOT / "hf" / "dataset"

_spec = importlib.util.spec_from_file_location("publish_frontier", PUBLISHER)
assert _spec is not None and _spec.loader is not None
publish_frontier = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(publish_frontier)

CREATED = "a" * 40
OLD = "b" * 40
SOURCE = "c" * 40


def _front_matter(path: Path) -> str:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    assert match, f"{path} has no front matter"
    return match.group(1)


def _fake_get(space_states: list[dict], health: tuple[int, dict], ident: tuple[int, dict]):
    states = list(space_states)

    def get(url: str):
        if url.endswith(f"/spaces/{publish_frontier.SPACE_ID}"):
            state = states.pop(0) if len(states) > 1 else states[0]
            return 200, json.dumps(state).encode()
        if url == f"{publish_frontier.SPACE_ORIGIN}/healthz":
            return health[0], json.dumps(health[1]).encode()
        if url == f"{publish_frontier.SPACE_ORIGIN}/deployment.json":
            return ident[0], json.dumps(ident[1]).encode()
        raise AssertionError(f"unexpected probe {url}")

    return get


def _clock():
    now = [0.0]

    def monotonic() -> float:
        return now[0]

    def sleep(seconds: float) -> None:
        now[0] += seconds

    return monotonic, sleep


GOOD_IDENT = {
    "source_repository": "szl-holdings/szl-frontier",
    "source_revision": SOURCE,
}
GOOD_HEALTH = {"schema": "szl.frontier.health/v1", "ok": True}


class FrontierHfSourceWitnessTests(unittest.TestCase):
    def test_publisher_generates_exact_non_secret_identity(self) -> None:
        text = PUBLISHER.read_text(encoding="utf-8")
        tree = ast.parse(text)
        for token in (
            'SOURCE_REPOSITORY = "szl-holdings/szl-frontier"',
            '"schema": "szl.runtime-source/v1"',
            '"source_repository": SOURCE_REPOSITORY',
            '"source_revision": source_sha',
            'root / "public" / "deployment.json"',
            're.fullmatch(r"[0-9a-f]{40}", candidate)',
        ):
            self.assertIn(token, text)

        identity_writer = next(
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "write_source_identity"
        )
        identity_source = ast.get_source_segment(text, identity_writer) or ""
        self.assertNotIn("HF_TOKEN", identity_source)
        self.assertNotIn("HF_ORG_TOKEN", identity_source)

    def test_publisher_never_creates_repos_or_changes_visibility(self) -> None:
        tree = ast.parse(PUBLISHER.read_text(encoding="utf-8"))
        called = {
            node.func.attr
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
        }
        self.assertNotIn("create_repo", called)
        self.assertNotIn("update_repo_visibility", called)
        self.assertNotIn("update_repo_settings", called)

    def test_each_asset_has_its_own_canonical_lock(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        locks = re.findall(r"^\s+lock: (\S+)$", workflow, re.M)
        expected = sorted(
            publish_frontier.lock_group(spec["repo_type"], spec["repo_id"])
            for spec in publish_frontier.TARGETS.values()
        )
        self.assertEqual(sorted(locks), expected)
        self.assertEqual(
            expected,
            [
                "hf-write/dataset/SZLHOLDINGS/szl-frontier-covenant",
                "hf-write/space/SZLHOLDINGS/szl-frontier",
            ],
        )
        self.assertIn("group: ${{ matrix.lock }}", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertNotIn("event_name", workflow)

    def test_hub_client_comes_only_from_the_pinned_hash_locked_closure(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertRegex(workflow, r"SHARED_PUBLISHER_SHA: [0-9a-f]{40}\n")
        self.assertRegex(workflow, r"SHARED_LOCK_BLOB: [0-9a-f]{40}\n")
        self.assertIn('test "$(git hash-object "$LOCK")" = "$SHARED_LOCK_BLOB"', workflow)
        self.assertIn("--require-hashes --only-binary=:all:", workflow)
        self.assertNotRegex(workflow, r"pip install[^\n]*huggingface[_-]hub")
        self.assertEqual(workflow.count("publish_frontier.py"), 1)

    def test_space_attestation_converges_on_the_exact_created_commit(self) -> None:
        monotonic, sleep = _clock()
        get = _fake_get(
            [
                {"sha": CREATED, "runtime": {"stage": "RUNNING", "sha": OLD}},
                {"sha": CREATED, "runtime": {"stage": "BUILDING", "sha": CREATED}},
                {"sha": CREATED, "runtime": {"stage": "RUNNING", "sha": CREATED}},
            ],
            (200, GOOD_HEALTH),
            (200, GOOD_IDENT),
        )
        result = publish_frontier.attest_space_runtime(
            CREATED, SOURCE, timeout_s=300, interval_s=15, get=get, sleep=sleep, monotonic=monotonic
        )
        self.assertEqual(result["running_sha"], CREATED)
        self.assertEqual(result["healthz"]["status"], 200)
        self.assertEqual(result["deployment"]["source_revision"], SOURCE)

    def test_space_attestation_fails_closed_on_build_error(self) -> None:
        monotonic, sleep = _clock()
        get = _fake_get(
            [{"sha": CREATED, "runtime": {"stage": "BUILD_ERROR", "sha": CREATED}}],
            (200, GOOD_HEALTH),
            (200, GOOD_IDENT),
        )
        with self.assertRaisesRegex(publish_frontier.PublishError, "BUILD_ERROR"):
            publish_frontier.attest_space_runtime(
                CREATED, SOURCE, timeout_s=300, get=get, sleep=sleep, monotonic=monotonic
            )

    def test_space_attestation_requires_healthz_and_exact_revision(self) -> None:
        running = [{"sha": CREATED, "runtime": {"stage": "RUNNING", "sha": CREATED}}]
        for health, ident in (
            ((404, {}), (200, GOOD_IDENT)),
            ((200, GOOD_HEALTH), (200, {**GOOD_IDENT, "source_revision": OLD})),
            ((200, GOOD_HEALTH), (200, {**GOOD_IDENT, "source_repository": "szl-holdings/a11oy"})),
        ):
            monotonic, sleep = _clock()
            with self.assertRaisesRegex(publish_frontier.PublishError, "did not converge"):
                publish_frontier.attest_space_runtime(
                    CREATED,
                    SOURCE,
                    timeout_s=60,
                    get=_fake_get(running, health, ident),
                    sleep=sleep,
                    monotonic=monotonic,
                )

    def test_readback_requires_hub_head_to_equal_created_commit(self) -> None:
        api = SimpleNamespace(repo_info=lambda **_: SimpleNamespace(sha=OLD))
        with self.assertRaisesRegex(publish_frontier.PublishError, "is not the created commit"):
            publish_frontier.read_back_head(api, publish_frontier.SPACE_ID, "space", CREATED)
        api = SimpleNamespace(repo_info=lambda **_: SimpleNamespace(sha=CREATED))
        self.assertEqual(
            publish_frontier.read_back_head(api, publish_frontier.SPACE_ID, "space", CREATED),
            CREATED,
        )

    def test_absent_target_repo_fails_closed(self) -> None:
        api = SimpleNamespace(repo_exists=lambda **_: False)
        with self.assertRaisesRegex(publish_frontier.PublishError, "target repo absent"):
            publish_frontier.require_existing_repo(api, publish_frontier.DATASET_ID, "dataset")

    def test_vite_image_includes_the_public_identity(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")
        self.assertIn("COPY . .", dockerfile)
        self.assertIn("npm run typecheck && npm run build", dockerfile)

    def test_image_is_digest_pinned_and_probes_healthz(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")
        froms = re.findall(r"^FROM (\S+)", dockerfile, re.M)
        self.assertTrue(froms)
        for image in froms:
            self.assertRegex(image, r"@sha256:[0-9a-f]{64}$")
        self.assertRegex(dockerfile, r"HEALTHCHECK [^\n]*\\\n\s+CMD [^\n]*127\.0\.0\.1:7860/healthz")

    def test_cards_name_this_repository_as_source(self) -> None:
        for card in (SPACE_CARD, DATASET_DIR / "README.md"):
            self.assertRegex(
                _front_matter(card),
                r"(?m)^szl:\n  source_repo: szl-holdings/szl-frontier$",
                card,
            )
        self.assertIn(
            "(https://github.com/szl-holdings/szl-frontier)",
            SPACE_CARD.read_text(encoding="utf-8"),
        )

    def test_dataset_card_lists_every_published_file(self) -> None:
        card = (DATASET_DIR / "README.md").read_text(encoding="utf-8")
        listed = set(re.findall(r"(?m)^\| `([^`]+)` \|", card))
        published = {p.name for p in DATASET_DIR.iterdir() if p.is_file() and p.name != "README.md"}
        self.assertEqual(listed, published)


if __name__ == "__main__":
    unittest.main()
