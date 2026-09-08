from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "public" / "frontier" / "glm-5-3-flash-evaluation.v1.json"
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
EXPECTED_FORGE_COMMIT = "225751bcf16372360df9ad04d63cba39fc8bc0ca"
EXPECTED_ARTIFACT_SHA256 = (
    "3966569cc96b5303b58ec81e0837fa87a4c6d4c725f3cb1921c933dad8de7961"
)
EXPECTED_HUB_COMMIT = "f2b30f160a7884149d3ac474d455ef25a35ac038"
EXPECTED_RECEIPT_SHA256 = (
    "bdf6a0aac1af5b06f10ad0e7a9ee9d29e43d16b92654887f0c0b34f25071db46"
)
EXPECTED_FALLBACK_OUTPUT_SHA256 = (
    "f7a79014e5317b659f7f5f2680f0bd0c6b12a411f2374593c1e0736d25b318c8"
)


def load() -> dict:
    return json.loads(EVIDENCE.read_text(encoding="utf-8"))


def test_projection_is_bound_to_exact_forge_and_hugging_face_evidence() -> None:
    value = load()
    assert value["schema"] == "szl.frontier.evaluation-evidence-projection.v1"
    github = value["github_source_of_truth"]
    hub = value["hugging_face_projection"]
    assert github["repository"] == "szl-holdings/szl-forge"
    assert github["commit"] == EXPECTED_FORGE_COMMIT
    assert github["artifact_sha256"] == EXPECTED_ARTIFACT_SHA256
    assert HEX40.fullmatch(github["commit"])
    assert HEX64.fullmatch(github["artifact_sha256"])
    assert hub["dataset_id"] == "SZLHOLDINGS/szl-frontier-evaluation-receipts"
    assert hub["commit"] == EXPECTED_HUB_COMMIT
    assert hub["receipt_sha256"] == EXPECTED_RECEIPT_SHA256
    assert HEX40.fullmatch(hub["commit"])
    assert HEX64.fullmatch(hub["receipt_sha256"])


def test_projection_carries_measured_bounded_comparison() -> None:
    value = load()
    measured = value["measured_summary"]
    assert measured["truth_label"] == "MEASURED"
    assert measured["suite"] == "full"
    assert measured["case_count"] == 4
    assert measured["candidate_score_rate"] == 0.916667
    assert measured["baseline_score_rate"] == 0.416667
    assert measured["score_rate_delta"] == 0.5
    assert measured["candidate_schema_valid_rate"] == 1.0
    assert measured["baseline_schema_valid_rate"] == 0.5
    assert measured["mean_latency_ratio"] == 0.303195


def test_projection_preserves_exact_semantic_fallback_and_zero_authority() -> None:
    fallback = load()["fallback"]
    assert fallback["contract"] == "szl.frontier.safe-fallback.v1"
    assert fallback["provider_failure_measured"] is True
    assert fallback["baseline_transport_pass"] is True
    assert fallback["baseline_semantic_pass"] is False
    assert fallback["selected_source"] == "DETERMINISTIC_SAFETY_GUARD"
    assert fallback["selected_output_sha256"] == EXPECTED_FALLBACK_OUTPUT_SHA256
    assert fallback["semantic_safety_pass"] is True
    assert fallback["production_authority"] == "NONE"
    assert HEX64.fullmatch(fallback["selected_output_sha256"])


def test_projection_never_claims_production_promotion() -> None:
    value = load()
    assert value["decision"] == "EVIDENCE_COMPLETE_REVIEW_REQUIRED"
    assert value["production_disposition"] == "HOLD"
    assert value["promotion_effect"] == "NONE"
    bounds = set(value["known_bounds"])
    assert "integrity_receipt_is_unsigned" in bounds
    assert (
        "provider_execution_weight_revision_not_attested_by_chat_response"
        in bounds
    )
    assert any("long_context" in bound for bound in bounds)
