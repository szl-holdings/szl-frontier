from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "public" / "frontier" / "glm-5-3-flash-evaluation.v1.json"


def load() -> dict:
    return json.loads(EVIDENCE.read_text(encoding="utf-8"))


class GLMProviderEvidenceTests(unittest.TestCase):
    """Collected by the same unittest discovery command used in required CI."""

    def test_projection_is_bound_to_forge_and_hugging_face(self) -> None:
        value = load()
        self.assertEqual(value["schema"], "szl.frontier.evaluation-evidence-projection.v1")
        github = value["github_source_of_truth"]
        hub = value["hugging_face_projection"]
        self.assertEqual(github["repository"], "szl-holdings/szl-forge")
        self.assertEqual(github["commit"], "225751bcf16372360df9ad04d63cba39fc8bc0ca")
        self.assertEqual(
            github["artifact_sha256"],
            "3966569cc96b5303b58ec81e0837fa87a4c6d4c725f3cb1921c933dad8de7961",
        )
        self.assertEqual(hub["dataset_id"], "SZLHOLDINGS/szl-frontier-evaluation-receipts")
        self.assertEqual(hub["commit"], "f2b30f160a7884149d3ac474d455ef25a35ac038")
        self.assertEqual(
            hub["receipt_sha256"],
            "bdf6a0aac1af5b06f10ad0e7a9ee9d29e43d16b92654887f0c0b34f25071db46",
        )

    def test_projection_carries_measured_bounded_comparison(self) -> None:
        measured = load()["measured_summary"]
        self.assertEqual(measured["truth_label"], "MEASURED")
        self.assertEqual(measured["suite"], "full")
        self.assertEqual(measured["case_count"], 4)
        self.assertEqual(measured["candidate_score_rate"], 0.916667)
        self.assertEqual(measured["baseline_score_rate"], 0.416667)
        self.assertEqual(measured["score_rate_delta"], 0.5)
        self.assertEqual(measured["candidate_schema_valid_rate"], 1.0)
        self.assertEqual(measured["baseline_schema_valid_rate"], 0.5)
        self.assertEqual(measured["mean_latency_ratio"], 0.303195)

    def test_projection_preserves_semantic_fallback_and_zero_authority(self) -> None:
        fallback = load()["fallback"]
        self.assertEqual(fallback["contract"], "szl.frontier.safe-fallback.v1")
        self.assertIs(fallback["provider_failure_measured"], True)
        self.assertIs(fallback["baseline_transport_pass"], True)
        self.assertIs(fallback["baseline_semantic_pass"], False)
        self.assertEqual(fallback["selected_source"], "DETERMINISTIC_SAFETY_GUARD")
        self.assertIs(fallback["semantic_safety_pass"], True)
        self.assertEqual(fallback["production_authority"], "NONE")
        self.assertEqual(
            fallback["selected_output_sha256"],
            "f7a79014e5317b659f7f5f2680f0bd0c6b12a411f2374593c1e0736d25b318c8",
        )

    def test_projection_never_claims_production_promotion(self) -> None:
        value = load()
        self.assertEqual(value["decision"], "EVIDENCE_COMPLETE_REVIEW_REQUIRED")
        self.assertEqual(value["production_disposition"], "HOLD")
        self.assertEqual(value["promotion_effect"], "NONE")
        bounds = set(value["known_bounds"])
        self.assertIn("integrity_receipt_is_unsigned", bounds)
        self.assertIn(
            "provider_execution_weight_revision_not_attested_by_chat_response", bounds
        )
        self.assertTrue(any("long_context" in bound for bound in bounds))
