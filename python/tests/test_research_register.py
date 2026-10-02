"""Offline competitive-research-register tests. Not vendor admission."""
from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

from szl_frontier.cli import run
from szl_frontier.research_register import (
    LOCKED_8,
    REGISTER_PATH,
    RegisterError,
    load_register,
    main,
    validate_register,
)


def _payload() -> dict:
    return load_register()


class ResearchRegisterTests(unittest.TestCase):
    def test_checked_in_register_is_valid(self) -> None:
        payload = _payload()
        self.assertEqual(payload["schema"], "szl.frontier.competitive-research-register.v1")
        self.assertFalse(payload["productionPromotion"])
        self.assertEqual(payload["lambdaUniqueness"], "Conjecture 1")
        self.assertEqual(tuple(payload["lockedFormulaIds"]), LOCKED_8)
        self.assertGreaterEqual(len(payload["entries"]), 8)
        self.assertTrue(REGISTER_PATH.is_file())

    def test_cli_check_exits_zero(self) -> None:
        self.assertEqual(main(["--check"]), 0)
        self.assertEqual(run(["research-register", "--check"]), 0)

    def test_miniembed_nano_cannot_be_a_general_embedder(self) -> None:
        payload = _payload()
        row = next(item for item in payload["entries"] if item["id"] == "miniembed-nano")
        self.assertEqual(row["status"], "TEST_FIXTURE")
        self.assertIn("not a general scientific embedder", row["claim"])
        mutated = copy.deepcopy(payload)
        target = next(item for item in mutated["entries"] if item["id"] == "miniembed-nano")
        target["status"] = "HOLD"
        with self.assertRaises(RegisterError):
            validate_register(mutated)

    def test_clone_palantir_adaptation_is_refused(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["entries"][0]["adaptation"] = "clone Palantir Foundry UI into a11oy"
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_production_promotion_cannot_be_true(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["productionPromotion"] = True
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_locked_formula_ids_stay_the_eight(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["lockedFormulaIds"] = list(LOCKED_8) + ["F23"]
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_lambda_uniqueness_cannot_become_a_theorem(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["lambdaUniqueness"] = "theorem"
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_gpu_qualified_true_is_refused(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["capabilities"][0]["gpuQualified"] = True
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_capability_live_stamp_is_refused(self) -> None:
        payload = copy.deepcopy(_payload())
        payload["capabilities"][0]["promotionStatus"] = "LIVE"
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_flotation_grade_paper_does_not_authorize_recovery(self) -> None:
        payload = _payload()
        row = next(item for item in payload["entries"] if item["id"] == "flotation-pinn-grade-2408-15267")
        self.assertEqual(row["status"], "ABSTRACT_ONLY")
        self.assertIn("Grade is not recovery", row["limitation"])
        cap = next(item for item in payload["capabilities"] if item["id"] == "flotation-modeled-rank")
        self.assertEqual(cap["promotionStatus"], "HOLD")
        self.assertFalse(cap["gpuQualified"])

    def test_native_kernels_stay_distinct_and_hold(self) -> None:
        payload = _payload()
        row = next(item for item in payload["entries"] if item["id"] == "huggingface-native-kernels")
        self.assertEqual(row["status"], "ADAPTED_PATTERN")
        self.assertIn("trust_remote_code", " ".join(row["rejectedAlternatives"]))
        cap = next(item for item in payload["capabilities"] if item["id"] == "szl-kernels-native-vs-model")
        self.assertEqual(cap["promotionStatus"], "HOLD")

    def test_preprint_is_labeled_preprint(self) -> None:
        payload = _payload()
        lotus = next(item for item in payload["entries"] if item["id"] == "lotus-looped-transformers-2606-31779")
        self.assertEqual(lotus["publicationType"], "arxiv-preprint")
        self.assertEqual(lotus["status"], "PREPRINT")
        saunshi = next(item for item in payload["entries"] if item["id"] == "looped-transformers-saunshi-2502-17416")
        self.assertEqual(saunshi["publicationType"], "peer-reviewed")

    def test_unresolved_doi_is_unavailable(self) -> None:
        payload = _payload()
        row = next(item for item in payload["entries"] if item["id"] == "seppur-2026-139086")
        self.assertEqual(row["license"], "UNAVAILABLE")
        self.assertEqual(row["publicationType"], "doi-unresolved")

    def test_duplicate_key_fixture_fails(self) -> None:
        raw = REGISTER_PATH.read_text(encoding="utf-8")
        broken = raw.replace('"authority": "evaluation-only"', '"authority": "evaluation-only", "authority": "live"', 1)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "register.json"
            path.write_text(broken, encoding="utf-8")
            with self.assertRaises(RegisterError):
                load_register(path)

    def test_missing_entry_field_fails_the_original_gap(self) -> None:
        payload = copy.deepcopy(_payload())
        del payload["entries"][0]["validationExperiment"]
        with self.assertRaises(RegisterError):
            validate_register(payload)

    def test_community_science_index_gap_is_pending(self) -> None:
        payload = _payload()
        row = next(item for item in payload["entries"] if item["id"] == "claude-science-workbench")
        self.assertEqual(row["status"], "HOST_QUALIFICATION_PENDING")
        self.assertIn("v0.2.0-rc.1", row["claim"])
        self.assertIn("v0.5.0-rc.1", row["claim"])

    def test_json_roundtrip_sorts_without_nan(self) -> None:
        payload = _payload()
        dumped = json.dumps(payload, sort_keys=True, allow_nan=False)
        self.assertIn("Conjecture 1", dumped)
        self.assertNotIn("NaN", dumped)


if __name__ == "__main__":
    unittest.main()
