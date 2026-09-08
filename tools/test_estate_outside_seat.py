# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Offline behavioral regressions for the public Hugging Face estate witness.

The transport rejects every unregistered URL. These tests cannot contact the
Hub, consume credentials, or turn an unavailable surface into a successful one.
"""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "estate_outside_seat.py"
SPEC = importlib.util.spec_from_file_location("estate_outside_seat", SCRIPT)
assert SPEC and SPEC.loader
estate = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = estate
SPEC.loader.exec_module(estate)

NOW = datetime(2026, 9, 8, 12, 0, tzinfo=timezone.utc)
FRESH = "2026-09-08T11:00:00Z"
SHA = "a" * 40
OTHER_SHA = "b" * 40
MODEL = "zai-org/GLM-5.3-Flash"
SPACE = "SZLHOLDINGS/alpha"


def model_metadata(repo: str = MODEL) -> dict:
    return {
        "id": repo, "modelId": repo, "sha": SHA, "lastModified": FRESH,
        "private": False, "cardData": {"license": "mit"},
        "tags": ["license:mit"],
    }


def space_metadata(repo: str = SPACE) -> dict:
    return {
        "id": repo, "sha": SHA, "lastModified": FRESH, "private": False,
        "sdk": "docker", "runtime": {"stage": "RUNNING"},
    }


def wave_fixture() -> dict:
    url = f"https://huggingface.co/{MODEL}"
    return {
        "schema": "szl.frontier.integration-wave.v1",
        "wave": "fixture-wave",
        "sourceOfTruth": "szl-holdings/szl-frontier",
        "policy": {
            "defaultEffect": "hold", "automaticDiscovery": True,
            "automaticProductionPromotion": False,
            "changeTransport": "branch-and-pull-request",
        },
        "alreadyAdmitted": [],
        "releases": [{
            "id": "glm-flash-fixture", "primaryArtifact": url,
            "artifacts": [url], "referenceArtifacts": [],
            "licensePosture": "mixed-review-required",
        }],
    }


def pins_fixture() -> dict:
    return {
        "schema": "szl.frontier.upstream-model-pin-set.v1",
        "models": [{
            "releaseId": "glm-flash-fixture", "role": "primary", "repoId": MODEL,
            "revision": SHA, "license": "mit", "lastModified": FRESH,
        }],
    }


class FixtureTransport:
    """Serve exact paths and preserve response bytes for independent checking."""

    def __init__(self) -> None:
        self.routes: dict[str, tuple[int, bytes, dict]] = {}
        self.calls: list[str] = []
        self.served: list[bytes] = []

    def add(self, path: str, payload, status: int = 200, headers=None) -> None:
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        self.routes[path] = (status, body, dict(headers or {}))
        if path.startswith("/api/models/") and "/revision/" not in path and "/tree/" not in path:
            self.routes[f"{path}/revision/{SHA}"] = (status, body, dict(headers or {}))

    def __call__(self, url: str):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.netloc != "huggingface.co":
            raise AssertionError(f"unexpected transport origin: {url}")
        self.calls.append(url)
        key = parts.path + (f"?{parts.query}" if parts.query else "")
        route = self.routes.get(key, self.routes.get(parts.path))
        if route is None:
            raise AssertionError(f"unexpected fixture request: {url}")
        status, body, headers = route
        self.served.append(body)
        return estate.HttpResponse(status, body, headers, url)


class WitnessFixtureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.transport = FixtureTransport()
        self.transport.add(f"/api/models/{MODEL}", model_metadata())
        self.transport.add("/api/spaces", [space_metadata()])
        self.transport.add(f"/api/spaces/{SPACE}", space_metadata())
        self.client = estate.EvidenceClient(
            self.base / "evidence", transport=self.transport, clock=lambda: NOW
        )

    def run_fixture(self, wave=None, **kwargs) -> dict:
        wave_path = self.base / "wave.json"
        wave_path.write_text(json.dumps(wave if wave is not None else wave_fixture()))
        pins_path = self.base / "pins.json"
        pins_path.write_text(json.dumps(pins_fixture()))
        options = {
            "transport": self.transport, "clock": lambda: NOW,
            "expected_spaces": ["alpha"], "creator_spaces": [], "card_watch": [],
            "pins_path": pins_path,
        }
        options.update(kwargs)
        return estate.run(wave_path, self.base / "evidence", **options)

    def install_card(self, kind="space", repo=SPACE, readme=b"A working application.", tree=None):
        plural = "spaces" if kind == "space" else "models"
        meta = space_metadata(repo) if kind == "space" else model_metadata(repo)
        self.transport.add(f"/api/{plural}/{repo}", meta)
        raw_prefix = f"/spaces/{repo}" if kind == "space" else f"/{repo}"
        self.transport.add(f"{raw_prefix}/raw/{SHA}/README.md", readme)
        self.transport.add(
            f"/api/{plural}/{repo}/tree/{SHA}",
            tree if tree is not None else [{"type": "file", "path": "README.md"}],
        )

    def assert_not_verified(self, rows, findings):
        self.assertTrue(findings or any(row.get("status") != "VERIFIED" for row in rows))

    def test_recorded_glm_metadata_verifies_without_promoting(self):
        receipt = self.run_fixture()
        self.assertEqual(receipt["exitCode"], 0, receipt)
        self.assertEqual(receipt["doctrine"]["productionDisposition"], "HOLD")
        self.assertEqual(receipt["doctrine"]["promotionEffect"], "NONE")

    def test_missing_artifact_is_incomplete_and_fails_run(self):
        self.transport.add(f"/api/models/{MODEL}", {"error": "Not found"}, status=404)
        rows, findings = estate.verify_wave(wave_fixture(), self.client, now=NOW)
        self.assertEqual(rows[0]["status"], "INCOMPLETE")
        self.assertEqual(self.run_fixture()["exitCode"], 2)

    def test_metadata_revision_is_required_for_every_reference(self):
        wave = wave_fixture()
        reference = "zai-org/GLM-5.3"
        wave["releases"][0]["artifacts"].append(f"https://huggingface.co/{reference}")
        meta = model_metadata(reference)
        del meta["sha"]
        self.transport.add(f"/api/models/{reference}", meta)
        rows, findings = estate.verify_wave(wave, self.client, now=NOW)
        self.assertEqual(len(rows), 2)
        self.assert_not_verified(rows, findings)

    def test_reference_artifacts_compatibility_does_not_drop_evidence(self):
        wave = wave_fixture()
        reference = "zai-org/GLM-5.3"
        wave["releases"][0]["referenceArtifacts"] = [f"https://huggingface.co/{reference}"]
        self.transport.add(f"/api/models/{reference}", {"error": "missing"}, 404)
        rows, findings = estate.verify_wave(wave, self.client, now=NOW)
        self.assertEqual(len(rows), 2)
        self.assert_not_verified(rows, findings)

    def test_pinned_revision_is_requested_and_mismatching_response_fails(self):
        metadata = model_metadata()
        metadata["sha"] = OTHER_SHA
        self.transport.add(f"/api/models/{MODEL}/revision/{SHA}", metadata)
        receipt = self.run_fixture()
        self.assertEqual(receipt["exitCode"], 2)
        self.assertIn(f"https://huggingface.co/api/models/{MODEL}/revision/{SHA}", self.transport.calls)
        self.assertNotIn(f"https://huggingface.co/api/models/{MODEL}", self.transport.calls)

    def test_missing_artifact_pin_is_config_error_before_network(self):
        pins = pins_fixture()
        pins["models"][0]["repoId"] = "fixture/different-model"
        pin_path = self.base / "missing-pin.json"
        pin_path.write_text(json.dumps(pins))
        receipt = self.run_fixture(pins_path=pin_path)
        self.assertEqual(receipt["exitCode"], 3)
        self.assertEqual(self.transport.calls, [])

    def test_pin_set_base_model_is_verified_in_addition_to_wave_artifacts(self):
        pins = pins_fixture()
        base_repo = "fixture/base-model"
        base_pin = {**pins["models"][0], "repoId": base_repo, "role": "base-model"}
        pins["models"].append(base_pin)
        self.transport.add(f"/api/models/{base_repo}", {"error": "not found"}, 404)
        rows, findings = estate.verify_wave(wave_fixture(), self.client, now=NOW, pins=pins)
        self.assertEqual(len(rows), 2)
        self.assert_not_verified(rows, findings)

    def test_missing_license_does_not_satisfy_review_posture(self):
        meta = model_metadata()
        meta["cardData"] = {}
        meta["tags"] = []
        self.transport.add(f"/api/models/{MODEL}", meta)
        rows, findings = estate.verify_wave(wave_fixture(), self.client, now=NOW)
        self.assert_not_verified(rows, findings)

    def test_clear_mit_cannot_be_satisfied_by_apache_tags(self):
        wave = wave_fixture()
        wave["releases"][0]["licensePosture"] = "clear-mit"
        meta = model_metadata()
        meta["cardData"]["license"] = "apache-2.0"
        meta["tags"] = ["license:apache-2.0"]
        self.transport.add(f"/api/models/{MODEL}", meta)
        rows, findings = estate.verify_wave(wave, self.client, now=NOW)
        self.assert_not_verified(rows, findings)

    def test_invalid_remote_metadata_types_fail_without_traceback(self):
        cases = [
            [], {"sha": SHA, "cardData": []},
            {**model_metadata(), "tags": [123]},
            {**model_metadata(), "cardData": {"license": {"unexpected": "mit"}}},
            {**model_metadata(), "sha": "main"},
        ]
        for meta in cases:
            with self.subTest(metadata=meta):
                self.transport.add(f"/api/models/{MODEL}", meta)
                rows, findings = estate.verify_wave(wave_fixture(), self.client, now=NOW)
                self.assert_not_verified(rows, findings)

    def test_duplicate_candidate_and_admitted_id_fail(self):
        for kind in ("duplicate", "already-admitted"):
            with self.subTest(kind=kind):
                wave = wave_fixture()
                if kind == "duplicate":
                    wave["releases"].append(copy.deepcopy(wave["releases"][0]))
                else:
                    wave["alreadyAdmitted"] = [wave["releases"][0]["id"]]
                rows, findings = estate.verify_wave(wave, self.client, now=NOW)
                self.assertTrue(findings)

    def test_hold_and_no_automatic_promotion_are_enforced(self):
        for key, value in (("defaultEffect", "promote"), ("automaticProductionPromotion", True)):
            with self.subTest(key=key):
                wave = wave_fixture()
                wave["policy"][key] = value
                rows, findings = estate.verify_wave(wave, self.client, now=NOW)
                self.assertTrue(findings)
                self.assertNotEqual(self.run_fixture(wave)["exitCode"], 0)

    def test_empty_or_malformed_wave_cannot_pass_vacuously(self):
        for field, value in (("releases", []), ("releases", {}), ("schema", "unknown"), ("policy", [])):
            with self.subTest(field=field, value=value):
                wave = wave_fixture()
                wave[field] = value
                receipt = self.run_fixture(wave)
                self.assertNotEqual(receipt["exitCode"], 0)

    def test_artifact_url_cannot_inject_queries_fragments_or_non_hub_origins(self):
        bad_urls = [
            "https://example.com/org/model", "https://huggingface.co.evil.invalid/org/model",
            "https://huggingface.co/org/model?redirect=https://example.com",
            "https://huggingface.co/org/model#fragment",
            "https://huggingface.co/org/%2e%2e", "https://huggingface.co/org/model/extra",
        ]
        for url in bad_urls:
            with self.subTest(url=url):
                wave = wave_fixture()
                wave["releases"][0]["primaryArtifact"] = url
                wave["releases"][0]["artifacts"] = [url]
                before = len(self.transport.calls)
                rows, findings = estate.verify_wave(wave, self.client, now=NOW)
                self.assert_not_verified(rows, findings)
                self.assertEqual(len(self.transport.calls), before)

    def test_card_truth_uses_correct_api_and_same_immutable_revision(self):
        self.install_card(readme=b"There is no application backend.", tree=[
            {"type": "file", "path": "README.md"}, {"type": "file", "path": "server.py"}
        ])
        result = estate.check_card_truth("space", SPACE, self.client)
        self.assertEqual(result["status"], "FINDING")
        self.assertTrue(result["findings"])
        self.assertFalse(any("/main/" in url or url.endswith("/main") for url in self.transport.calls))

    def test_model_card_raw_url_has_no_models_prefix(self):
        self.install_card(kind="model", repo=MODEL)
        result = estate.check_card_truth("model", MODEL, self.client)
        self.assertEqual(result["status"], "VERIFIED", result)
        self.assertIn(f"https://huggingface.co/{MODEL}/raw/{SHA}/README.md", self.transport.calls)

    def test_card_missing_readme_or_tree_is_incomplete(self):
        for missing in ("readme", "tree"):
            with self.subTest(missing=missing):
                self.install_card()
                path = (f"/spaces/{SPACE}/raw/{SHA}/README.md" if missing == "readme"
                        else f"/api/spaces/{SPACE}/tree/{SHA}")
                self.transport.add(path, {"error": "missing"}, 404)
                result = estate.check_card_truth("space", SPACE, self.client)
                self.assertEqual(result["status"], "INCOMPLETE")

    def test_tree_pagination_cannot_hide_server_file(self):
        self.install_card(readme=b"no application backend")
        path = f"/api/spaces/{SPACE}/tree/{SHA}"
        next_url = f"https://huggingface.co{path}?cursor=next"
        self.transport.add(path, [{"type": "file", "path": "README.md"}], headers={
            "Link": f'<{next_url}>; rel="next"'
        })
        self.transport.add(path + "?cursor=next", [{"type": "file", "path": "server.py"}])
        result = estate.check_card_truth("space", SPACE, self.client)
        self.assertEqual(result["status"], "FINDING", result)
        self.assertIn(next_url, self.transport.calls)

    def freshness(self, **kwargs):
        return estate.check_spaces_freshness(
            "SZLHOLDINGS", 30, self.client, expected=["alpha"], creators=[], now=NOW, **kwargs
        )

    def test_stale_source_revision_is_reported(self):
        metadata = space_metadata()
        metadata["lastModified"] = "2026-09-01T00:00:00Z"
        self.transport.add("/api/spaces", [metadata])
        self.transport.add(f"/api/spaces/{SPACE}", metadata)
        rows, findings = self.freshness()
        self.assertTrue(findings)
        self.assertGreater(rows[0]["ageHours"], 30)

    def test_missing_malformed_naive_and_future_timestamps_fail(self):
        for stamp in (None, "not-a-date", "2026-09-08T11:00:00", "2026-09-09T11:00:00Z", 123):
            with self.subTest(timestamp=stamp):
                metadata = space_metadata()
                metadata["lastModified"] = stamp
                self.transport.add("/api/spaces", [metadata])
                self.transport.add(f"/api/spaces/{SPACE}", metadata)
                rows, findings = self.freshness()
                self.assertTrue(findings, rows)

    def test_empty_org_listing_cannot_hide_expected_space(self):
        self.transport.add("/api/spaces", [])
        self.transport.add(f"/api/spaces/{SPACE}", {"error": "not found"}, 404)
        rows, findings = self.freshness()
        self.assertTrue(findings)

    def test_paused_and_failed_runtime_are_not_operational(self):
        for stage in ("PAUSED", "RUNTIME_ERROR", "BUILD_ERROR"):
            with self.subTest(stage=stage):
                metadata = space_metadata()
                metadata["runtime"] = {"stage": stage}
                self.transport.add("/api/spaces", [metadata])
                self.transport.add(f"/api/spaces/{SPACE}", metadata)
                rows, findings = self.freshness()
                self.assertTrue(findings, rows)

    def test_creator_space_is_included_in_freshness(self):
        creator = "betterwithage/anatomy"
        metadata = space_metadata(creator)
        metadata["lastModified"] = "2026-09-01T00:00:00Z"
        self.transport.add(f"/api/spaces/{creator}", metadata)
        rows, findings = estate.check_spaces_freshness(
            "SZLHOLDINGS", 30, self.client, expected=["alpha"], creators=[creator], now=NOW
        )
        self.assertTrue(any(row["space"] == creator for row in rows))
        self.assertTrue(findings)

    def test_org_profile_is_observed_directly_when_absent_from_listing(self):
        profile = "SZLHOLDINGS/README"
        metadata = space_metadata(profile)
        metadata["sdk"] = "static"
        self.transport.add(f"/api/spaces/{profile}", metadata)
        rows, findings = estate.check_spaces_freshness(
            "SZLHOLDINGS", 30, self.client, expected=["alpha", "README"], creators=[], now=NOW
        )
        self.assertFalse(findings, findings)
        self.assertEqual({row["space"] for row in rows}, {SPACE, profile})
        self.assertIn(f"https://huggingface.co/api/spaces/{profile}", self.transport.calls)

    def test_org_pagination_retains_all_spaces(self):
        next_url = "https://huggingface.co/api/spaces?author=SZLHOLDINGS&cursor=next"
        self.transport.add("/api/spaces", [space_metadata()], headers={"Link": f'<{next_url}>; rel="next"'})
        beta = space_metadata("SZLHOLDINGS/beta")
        self.transport.add("/api/spaces?author=SZLHOLDINGS&cursor=next", [beta])
        self.transport.add("/api/spaces/SZLHOLDINGS/beta", beta)
        rows, findings = self.freshness()
        self.assertEqual({row["space"] for row in rows}, {SPACE, "SZLHOLDINGS/beta"})
        self.assertFalse(findings, findings)

    def test_pagination_loop_and_cross_origin_link_fail_closed(self):
        for next_url in ("https://huggingface.co/api/spaces", "https://example.com/next"):
            with self.subTest(next_url=next_url):
                self.transport.add("/api/spaces", [space_metadata()], headers={
                    "Link": f'<{next_url}>; rel="next"'
                })
                client = estate.EvidenceClient(self.base / "pagination", transport=self.transport,
                                               clock=lambda: NOW, max_pages=3)
                items, findings = client.pages("https://huggingface.co/api/spaces")
                self.assertTrue(findings)

    def test_invalid_json_and_http_error_preserve_bytes_as_evidence(self):
        for status, body in ((200, b"not-json-\xff"), (503, b'{"error":"temporarily unavailable"}')):
            with self.subTest(status=status):
                self.transport.add(f"/api/models/{MODEL}", body, status)
                receipt = self.run_fixture()
                self.assertEqual(receipt["exitCode"], 2)
                digest = hashlib.sha256(body).hexdigest()
                self.assertTrue(any(o["sha256"] == digest for o in receipt["observations"]))

    def test_receipt_digest_and_every_response_blob_recompute(self):
        receipt = self.run_fixture()
        self.assertEqual(receipt["exitCode"], 0, receipt)
        core = {key: value for key, value in receipt.items() if key != "receiptDigest"}
        self.assertEqual(receipt["receiptDigest"], estate.canonical_digest(core))
        self.assertEqual(len(receipt["observations"]), len(self.transport.served))
        observed = []
        for observation in receipt["observations"]:
            blob = Path(observation["evidencePath"])
            if not blob.is_absolute():
                blob = self.base / "evidence" / blob
            data = blob.read_bytes()
            self.assertEqual(len(data), observation["bytesRead"])
            self.assertEqual(hashlib.sha256(data).hexdigest(), observation["sha256"])
            observed.append(data)
        self.assertCountEqual(observed, self.transport.served)

    def test_previous_receipt_is_linked_only_after_digest_validation(self):
        first = self.run_fixture()
        previous = self.base / "previous.json"
        previous.write_text(json.dumps(first))
        second = self.run_fixture(prev_receipt=previous)
        self.assertEqual(second["exitCode"], 0, second)
        self.assertEqual(second["prevReceipt"], first["receiptDigest"])
        first["generatedAt"] = "2020-01-01T00:00:00Z"
        previous.write_text(json.dumps(first))
        corrupted = self.run_fixture(prev_receipt=previous)
        self.assertNotEqual(corrupted["exitCode"], 0)

    def test_missing_unreadable_or_digestless_previous_receipt_fails(self):
        previous = self.base / "previous.json"
        for payload in (None, "broken-json", "{}", "[]"):
            with self.subTest(payload=payload):
                if payload is not None:
                    previous.write_text(payload)
                receipt = self.run_fixture(prev_receipt=previous)
                self.assertNotEqual(receipt["exitCode"], 0)

    def test_config_error_receipt_cannot_reset_a_failed_chain(self):
        previous = self.run_fixture(stale_hours=-1)
        self.assertEqual(previous["overallStatus"], "CONFIG_ERROR")
        previous_path = self.base / "configuration-error-receipt.json"
        previous_path.write_text(json.dumps(previous))
        receipt = self.run_fixture(prev_receipt=previous_path)
        self.assertEqual(receipt["exitCode"], 3)

    def test_previous_receipt_requires_valid_nonfuture_aware_timestamp(self):
        first = self.run_fixture()
        self.assertEqual(first["exitCode"], 0, first)
        previous_path = self.base / "dated-previous.json"
        for stamp in ("2026-09-09T12:00:00Z", "2026-09-08T11:00:00", "not-a-date"):
            with self.subTest(stamp=stamp):
                previous = {key: value for key, value in first.items() if key != "receiptDigest"}
                previous["generatedAt"] = stamp
                previous["receiptDigest"] = estate.canonical_digest(previous)
                previous_path.write_text(json.dumps(previous))
                receipt = self.run_fixture(prev_receipt=previous_path)
                self.assertEqual(receipt["exitCode"], 3)

    def test_cross_origin_redirect_is_recorded_but_never_followed(self):
        url = f"https://huggingface.co/api/models/{MODEL}"
        self.transport.add(f"/api/models/{MODEL}", b"redirect", 302,
                           {"Location": "https://example.com/private"})
        observation, payload = self.client.json(url)
        self.assertIsNone(payload)
        self.assertEqual(self.transport.calls, [url])
        self.assertTrue(self.client.errors)

    def test_oversized_response_is_incomplete_with_preserved_observed_bytes(self):
        self.transport.add(f"/api/models/{MODEL}", b"0123456789")
        client = estate.EvidenceClient(self.base / "bounded", transport=self.transport,
                                       clock=lambda: NOW, max_bytes=8)
        observation, payload = client.json(f"https://huggingface.co/api/models/{MODEL}")
        self.assertIsNone(payload)
        self.assertFalse(observation["bodyComplete"])
        self.assertEqual(observation["bytesRead"], 10)
        self.assertTrue(observation["error"])

    def test_anonymous_http_transport_ignores_ambient_token_and_proxy(self):
        response = mock.Mock()
        response.code = 200
        response.headers = {}
        response.read.return_value = b"{}"
        response.geturl.return_value = f"https://huggingface.co/api/models/{MODEL}"
        opener = mock.Mock()
        opener.open.return_value = response
        with mock.patch.dict(os.environ, {"HF_TOKEN": "synthetic-test-token",
                                          "HTTPS_PROXY": "http://synthetic:password@example.invalid"}):
            with mock.patch.object(estate.urllib.request, "build_opener", return_value=opener) as build:
                result = estate.http_get(f"https://huggingface.co/api/models/{MODEL}")
        self.assertEqual(result.status, 200)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertNotIn("authorization", {key.lower() for key in request.headers})
        self.assertNotIn("proxy-authorization", {key.lower() for key in request.headers})
        proxy_handler = next(arg for arg in build.call_args.args
                             if isinstance(arg, estate.urllib.request.ProxyHandler))
        self.assertEqual(proxy_handler.proxies, {})

    def test_nonfinite_nonpositive_stale_window_is_config_error(self):
        for stale_hours in (float("nan"), float("inf"), float("-inf"), 0, -1):
            with self.subTest(stale_hours=stale_hours):
                before = len(self.transport.calls)
                receipt = self.run_fixture(stale_hours=stale_hours)
                self.assertEqual(receipt["exitCode"], 3)
                self.assertEqual(len(self.transport.calls), before)

    def test_cli_invalid_wave_and_threshold_emit_receipt_and_exit_three(self):
        for suffix, extra in (("wave", []), ("nan", ["--stale-hours", "nan"])):
            with self.subTest(case=suffix):
                output = self.base / f"cli-{suffix}.json"
                result = subprocess.run(
                    [sys.executable, "-I", "-B", str(SCRIPT), "--wave", str(self.base / "missing.json"),
                     "--receipt", str(output), "--evidence-dir", str(self.base / "cli-evidence"), *extra],
                    capture_output=True, text=True, timeout=20,
                )
                self.assertEqual(result.returncode, 3, result.stdout + result.stderr)
                self.assertNotIn("Traceback", result.stderr)
                receipt = json.loads(output.read_text())
                self.assertEqual(receipt["exitCode"], 3)


if __name__ == "__main__":
    unittest.main()
