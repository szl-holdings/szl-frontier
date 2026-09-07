"""Offline regression tests; fixtures are not model performance evidence."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from szl_frontier.edge_lane import (
    ARTIFACTS, MODEL_ID, MODEL_REVISION, EdgeError, _NoRedirect,
    build_plan, check_tool_response, digest, edge_admissions, fetch_metadata,
    material_identity, scan, strict_json,
)


def metadata(repo=MODEL_ID, revision=MODEL_REVISION):
    return {"id": repo, "sha": revision, "private": False, "gated": False, "disabled": False,
            "cardData": {"license": "apache-2.0"}, "pipeline_tag": "text-generation",
            "library_name": "transformers", "likes": 1,
            "siblings": [{"rfilename": "README.md", "blobId": "1" * 40, "size": 100},
                         {"rfilename": "model.safetensors", "lfs": {"sha256": "2" * 64, "size": 500}},
                         {"rfilename": "config.json", "blobId": "3" * 40, "size": 50}]}


def response():
    return {"model": MODEL_ID, "choices": [{"index": 0, "finish_reason": "tool_calls",
        "message": {"role": "assistant", "content": None, "tool_calls": [{"id": "fixture-call",
        "type": "function", "function": {"name": "lookup_evidence", "arguments": '{"evidence_id":"fixture_1"}'}}]}}]}


class IdentityTests(unittest.TestCase):
    def test_cosmetic_revision_likes_and_card_prose_do_not_alert(self):
        before, after = metadata(), metadata()
        after.update(sha="a" * 40, likes=999, lastModified="2099-01-01")
        after["siblings"][0].update(blobId="b" * 40, size=500)
        after["cardData"]["description"] = "new marketing copy"
        self.assertEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_readme_image_change_is_cosmetic(self):
        before, after = metadata(), metadata()
        after["siblings"].append({"rfilename": "assets/chart.png", "blobId": "4" * 40, "size": 10})
        self.assertEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_same_name_same_size_weight_change_is_material(self):
        before, after = metadata(), metadata()
        after["siblings"][1]["lfs"]["sha256"] = "4" * 64
        self.assertNotEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_license_change_is_material(self):
        before, after = metadata(), metadata()
        after["cardData"]["license"] = "other"
        self.assertNotEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_readme_data_config_change_is_material(self):
        before, after = metadata(), metadata()
        after["cardData"]["default_config_name"] = "General-Agent"
        self.assertNotEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_license_file_change_is_material(self):
        before, after = metadata(), metadata()
        after["siblings"].append({"rfilename": "LICENSE.md", "blobId": "4" * 40, "size": 10})
        self.assertNotEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_private_or_gated_change_is_material(self):
        for key, value in [("private", True), ("gated", "auto"), ("disabled", True)]:
            with self.subTest(key=key):
                before, after = metadata(), metadata()
                after[key] = value
                self.assertNotEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_missing_blob_identity_fails_closed(self):
        payload = metadata()
        del payload["siblings"][1]["lfs"]
        with self.assertRaises(EdgeError):
            material_identity(payload, MODEL_ID)

    def test_missing_license_fails_closed(self):
        payload = metadata()
        del payload["cardData"]
        with self.assertRaises(EdgeError):
            material_identity(payload, MODEL_ID)

    def test_invalid_paths_or_duplicate_paths_fail_closed(self):
        for name in ["../outside", "/root/file", "data//x", "data\\x", "data/./x", "config.json"]:
            with self.subTest(name=name):
                payload = metadata()
                payload["siblings"].append({"rfilename": name, "blobId": "4" * 40, "size": 10})
                with self.assertRaises(EdgeError):
                    material_identity(payload, MODEL_ID)

    def test_bad_revision_or_repository_fails_closed(self):
        for field, value in [("sha", "main"), ("id", "other/model")]:
            with self.subTest(field=field):
                payload = metadata()
                payload[field] = value
                with self.assertRaises(EdgeError):
                    material_identity(payload, MODEL_ID)

    def test_inventory_order_does_not_matter(self):
        before, after = metadata(), metadata()
        after["siblings"].reverse()
        self.assertEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))

    def test_sha256_oid_prefix_is_normalized(self):
        before, after = metadata(), metadata()
        after["siblings"][1]["lfs"] = {"oid": "sha256:" + "2" * 64, "size": 500}
        self.assertEqual(material_identity(before, MODEL_ID), material_identity(after, MODEL_ID))


class WatchTests(unittest.TestCase):
    def test_unchanged_sources_remain_quiet_and_fixture_is_not_live(self):
        def fetch(kind, repo, revision):
            pin = next(a[2] for a in ARTIFACTS if a[1] == repo)
            return metadata(repo, pin if revision == "main" else revision)
        report = scan(fetch)
        self.assertFalse(report["live"])
        self.assertEqual(report["successfulSources"], 3)
        self.assertEqual(report["errors"], [])
        self.assertEqual(report["materialCandidates"], [])
        self.assertFalse(report["productionPromotion"])

    def test_changed_content_emits_hold_and_revision_independent_dedupe(self):
        def fetch(kind, repo, revision):
            payload = metadata(repo, revision if revision != "main" else "a" * 40)
            if revision == "main":
                payload["siblings"][1]["lfs"]["sha256"] = "5" * 64
            return payload
        first = scan(fetch)
        def later(kind, repo, revision):
            payload = fetch(kind, repo, revision)
            if revision == "main":
                payload["sha"] = "b" * 40
                payload["siblings"][0]["blobId"] = "c" * 40
            return payload
        second = scan(later)
        self.assertEqual(len(first["materialCandidates"]), 3)
        self.assertEqual([c["fingerprint"] for c in first["materialCandidates"]], [c["fingerprint"] for c in second["materialCandidates"]])
        self.assertTrue(all(c["productionDisposition"] == "HOLD" for c in first["materialCandidates"]))

    def test_partial_failure_remains_explicit(self):
        def fetch(kind, repo, revision):
            if repo == MODEL_ID:
                raise OSError("fixture outage")
            pin = next(a[2] for a in ARTIFACTS if a[1] == repo)
            return metadata(repo, pin)
        report = scan(fetch)
        self.assertEqual(report["successfulSources"], 2)
        self.assertEqual(len(report["sourceResults"]), 3)
        self.assertEqual(len(report["errors"]), 1)
        self.assertNotIn("fixture outage", json.dumps(report))

    def test_wrong_pin_is_incomplete_not_clean(self):
        report = scan(lambda kind, repo, rev: metadata(repo, "a" * 40))
        self.assertEqual(report["successfulSources"], 0)
        self.assertEqual(len(report["errors"]), 3)
        self.assertEqual(report["materialCandidates"], [])

    def test_transport_rejects_unapproved_source_and_ref_before_network(self):
        for kind, repo, rev in [("model", "attacker/model", "main"), ("model", MODEL_ID, "../main")]:
            with self.subTest(repo=repo, revision=rev), patch("szl_frontier.edge_lane.build_opener") as opener:
                with self.assertRaises(EdgeError):
                    fetch_metadata(kind, repo, rev)
                opener.assert_not_called()

    def test_transport_rejects_redirect(self):
        with self.assertRaises(EdgeError):
            _NoRedirect().redirect_request(None, None, 302, "", None, "https://example.com")


class ToolContractTests(unittest.TestCase):
    def test_valid_proposal_is_not_execution_or_production_evidence(self):
        record = check_tool_response(response(), "fixture_1")
        self.assertTrue(record["contractPassed"])
        for key in ["runtimeVerified", "sealed", "toolExecuted"]:
            self.assertFalse(record[key])
        self.assertEqual(record["productionDisposition"], "HOLD")
        hash_value = record.pop("recordSha256")
        self.assertEqual(hash_value, digest(record))

    def test_duplicate_arguments_and_nonfinite_json_are_rejected(self):
        for raw in ['{"evidence_id":"wrong","evidence_id":"fixture_1"}', '{"evidence_id":NaN}', '{"evidence_id":Infinity}']:
            with self.subTest(raw=raw):
                payload = response()
                payload["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"] = raw
                with self.assertRaises(EdgeError):
                    check_tool_response(payload, "fixture_1")

    def test_wrong_function_extra_args_and_wrong_value_rejected(self):
        for name, args in [("shell", '{"evidence_id":"fixture_1"}'), ("lookup_evidence", '{"evidence_id":"wrong"}'),
                           ("lookup_evidence", '{"evidence_id":"fixture_1","run":true}')]:
            with self.subTest(name=name, args=args):
                payload = response()
                payload["choices"][0]["message"]["tool_calls"][0]["function"].update(name=name, arguments=args)
                with self.assertRaises(EdgeError):
                    check_tool_response(payload, "fixture_1")

    def test_multiple_calls_and_truncation_rejected(self):
        for mode in ["multiple", "truncated", "wrong_model", "boolean_index"]:
            with self.subTest(mode=mode):
                payload = response()
                if mode == "multiple":
                    payload["choices"][0]["message"]["tool_calls"] *= 2
                elif mode == "truncated":
                    payload["choices"][0]["finish_reason"] = "length"
                elif mode == "wrong_model":
                    payload["model"] = "other/model"
                else:
                    payload["choices"][0]["index"] = False
                with self.assertRaises(EdgeError):
                    check_tool_response(payload, "fixture_1")

    def test_root_duplicate_keys_rejected(self):
        with self.assertRaises(EdgeError):
            strict_json('{"model":"a","model":"b"}')

    def test_failed_cli_replaces_stale_pass_record(self):
        with tempfile.TemporaryDirectory() as folder:
            input_path, output_path = Path(folder) / "input.json", Path(folder) / "output.json"
            input_path.write_text('{"model":"wrong"}')
            output_path.write_text('{"contractPassed":true}')
            result = subprocess.run([sys.executable, "-m", "szl_frontier.edge_lane", "check-tool", "--response", str(input_path),
                                     "--evidence-id", "fixture_1", "--output", str(output_path)], capture_output=True)
            self.assertEqual(result.returncode, 1)
            self.assertFalse(json.loads(output_path.read_text())["contractPassed"])


class PlanTests(unittest.TestCase):
    def test_pins_owners_and_existing_publication_targets(self):
        plan = build_plan()
        self.assertEqual(len(plan["artifacts"]), 3)
        self.assertEqual(plan["authorityChain"], ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"])
        self.assertEqual(plan["serving"]["toolCallParser"], "minicpm5")
        self.assertIsNone(plan["serving"]["qualifiedRuntimeImageDigest"])
        self.assertFalse(plan["serving"]["launchAuthorized"])
        self.assertIsNone(plan["benchmarks"])
        self.assertEqual(plan["publication"]["hfDataset"], "SZLHOLDINGS/szl-frontier-covenant")
        for artifact in plan["artifacts"]:
            self.assertRegex(artifact["revision"], r"^[a-f0-9]{40}$")

    def test_plan_and_admissions_cannot_mutate_each_other(self):
        plan = build_plan()
        plan["artifacts"][0]["owners"].clear()
        self.assertTrue(build_plan()["artifacts"][0]["owners"])
        self.assertTrue(edge_admissions()[0]["targetOrgans"])

    def test_admissions_are_unique_and_hold(self):
        rows = edge_admissions()
        self.assertEqual(len({r["id"] for r in rows}), 3)
        self.assertEqual(len({r["primarySource"] for r in rows}), 3)
        for row in rows:
            self.assertEqual(row["licensePosture"], "review-required")
            self.assertNotIn("baselineFingerprint", row["watch"])
            self.assertTrue(any(g["state"] == "hold" and g["scope"] == "production" for g in row["gates"]))


if __name__ == "__main__":
    unittest.main()
