"""Deterministic materiality and promotion policy.

No model call is permitted in this module.  A release can be discovered with an
LLM elsewhere, but admission and promotion remain explicit, testable arithmetic
plus gate state.
"""

from __future__ import annotations

from dataclasses import dataclass

from .domain import (
    EvaluationDecision,
    FrontierRelease,
    GateScope,
    GateState,
    ProductionDisposition,
)


@dataclass(frozen=True, slots=True)
class MaterialityPolicy:
    threshold: int = 70

    def __post_init__(self) -> None:
        if not 0 <= self.threshold <= 100:
            raise ValueError("threshold must be in the range 0..100")

    def score(self, release: FrontierRelease) -> int:
        signals = release.signals
        raw = (
            signals.impact
            + signals.estate_fit
            + signals.evidence_quality
            + signals.integration_readiness
            - signals.risk_penalty
        )
        return max(0, min(100, raw))

    def evaluation_decision(self, release: FrontierRelease) -> EvaluationDecision:
        score = self.score(release)
        if score < self.threshold:
            return EvaluationDecision.IGNORE
        if release.posture == "EVALUATE_NOW":
            return EvaluationDecision.EVALUATE
        if release.posture == "BENCHMARK_FIRST":
            return EvaluationDecision.BENCHMARK
        if release.posture == "SANDBOX_ONLY":
            return EvaluationDecision.SANDBOX
        if release.posture == "ARCHITECTURE_WATCH":
            return EvaluationDecision.WATCH
        return EvaluationDecision.IGNORE

    def production_blockers(self, release: FrontierRelease) -> tuple[str, ...]:
        blockers: list[str] = []
        if self.score(release) < self.threshold:
            blockers.append(f"materiality score below {self.threshold}")
        if release.maturity != "released":
            blockers.append(f"maturity is {release.maturity!r}")
        if release.license_posture not in {"clear"}:
            blockers.append(f"license posture is {release.license_posture!r}")
        for gate in release.gates:
            if gate.scope is GateScope.PRODUCTION and gate.state is not GateState.PASS:
                blockers.append(f"gate {gate.id} is {gate.state.value}")
        return tuple(blockers)

    def production_disposition(
        self, release: FrontierRelease
    ) -> ProductionDisposition:
        return (
            ProductionDisposition.PROMOTE
            if not self.production_blockers(release)
            else ProductionDisposition.HOLD
        )
