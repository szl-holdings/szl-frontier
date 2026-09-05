"""Category-aware evaluation plans for admitted frontier releases."""

from __future__ import annotations

from .domain import EvaluationPlan, FrontierRelease, MetricRequirement


def _metric(name: str, direction: str, rationale: str, *, required: bool = True) -> MetricRequirement:
    return MetricRequirement(name, direction, rationale, required)


_COMMON_INVARIANTS = (
    "Pin the exact upstream revision, package/container environment, and input fixture hashes.",
    "No evaluation artifact receives production action authority.",
    "Record failures and fallbacks; never silently substitute a different model or runtime.",
    "Keep benchmark data within its admitted license/privacy boundary.",
)

_COMMON_ARTIFACTS = (
    "environment.json",
    "inputs.sha256.json",
    "metrics.json",
    "raw-observations.jsonl",
    "receipt.json",
)


class EvaluationPlanner:
    """Build reproducible experiment contracts from a release category."""

    def plan(self, release: FrontierRelease) -> EvaluationPlan:
        category = release.category
        if "retrieval" in category:
            return self._retrieval(release)
        if "speech-training" in category:
            return self._speech_training(release)
        if "speech-asr" in category:
            return self._speech_asr(release)
        if "post-training" in category:
            return self._post_training(release)
        if "multimodal-deployment" in category:
            return self._multimodal_gateway(release)
        if "kernel" in category or "runtime" in category:
            return self._runtime(release)
        if "world-model" in category:
            return self._world_model(release)
        return self._generic(release)

    def _retrieval(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "retrieval-shadow",
            (
                _metric("nDCG@10", "higher", "Ranking quality on pinned qrels."),
                _metric("Recall@100", "higher", "Candidate coverage before reranking."),
                _metric("p95_query_latency_ms", "lower", "Interactive tail latency."),
                _metric("index_bytes_per_document", "lower", "Storage economics."),
                _metric("encode_docs_per_second", "higher", "Index build throughput."),
            ),
            _COMMON_INVARIANTS + ("Run current SZL retriever on identical fixtures as the control.",),
            _COMMON_ARTIFACTS + ("qrels.json", "rankings.jsonl"),
            (
                "Stop if retrieval quality regresses beyond the admitted tolerance.",
                "Stop if unsupported inputs bypass the known fallback path.",
            ),
        )

    def _speech_training(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "speech-data-sandbox",
            (
                _metric("overlap_coverage", "higher", "Coverage of simultaneous speech."),
                _metric("turn_transition_count", "higher", "Density of realistic handoffs."),
                _metric("median_turn_gap_ms", "observe", "Conversation timing distribution."),
                _metric("barge_in_success_rate", "higher", "Downstream full-duplex behavior after training/eval."),
                _metric("privacy_policy_violations", "zero", "Rights and privacy must remain fail-closed."),
            ),
            _COMMON_INVARIANTS
            + (
                "Use the Hub sample until the full-corpus agreement is explicitly admitted.",
                "Never enable speaker identification or voice-clone objectives from this corpus.",
            ),
            _COMMON_ARTIFACTS + ("dataset-card.snapshot.json", "rights-review.json"),
            (
                "Stop on any license/DUA ambiguity.",
                "Stop on any attempted identity linkage or prohibited redistribution path.",
            ),
        )

    def _speech_asr(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "streaming-asr-shadow",
            (
                _metric("WER", "lower", "Transcription accuracy."),
                _metric("DER", "lower", "Speaker attribution accuracy."),
                _metric("hotword_recall", "higher", "Domain vocabulary handling."),
                _metric("p95_partial_latency_ms", "lower", "Streaming responsiveness."),
            ),
            _COMMON_INVARIANTS + ("Speech output is evidence input, never direct action authority.",),
            _COMMON_ARTIFACTS + ("audio-fixture-index.json",),
            ("Stop if diarization or transcript drift exceeds the admitted error budget.",),
        )

    def _post_training(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "post-training-lab",
            (
                _metric("schema_exact_match", "higher", "Exact contract compliance on held-out schemas."),
                _metric("semantic_task_accuracy", "higher", "Correct content, not merely valid syntax."),
                _metric("invalid_output_rate", "lower", "Downstream parser safety."),
                _metric("general_capability_delta", "bounded", "Detect regressions outside the target skill."),
                _metric("tokens_per_second", "higher", "Serving impact of the tuned checkpoint."),
            ),
            _COMMON_INVARIANTS
            + (
                "Keep train, validation, and held-out schema sets checksum-separated.",
                "Reward functions must not inspect held-out answers.",
            ),
            _COMMON_ARTIFACTS + ("training-config.json", "reward-spec.py.sha256", "checkpoint.sha256"),
            (
                "Stop on held-out regression despite training-score gains.",
                "Stop if reward hacking produces parseable but semantically wrong output.",
            ),
        )

    def _multimodal_gateway(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "external-vlm-bakeoff",
            (
                _metric("ocr_exact_match", "higher", "Small-text/document fidelity."),
                _metric("visual_qa_accuracy", "higher", "Image reasoning quality."),
                _metric("video_temporal_accuracy", "higher", "FPS-sensitive video understanding."),
                _metric("p95_latency_ms", "lower", "End-to-end external-service latency."),
                _metric("provider_variance", "lower", "Detect hidden serving/config differences."),
            ),
            _COMMON_INVARIANTS
            + (
                "Use synthetic or public fixtures only until external-service terms and privacy are admitted.",
                "Record exact model-id, quantization/runtime metadata when exposed.",
            ),
            _COMMON_ARTIFACTS + ("direct-serving-control.json",),
            (
                "Stop if model identity/revision cannot be established.",
                "Stop if sensitive input would leave the admitted boundary.",
            ),
        )

    def _runtime(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "runtime-benchmark",
            (
                _metric("reference_parity", "equal", "Operator/model output correctness."),
                _metric("p50_latency_ms", "lower", "Steady-state speed."),
                _metric("p95_latency_ms", "lower", "Tail behavior."),
                _metric("peak_memory_bytes", "lower", "Resource pressure."),
                _metric("fallback_success_rate", "higher", "Safe degradation."),
            ),
            _COMMON_INVARIANTS,
            _COMMON_ARTIFACTS + ("hardware.json",),
            ("Stop on correctness mismatch or unhandled device/runtime failure.",),
        )

    def _world_model(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "research-isolation",
            (
                _metric("published_task_reproduction", "higher", "Reproduce one bounded upstream task."),
                _metric("depth_error", "lower", "Spatial output fidelity when applicable."),
                _metric("reconstruction_consistency", "higher", "Cross-view consistency."),
            ),
            _COMMON_INVARIANTS + ("No physical-world actuation or targeting authority.",),
            _COMMON_ARTIFACTS + ("research-license-review.json",),
            ("Stop on license ambiguity or failure to reproduce the bounded reference task.",),
        )

    def _generic(self, release: FrontierRelease) -> EvaluationPlan:
        return EvaluationPlan(
            release.id,
            "generic-sandbox",
            (
                _metric("task_quality", "higher", "Primary workload quality against a fixed control."),
                _metric("p95_latency_ms", "lower", "Tail latency."),
                _metric("cost_per_1k_items", "lower", "Operational economics."),
            ),
            _COMMON_INVARIANTS,
            _COMMON_ARTIFACTS,
            ("Stop on provenance, license, correctness, or rollback failure.",),
        )
