"""Offline adversarial tests for saved evidence, independent of provider access."""
from __future__ import annotations

import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1]
if str(SOURCE) not in sys.path:
    sys.path.insert(0, str(SOURCE))
import szl_frontier_codex as core


def bytes_digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":"), allow_nan=False).encode("utf-8")


def observed_fixture() -> dict:
    """Synthetic metadata only: no fixture claims deployed or trained software."""
    identifier = "fixture-org/shared-name"
    hf = {}
    for kind in ("models", "datasets", "spaces"):
        hf[kind] = [{"id": identifier, "sha": "b" * 40, "license": "mit",
                     "artifact_type": "unknown", "evidence_class": "UNKNOWN",
                     "runtime_state": "UNKNOWN", "files": [], "private": False}]
    hf["collections"] = []
    return {
        "github": [{"owner": "fixture-org", "name": "sample", "revision": "a" * 40,
                    "default_branch": "main", "license": "MIT", "archived": False,
                    "disabled": False, "audit_state": "OBSERVED", "tree_truncated": False,
                    "archetype": "web-frontend", "path_findings": [],
                    "ci": {"check_runs": [], "workflow_runs": []}}],
        "huggingface": hf,
        "errors": [],
        "coverage": {"github": {"complete": True}, "huggingface": {"complete": True}},
        "request_stats": {"requests": 0},
    }


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="szl-integrity-")
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.root = self.base / "snapshot"
        self.root.mkdir()
        self.no_network = patch("urllib.request.urlopen", side_effect=AssertionError("Network forbidden in integrity tests"))
        self.no_network.start()
        self.addCleanup(self.no_network.stop)
        self.observed = observed_fixture()
        self.preflight = {"github_org": "fixture-org", "huggingface_org": "fixture-org",
                          "scope": "SYNTHETIC_OFFLINE_TEST", "remote_mutation": False}
        self.report = core.build_snapshot(self.root, copy.deepcopy(self.observed), self.preflight)

    def read(self, name):
        return json.loads((self.root / name).read_text(encoding="utf-8"))

    def write(self, name, value):
        (self.root / name).write_bytes(canonical(value) + b"\n")

    def receipts(self):
        return [json.loads(line) for line in (self.root / "migration_receipts.jsonl").read_text(encoding="utf-8").splitlines()]

    def write_receipts(self, entries):
        (self.root / "migration_receipts.jsonl").write_bytes(b"".join(canonical(entry) + b"\n" for entry in entries))

    def assert_rejected(self):
        result = core.verify_bundle(self.root)
        self.assertIs(result["passed"], False, result)
        self.assertTrue(result["errors"], result)
        return result

    def add_third_receipt(self):
        core.append_receipt(self.root, "test.third-observation", {}, {}, "OBSERVED")
        core.seal_bundle(self.root)
        self.assertEqual(len(self.receipts()), 3)

    def test_valid_bundle_and_file_checksums_use_actual_bytes(self):
        result = core.verify_bundle(self.root, self.report["bundle_sha256"])
        self.assertIs(result["passed"], True, result)
        self.assertIs(result["external_anchor_checked"], True)
        self.assertIs(result["signed"], False)
        for stem in ("estate_manifest", "bundle_manifest"):
            file_bytes = (self.root / (stem + ".json")).read_bytes()
            checksum = (self.root / (stem + ".sha256")).read_text(encoding="utf-8").split()[0]
            self.assertEqual(checksum, bytes_digest(file_bytes))
            self.assertTrue(file_bytes.endswith(b"\n"))
        seal = self.read("bundle_manifest.json")
        for relative, expected in seal["files"].items():
            self.assertEqual(expected, bytes_digest((self.root / relative).read_bytes()), relative)

    def test_plan_tampering_is_detected(self):
        plan = self.read("migration_plan.json")
        plan["remote_mutation_authorized"] = True
        self.write("migration_plan.json", plan)
        self.assert_rejected()

    def test_findings_tampering_is_detected(self):
        self.write("findings.json", [{"severity": "PASS", "code": "fabricated"}])
        self.assert_rejected()

    def test_scorecard_tampering_is_detected(self):
        card = next((self.root / "huggingface_scorecards").rglob("*.json"))
        data = json.loads(card.read_text(encoding="utf-8"))
        data["scores"]["security"] = {"score": 5, "state": "VERIFIED", "evidence": []}
        card.write_bytes(canonical(data) + b"\n")
        self.assert_rejected()

    def test_scorecards_preserve_same_hub_id_in_different_kinds(self):
        cards = [json.loads(path.read_text(encoding="utf-8"))
                 for path in (self.root / "huggingface_scorecards").rglob("*.json")]
        self.assertEqual(len(cards), 3)
        self.assertEqual({card["kind"] for card in cards}, {"models", "datasets", "spaces"})
        self.assertEqual({card["asset"] for card in cards}, {"fixture-org/shared-name"})

    def test_missing_bound_file_is_detected(self):
        (self.root / "findings.json").unlink()
        self.assert_rejected()

    def test_unsealed_file_is_detected(self):
        (self.root / "unobserved.txt").write_text("Not part of the observation", encoding="utf-8")
        self.assert_rejected()

    def test_missing_checksum_is_detected(self):
        (self.root / "estate_manifest.sha256").unlink()
        self.assert_rejected()

    def test_empty_checksum_is_detected(self):
        (self.root / "bundle_manifest.sha256").write_text("", encoding="utf-8")
        self.assert_rejected()

    def test_checksum_bound_to_wrong_filename_is_rejected(self):
        value = bytes_digest((self.root / "bundle_manifest.json").read_bytes())
        (self.root / "bundle_manifest.sha256").write_text(value + "  different.json\n", encoding="utf-8")
        self.assert_rejected()

    def test_malformed_json_is_a_failed_result_not_exception(self):
        (self.root / "estate_manifest.json").write_text('{"schema":', encoding="utf-8")
        self.assert_rejected()

    def test_nonobject_seal_is_a_failed_result_not_exception(self):
        for value in ([], None, "not-a-manifest", 7):
            with self.subTest(value=value):
                self.write("bundle_manifest.json", value)
                self.assert_rejected()

    def test_duplicate_seal_keys_are_rejected(self):
        original = (self.root / "bundle_manifest.json").read_text(encoding="utf-8")
        (self.root / "bundle_manifest.json").write_text('{"signed":true,' + original[1:], encoding="utf-8")
        self.assert_rejected()

    def test_empty_receipt_chain_is_rejected(self):
        (self.root / "migration_receipts.jsonl").write_bytes(b"")
        self.assert_rejected()
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_middle_receipt_content_corruption_is_detected(self):
        self.add_third_receipt()
        entries = self.receipts()
        entries[1]["result"] = "FABRICATED_APPROVAL"
        self.write_receipts(entries)
        result = self.assert_rejected()
        self.assertTrue(any("content hash mismatch" in error for error in result["errors"]), result)
        with self.assertRaises(core.EvidenceError):
            core.append_receipt(self.root, "extension", {}, {}, "OBSERVED")

    def test_invalid_predecessor_rejected_even_with_recomputed_content_hash(self):
        self.add_third_receipt()
        entries = self.receipts()
        entries[1]["previous_receipt_sha256"] = "0" * 64
        entries[1].pop("receipt_sha256")
        entries[1]["receipt_sha256"] = bytes_digest(canonical(entries[1]))
        entries[2]["previous_receipt_sha256"] = entries[1]["receipt_sha256"]
        entries[2].pop("receipt_sha256")
        entries[2]["receipt_sha256"] = bytes_digest(canonical(entries[2]))
        self.write_receipts(entries)
        result = self.assert_rejected()
        self.assertTrue(any("chain mismatch" in error for error in result["errors"]), result)
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_duplicate_receipt_keys_cannot_be_sealed(self):
        path = self.root / "migration_receipts.jsonl"
        text = path.read_text(encoding="utf-8")
        # The later valid value would hide an earlier authority claim in parsers
        # that accept duplicate keys; the byte representation must be unambiguous.
        path.write_text('{"remote_mutation":true,' + text[1:], encoding="utf-8")
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_malformed_receipt_json_is_rejected(self):
        (self.root / "migration_receipts.jsonl").write_text("not json\n", encoding="utf-8")
        self.assert_rejected()

    def test_claimed_signature_without_signature_is_rejected(self):
        entries = self.receipts()
        entries[-1]["signed"] = True
        entries[-1].pop("receipt_sha256")
        entries[-1]["receipt_sha256"] = bytes_digest(canonical(entries[-1]))
        self.write_receipts(entries)
        result = self.assert_rejected()
        self.assertTrue(any("authority claim" in error for error in result["errors"]), result)

    def test_independent_anchor_detects_fully_resealed_substitution(self):
        original_anchor = self.report["bundle_sha256"]
        plan = self.read("migration_plan.json")
        plan["attacker_supplied_note"] = "This changed content is not the retained observation."
        self.write("migration_plan.json", plan)
        updated_hash = bytes_digest((self.root / "migration_plan.json").read_bytes())
        entries = self.receipts()
        previous = ""
        for entry in entries:
            for key in ("inputs", "outputs"):
                if "migration_plan.json" in entry[key]:
                    entry[key]["migration_plan.json"] = updated_hash
            entry["previous_receipt_sha256"] = previous
            entry.pop("receipt_sha256")
            entry["receipt_sha256"] = bytes_digest(canonical(entry))
            previous = entry["receipt_sha256"]
        self.write_receipts(entries)
        resealed = core.seal_bundle(self.root)
        self.assertNotEqual(resealed["bundle_sha256"], original_anchor)
        self.assertIs(core.verify_bundle(self.root)["passed"], True,
                      "An unsigned recomputed bundle establishes self-consistency only")
        anchored = core.verify_bundle(self.root, original_anchor)
        self.assertIs(anchored["passed"], False)
        self.assertTrue(any("digest mismatch" in error for error in anchored["errors"]), anchored)

    def test_parent_traversal_receipt_binding_cannot_be_sealed(self):
        outside = self.base / "outside.txt"
        outside.write_text("outside evidence root", encoding="utf-8")
        core.append_receipt(self.root, "unsafe-binding", {},
                            {"../outside.txt": bytes_digest(outside.read_bytes())}, "OBSERVED")
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_absolute_receipt_binding_cannot_be_sealed(self):
        outside = self.base / "outside.txt"
        outside.write_text("outside evidence root", encoding="utf-8")
        core.append_receipt(self.root, "unsafe-binding", {},
                            {outside.as_posix(): bytes_digest(outside.read_bytes())}, "OBSERVED")
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_symlink_cannot_be_sealed(self):
        outside = self.base / "outside.txt"
        outside.write_text("outside evidence root", encoding="utf-8")
        linked = self.root / "linked.txt"
        try:
            linked.symlink_to(outside)
        except OSError as exc:
            self.skipTest("Host does not grant symlink creation: " + type(exc).__name__)
        with self.assertRaises(core.EvidenceError):
            core.seal_bundle(self.root)

    def test_nonempty_snapshot_is_preserved(self):
        before = {path.relative_to(self.root).as_posix(): path.read_bytes()
                  for path in self.root.rglob("*") if path.is_file()}
        with self.assertRaises(core.EvidenceError):
            core.build_snapshot(self.root, observed_fixture(), self.preflight)
        after = {path.relative_to(self.root).as_posix(): path.read_bytes()
                 for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(before, after)

    def test_partial_coverage_does_not_become_ready(self):
        target = self.base / "partial"
        target.mkdir()
        observed = observed_fixture()
        observed["coverage"]["github"]["complete"] = False
        result = core.build_snapshot(target, observed, self.preflight)
        self.assertEqual(result["status"], "PARTIAL")
        self.assertIs(result["verification"]["passed"], True,
                      "Intact evidence and complete provider coverage are separate properties")
        plan = json.loads((target / "migration_plan.json").read_text(encoding="utf-8"))
        self.assertIsNone(plan["pilot_candidate"])
        self.assertFalse(any(item["eligible_for_pilot"] for item in plan["github_ranked"]))

    def test_verify_cli_wrong_retained_hash_fails_with_exit_three(self):
        stream = io.StringIO()
        with patch("sys.stdout", stream):
            code = core.main(["verify", "--output", str(self.root),
                              "--expected-bundle-sha256", "0" * 64])
        self.assertEqual(code, 3)
        result = json.loads(stream.getvalue())
        self.assertIs(result["passed"], False)
        self.assertIs(result["external_anchor_checked"], True)

    def test_verify_cli_missing_file_fails_with_exit_three(self):
        (self.root / "migration_plan.json").unlink()
        stream = io.StringIO()
        with patch("sys.stdout", stream):
            code = core.main(["verify", "--output", str(self.root)])
        self.assertEqual(code, 3)
        self.assertIs(json.loads(stream.getvalue())["passed"], False)

    def test_inventory_can_be_planned_once_with_retained_anchor(self):
        target = self.base / "inventory-only"
        target.mkdir()
        inventory = core.build_snapshot(target, observed_fixture(), self.preflight, stage="inventory")
        self.assertFalse((target / "migration_plan.json").exists())
        stream = io.StringIO()
        with patch("sys.stdout", stream):
            code = core.main(["plan", "--output", str(target),
                              "--expected-bundle-sha256", inventory["bundle_sha256"]])
        self.assertEqual(code, 0, stream.getvalue())
        result = json.loads(stream.getvalue())
        self.assertIs(result["passed"], True, result)
        self.assertNotEqual(result["bundle_sha256"], inventory["bundle_sha256"])
        self.assertTrue((target / "migration_plan.json").is_file())
        self.assertIs(core.verify_bundle(target)["passed"], True)
        before = {path.relative_to(target).as_posix(): path.read_bytes()
                  for path in target.rglob("*") if path.is_file()}
        with patch("sys.stderr", io.StringIO()):
            self.assertEqual(core.main(["plan", "--output", str(target)]), 1)
        after = {path.relative_to(target).as_posix(): path.read_bytes()
                 for path in target.rglob("*") if path.is_file()}
        self.assertEqual(before, after)

    def test_plan_does_not_extend_tampered_inventory(self):
        target = self.base / "tampered-inventory"
        target.mkdir()
        core.build_snapshot(target, observed_fixture(), self.preflight, stage="inventory")
        (target / "findings.json").write_text("[] ", encoding="utf-8")
        original_receipts = (target / "migration_receipts.jsonl").read_bytes()
        with patch("sys.stderr", io.StringIO()):
            self.assertEqual(core.main(["plan", "--output", str(target)]), 1)
        self.assertFalse((target / "migration_plan.json").exists())
        self.assertEqual((target / "migration_receipts.jsonl").read_bytes(), original_receipts)

    def test_diff_keeps_same_id_kinds_separate_and_absence_is_not_deletion(self):
        target = self.base / "new-observation"
        target.mkdir()
        observed = observed_fixture()
        observed["huggingface"]["models"] = []
        observed["huggingface"]["spaces"][0]["provider_stage"] = "PAUSED"
        core.build_snapshot(target, observed, self.preflight)
        result = core.diff_bundles(self.root, target)
        self.assertEqual(result["not_observed_in_new_snapshot"],
                         ["huggingface:models:fixture-org/shared-name"])
        self.assertEqual([item["asset"] for item in result["changed"]],
                         ["huggingface:spaces:fixture-org/shared-name"])
        self.assertIn("not proof of deletion", result["claim_boundary"])

    def test_diff_refuses_invalid_input_bundle(self):
        target = self.base / "new-observation"
        target.mkdir()
        core.build_snapshot(target, observed_fixture(), self.preflight)
        (self.root / "estate_manifest.json").write_bytes(b"{}\n")
        with self.assertRaises(core.EvidenceError):
            core.diff_bundles(self.root, target)

    def test_diff_observes_collector_runtime_stage_changes(self):
        before = self.base / "runtime-before"
        after = self.base / "runtime-after"
        before.mkdir()
        after.mkdir()
        observed = observed_fixture()
        space = observed["huggingface"]["spaces"][0]
        space["provider_runtime"] = {"stage": "RUNNING", "evidence_class": "DECLARED"}
        space["provider_stage"] = "LEGACY_VALUE"
        core.build_snapshot(before, copy.deepcopy(observed), self.preflight)
        space["provider_runtime"]["stage"] = "PAUSED"
        core.build_snapshot(after, observed, self.preflight)
        changes = core.diff_bundles(before, after)["changed"]
        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]["asset"], "huggingface:spaces:fixture-org/shared-name")
        self.assertEqual(changes[0]["before"]["provider_stage"], "RUNNING")
        self.assertEqual(changes[0]["after"]["provider_stage"], "PAUSED")

    def test_diff_missing_owner_uses_manifest_organization(self):
        before = self.base / "partial-before"
        after = self.base / "partial-after"
        before.mkdir()
        after.mkdir()
        observed = observed_fixture()
        observed["github"] = [{"name": "sample", "audit_state": "PARTIAL", "errors": [{"code": "INVALID_SCHEMA"}]}]
        observed["coverage"]["github"]["complete"] = False
        core.build_snapshot(before, copy.deepcopy(observed), self.preflight, stage="inventory")
        observed["github"][0]["owner"] = "fixture-org"
        core.build_snapshot(after, observed, self.preflight, stage="inventory")
        comparison = core.diff_bundles(before, after)
        self.assertEqual(comparison["changed"], [])
        self.assertEqual(comparison["newly_observed"], [])
        self.assertEqual(comparison["not_observed_in_new_snapshot"], [])

    def test_diff_ignores_only_revision_observation_timestamp(self):
        before = self.base / "revision-before"
        after = self.base / "revision-after"
        changed = self.base / "revision-changed"
        for target in (before, after, changed):
            target.mkdir()
        observed = observed_fixture()
        observed["github"][0]["revision"] = {
            "commit_sha": "a" * 40, "tree_sha": "b" * 40,
            "binding": "IMMUTABLE_COMMIT_AND_TREE", "observed_at": "2026-10-06T12:00:00Z"}
        core.build_snapshot(before, copy.deepcopy(observed), self.preflight)
        observed["github"][0]["revision"]["observed_at"] = "2026-10-07T12:00:00Z"
        core.build_snapshot(after, copy.deepcopy(observed), self.preflight)
        before_bytes = (before / "estate_manifest.json").read_bytes()
        after_bytes = (after / "estate_manifest.json").read_bytes()
        self.assertEqual(core.diff_bundles(before, after)["changed"], [])
        self.assertEqual((before / "estate_manifest.json").read_bytes(), before_bytes)
        self.assertEqual((after / "estate_manifest.json").read_bytes(), after_bytes)
        observed["github"][0]["revision"]["tree_sha"] = "c" * 40
        observed["github"][0]["ci"]["observed_at"] = "2026-10-07T13:00:00Z"
        core.build_snapshot(changed, observed, self.preflight)
        changes = core.diff_bundles(after, changed)["changed"]
        self.assertEqual([item["asset"] for item in changes], ["github:fixture-org/sample"])
        self.assertEqual(changes[0]["after"]["revision"]["tree_sha"], "c" * 40)
        self.assertNotIn("observed_at", changes[0]["after"]["revision"])
        self.assertEqual(changes[0]["after"]["ci"]["observed_at"], "2026-10-07T13:00:00Z")

    def test_serve_wrong_anchor_never_opens_listener(self):
        with patch("http.server.ThreadingHTTPServer") as server:
            with self.assertRaises(core.EvidenceError):
                core.serve(self.root, 0, "0" * 64)
            server.assert_not_called()

    def test_diff_rejects_wrong_anchor_for_either_snapshot(self):
        target = self.base / "new-observation"
        target.mkdir()
        second = core.build_snapshot(target, observed_fixture(), self.preflight)
        before_anchor = self.report["bundle_sha256"]
        after_anchor = second["bundle_sha256"]
        for before, after in (("0" * 64, after_anchor), (before_anchor, "0" * 64)):
            with self.subTest(before=before, after=after):
                with self.assertRaises(core.EvidenceError):
                    core.diff_bundles(self.root, target, before, after)
        result = core.diff_bundles(self.root, target, before_anchor, after_anchor)
        self.assertEqual(result["changed"], [])

    def test_cli_rejects_malformed_or_inapplicable_anchor(self):
        for arguments in (["verify", "--expected-bundle-sha256", "not-a-hash"],
                          ["all", "--expected-bundle-sha256", "0" * 64],
                          ["verify", "--baseline-bundle-sha256", "0" * 64]):
            with self.subTest(arguments=arguments), patch("sys.stderr", io.StringIO()):
                with self.assertRaises(SystemExit) as raised:
                    core.parse_args(arguments)
                self.assertEqual(raised.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
