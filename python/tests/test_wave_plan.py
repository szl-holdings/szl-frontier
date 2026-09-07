# SPDX-License-Identifier: Apache-2.0
"""Adversarial tests for wave preparation, not model quality or authorization."""
from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from szl_frontier.wave_plan import ORDER, REQUIRED_EVIDENCE, WavePlanError, canonical, compile_plan, load, main


def seal(body):
    body = {k: v for k, v in body.items() if k != "receipt"}
    encoded = canonical(body)
    return {**body, "receipt": {"algorithm": "sha256", "scope": "canonical-json(body-without-receipt)", "canonicalBytes": len(encoded), "digest": hashlib.sha256(encoded).hexdigest()}}


def fixture():
    release = {"id": "candidate", "priority": "P0", "artifacts": ["https://huggingface.co/vendor/model"], "primaryArtifact": "https://huggingface.co/vendor/model", "targetRepos": ["szl-holdings/szl-serve"]}
    wave = {"schema": "szl.frontier.integration-wave.v1", "wave": "test-wave", "sourceOfTruth": "szl-holdings/szl-frontier", "policy": {"defaultEffect": "hold", "automaticProductionPromotion": False, "requiredEvidence": sorted(REQUIRED_EVIDENCE)}, "alignment": {"order": ORDER, "github": {"controlPlane": "szl-holdings/szl-frontier", "consumers": ["szl-holdings/szl-serve"]}}, "releases": [release]}
    model = {"releaseId": "candidate", "role": "primary", "repoId": "vendor/model", "revision": "a" * 40, "license": "mit", "pipelineTag": "image-text-to-text", "private": False, "gated": False, "disabled": False, "baseModel": None}
    pins = seal({"schema": "szl.frontier.upstream-model-pin-set.v1", "authority": "PUBLIC_METADATA_ONLY", "models": [model]})
    return wave, pins


class WavePlanTests(unittest.TestCase):
    def setUp(self):
        self.wave, self.pins = fixture()

    def reject(self, code):
        with self.assertRaisesRegex(WavePlanError, code):
            compile_plan(self.wave, self.pins)

    def test_reproducible_digest_and_hold(self):
        a = compile_plan(self.wave, self.pins)
        self.assertEqual(a, compile_plan(copy.deepcopy(self.wave), copy.deepcopy(self.pins)))
        self.assertEqual(a["planSha256"], hashlib.sha256(canonical({k: v for k, v in a.items() if k != "planSha256"})).hexdigest())
        self.assertEqual(a["productionPromotionCount"], 0)
        self.assertEqual(a["plans"][0]["productionDisposition"], "HOLD")
        self.assertFalse(a["plans"][0]["executionAuthorized"])

    def test_metadata_license_is_not_approval(self):
        row = compile_plan(self.wave, self.pins)["plans"][0]["artifacts"][0]
        self.assertEqual(row["observedLicenseMetadata"], "mit")
        self.assertFalse(row["licenseApproved"])
        self.assertFalse(row["licenseTextVerified"])
        self.assertFalse(row["weightsDownloaded"])

    def test_receipt_tampering_rejected(self):
        self.pins["models"][0]["revision"] = "b" * 40
        self.reject("PIN_DIGEST_MISMATCH")

    def test_receipt_byte_count_checked(self):
        self.pins["receipt"]["canonicalBytes"] += 1
        self.reject("PIN_BYTE_COUNT")

    def test_missing_receipt_rejected(self):
        del self.pins["receipt"]
        self.reject("PIN_RECEIPT_REQUIRED")

    def test_wrong_receipt_scheme_rejected(self):
        self.pins["receipt"]["algorithm"] = "md5"
        self.reject("PIN_RECEIPT_SCHEME")

    def test_automatic_promotion_refused(self):
        self.wave["policy"]["automaticProductionPromotion"] = True
        self.reject("PRODUCTION_AUTHORITY_REFUSED")

    def test_row_promotion_refused(self):
        self.wave["releases"][0]["productionDisposition"] = "PROMOTE"
        self.reject("PRODUCTION_AUTHORITY_REFUSED")

    def test_alignment_order_cannot_be_reversed(self):
        self.wave["alignment"]["order"] = list(reversed(ORDER))
        self.reject("ALIGNMENT_ORDER")

    def test_missing_acceptance_requirement(self):
        self.wave["policy"]["requiredEvidence"] = []
        self.reject("REQUIRED_EVIDENCE_MISSING")

    def test_foreign_ownership_refused(self):
        self.wave["alignment"]["github"]["consumers"] = ["other-org/serve"]
        self.reject("FOREIGN_CONSUMER")

    def test_undeclared_target_refused(self):
        self.wave["releases"][0]["targetRepos"] = ["szl-holdings/undeclared"]
        self.reject("UNDECLARED_OR_DUPLICATE_OWNER")

    def test_duplicate_releases(self):
        self.wave["releases"].append(copy.deepcopy(self.wave["releases"][0]))
        self.reject("DUPLICATE_RELEASE")

    def test_duplicate_pins(self):
        self.pins["models"].append(copy.deepcopy(self.pins["models"][0]))
        self.pins = seal(self.pins)
        self.reject("DUPLICATE_PIN")

    def test_mutable_or_malformed_revision(self):
        for revision in ("main", "a" * 39, "A" * 40, None):
            with self.subTest(revision=revision):
                self.pins["models"][0]["revision"] = revision
                self.pins = seal(self.pins)
                self.reject("IMMUTABLE_REVISION_REQUIRED")

    def test_unavailable_model_does_not_become_execution_plan(self):
        for key in ("private", "gated", "disabled"):
            for value in (True, None, 0, "false"):
                with self.subTest(key=key, value=value):
                    _, self.pins = fixture()
                    self.pins["models"][0][key] = value
                    self.pins = seal(self.pins)
                    self.reject("MODEL_ACCESS_REVIEW_REQUIRED")

    def test_missing_license(self):
        self.pins["models"][0]["license"] = ""
        self.pins = seal(self.pins)
        self.reject("LICENSE_METADATA_REQUIRED")

    def test_primary_must_be_declared(self):
        self.wave["releases"][0]["primaryArtifact"] = "https://huggingface.co/vendor/other"
        self.reject("PRIMARY_NOT_IN_ARTIFACTS")

    def test_duplicate_artifacts(self):
        self.wave["releases"][0]["artifacts"] *= 2
        self.reject("DUPLICATE_ARTIFACT")

    def test_noncanonical_model_urls(self):
        for url in ("http://huggingface.co/vendor/model", "https://huggingface.co.evil.invalid/vendor/model", "https://huggingface.co/vendor/model?revision=main", "https://huggingface.co/vendor/model/", "https://huggingface.co/vendor/%2e%2e", "https://huggingface.co/vendor/model#x"):
            with self.subTest(url=url):
                self.wave["releases"][0]["artifacts"] = [url]
                with self.assertRaises(WavePlanError):
                    compile_plan(self.wave, self.pins)

    def test_base_model_pin_is_required(self):
        self.pins["models"][0]["baseModel"] = ["vendor/base"]
        self.pins = seal(self.pins)
        self.reject("ARTIFACT_PIN_MISSING")

    def test_base_closure_included(self):
        self.pins["models"][0]["baseModel"] = ["vendor/base"]
        self.pins["models"].append({**self.pins["models"][0], "repoId": "vendor/base", "revision": "b" * 40, "role": "base-model", "baseModel": None})
        self.pins = seal(self.pins)
        self.assertEqual(compile_plan(self.wave, self.pins)["artifactCount"], 2)

    def test_cycles_rejected(self):
        self.pins["models"][0]["baseModel"] = ["vendor/base"]
        self.pins["models"].append({**self.pins["models"][0], "repoId": "vendor/base", "role": "base-model", "baseModel": ["vendor/model"]})
        self.pins = seal(self.pins)
        self.reject("CYCLIC_BASE_MODEL")

    def test_extra_pin_cannot_expand_scope(self):
        self.pins["models"].append({**self.pins["models"][0], "repoId": "vendor/unrequested"})
        self.pins = seal(self.pins)
        self.reject("UNDECLARED_PIN_ARTIFACT")

    def test_role_swapping_rejected(self):
        self.pins["models"][0]["role"] = "base-model"
        self.pins = seal(self.pins)
        self.reject("PRIMARY_ROLE_MISMATCH")

    def test_json_duplicate_nonfinite_or_nonobject(self):
        for text in ('{"a":1,"a":2}', '{"a":NaN}', '[]'):
            with tempfile.TemporaryDirectory() as td:
                path = Path(td) / "bad.json"
                path.write_text(text)
                with self.assertRaises(WavePlanError):
                    load(path)

    def test_input_byte_budget(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "large.json"
            path.write_text('{"larger":true}')
            with patch("szl_frontier.wave_plan.MAX_INPUT", 3), self.assertRaisesRegex(WavePlanError, "INPUT_TOO_LARGE"):
                load(path)

    def test_cli_refuses_to_replace_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for name, value in (("wave", self.wave), ("pins", self.pins)):
                (root / name).write_text(json.dumps(value))
            out = root / "output.json"
            out.write_text("preserve")
            with patch("sys.stderr"):
                result = main(["--wave", str(root / "wave"), "--pins", str(root / "pins"), "--output", str(out)])
            self.assertEqual(result, 2)
            self.assertEqual(out.read_text(), "preserve")

    def test_cli_generates_a_plan_not_a_benchmark(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for name, value in (("wave", self.wave), ("pins", self.pins)):
                (root / name).write_text(json.dumps(value))
            out = root / "output.json"
            self.assertEqual(main(["--wave", str(root / "wave"), "--pins", str(root / "pins"), "--output", str(out)]), 0)
            self.assertIsNone(json.loads(out.read_text())["plans"][0]["benchmarkResults"])


if __name__ == "__main__":
    unittest.main()
