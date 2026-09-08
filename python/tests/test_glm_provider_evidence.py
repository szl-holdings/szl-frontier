from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "public" / "frontier" / "glm-5-3-flash-evaluation.v1.json"
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")


def load() -> dict:
    return json.loads(EVIDENCE.read_text(encoding="utf-8"))


def test_projection_is_bound_to_forge_and_hugging_face() -> None:
    value = load()
    assert value["schema"] == "szl.frontier.evaluation-evidence-projection.v1"
    github = value["github_source_of_truth"]
    hub = value["hugging_face_projection"]
    assert github["repository"] == "szl-holdings/szl-forge"
    assert github["commit"] == "225751bcf16372360df9ad04d63cba39fc8bc0ca"
    assert HEX40.fullmatch(github["commit"])
    assert HEX64.fullmatch(github["artifact_sha256"])
    assert hub["dataset_id"] == "SZLHOLDINGS/szl-frontier-evaluation-receipts"
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
    assert 0 < measured["mean_latency_ratio"] < 1


def test_projection_preserves_semantic_fallback_and_zero_authority() -> None:
    fallback = load()["fallback"]
    assert fallback["contract"] == "szl.frontier.safe-fallback.v1"
    assert fallback["provider_failure_measured"] is True
    assert fallback["baseline_transport_pass"] is True
    assert fallback["baseline_semantic_pass"] is False
    assert fallback["selected_source"] == "DETERMINISTIC_SAFETY_GUARD"
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
