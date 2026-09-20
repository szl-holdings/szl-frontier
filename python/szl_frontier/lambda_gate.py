# SPDX-License-Identifier: Apache-2.0
"""SOFTWARE Λ aggregator. Never a theorem. Never trusts a stored score.

Weighted geometric mean is the only aggregator that can ALLOW. Arithmetic mean
is computed as a counterfactual witness and cannot act. Λ uniqueness remains
Conjecture 1.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence

from .domain import FrontierError

EVIDENCE_STATES = (
    "MEASURED",
    "BLOCKED",
    "INVALID",
    "FAILED",
    "UNAVAILABLE",
    "STALE",
)
VERDICTS = ("HARD_DENY", "DENY_DEFAULT", "LAMBDA_VETO", "ESCALATE", "ALLOW")
LAMBDA_POSTURE = "CONJECTURE_1"
DEFAULT_THRESHOLD = 0.7


class GateError(FrontierError):
    """Raised when axis evidence cannot be aggregated fail-closed."""


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@dataclass(frozen=True, slots=True)
class AxisEvidence:
    name: str
    value: float | None
    status: str
    required: bool = True
    weight: float = 1.0
    source_ref: str | None = None
    observed_at: str | None = None
    expiry_at: str | None = None
    note: str | None = None

    def __post_init__(self) -> None:
        if not self.name:
            raise GateError("axis requires a name")
        if self.status not in EVIDENCE_STATES:
            raise GateError(f"unknown evidence status: {self.status}")
        if not math.isfinite(self.weight) or self.weight <= 0:
            raise GateError(f"axis {self.name} weight must be finite and positive")

    def is_valid(self, now: datetime | None = None) -> bool:
        if self.status != "MEASURED":
            return False
        if self.value is None or not math.isfinite(self.value):
            return False
        if not 0.0 <= self.value <= 1.0:
            return False
        if self.expiry_at:
            try:
                expiry = _parse_iso(self.expiry_at)
            except ValueError:
                return False
            clock = now or datetime.now(timezone.utc)
            if clock.tzinfo is None:
                clock = clock.replace(tzinfo=timezone.utc)
            if expiry <= clock:
                return False
        return True

    def as_mapping(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "status": self.status,
            "required": self.required,
            "weight": self.weight,
            "sourceRef": self.source_ref,
            "observedAt": self.observed_at,
            "expiryAt": self.expiry_at,
            "note": self.note,
        }

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "AxisEvidence":
        raw = value.get("value")
        if raw is None:
            coerced: float | None = None
        else:
            coerced = float(raw)
            if not math.isfinite(coerced):
                raise GateError("axis value must be finite or null")
        return cls(
            name=str(value["name"]),
            value=coerced,
            status=str(value["status"]),
            required=bool(value.get("required", True)),
            weight=float(value.get("weight", 1.0)),
            source_ref=value.get("sourceRef"),
            observed_at=value.get("observedAt"),
            expiry_at=value.get("expiryAt"),
            note=value.get("note"),
        )


@dataclass(frozen=True, slots=True)
class GateResult:
    verdict: str
    lambda_score: float | None
    arithmetic_score: float | None
    threshold: float
    reason_codes: tuple[str, ...]
    state: str
    gaps: tuple[str, ...]
    arithmetic_would_allow: bool
    divergent: bool

    def __post_init__(self) -> None:
        if self.verdict not in VERDICTS:
            raise GateError(f"unknown verdict: {self.verdict}")

    def as_mapping(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "lambdaScore": self.lambda_score,
            "arithmeticScore": self.arithmetic_score,
            "threshold": self.threshold,
            "reasonCodes": list(self.reason_codes),
            "state": self.state,
            "gaps": list(self.gaps),
            "arithmeticWouldAllow": self.arithmetic_would_allow,
            "divergent": self.divergent,
            "lambda": LAMBDA_POSTURE,
            "lambdaNeverATheorem": True,
            "shadowExecutable": False,
        }


def weighted_geometric_mean(
    values: Sequence[float], weights: Sequence[float]
) -> float:
    """Weighted geometric mean. Any non-positive input is a zero veto.

    G(x,w) = exp(sum w_i log x_i / sum w_i) for x_i > 0, w_i > 0.
    This is homogeneous of degree 1: G(c x) = c G(x) for c > 0.
    """

    if len(values) == 0 or len(values) != len(weights):
        raise GateError("geometric mean requires matching non-empty values and weights")
    if any(not math.isfinite(v) for v in values):
        raise GateError("geometric mean rejects non-finite values")
    if any(v < 0 for v in values):
        raise GateError("geometric mean rejects negative values")
    if any(not math.isfinite(w) or w <= 0 for w in weights):
        raise GateError("geometric mean requires finite positive weights")
    if any(v == 0 for v in values):
        return 0.0
    total = sum(weights)
    log_sum = sum(w * math.log(v) for v, w in zip(values, weights))
    return math.exp(log_sum / total)


def weighted_arithmetic_mean(
    values: Sequence[float], weights: Sequence[float]
) -> float:
    if len(values) == 0 or len(values) != len(weights):
        raise GateError("arithmetic mean requires matching non-empty values and weights")
    if any(not math.isfinite(v) for v in values) or any(
        not math.isfinite(w) or w <= 0 for w in weights
    ):
        raise GateError("arithmetic mean requires finite values and positive weights")
    total = sum(weights)
    return sum(v * w for v, w in zip(values, weights)) / total


def _classify_gap(axis: AxisEvidence, now: datetime | None) -> str:
    if axis.value is None or (
        isinstance(axis.value, float)
        and (not math.isfinite(axis.value) or axis.value < 0 or axis.value > 1)
    ):
        if axis.status == "MEASURED" and axis.value is not None:
            return f"INVALID_AXIS:{axis.name}"
        return f"MISSING_AXIS:{axis.name}"
    if axis.expiry_at:
        try:
            expiry = _parse_iso(axis.expiry_at)
        except ValueError:
            return f"INVALID_AXIS:{axis.name}"
        clock = now or datetime.now(timezone.utc)
        if clock.tzinfo is None:
            clock = clock.replace(tzinfo=timezone.utc)
        if expiry <= clock:
            return f"STALE_AXIS:{axis.name}"
    if axis.status != "MEASURED":
        return f"MISSING_AXIS:{axis.name}"
    return f"INVALID_AXIS:{axis.name}"


def evaluate_lambda_gate(
    axes: Sequence[AxisEvidence],
    *,
    threshold: float = DEFAULT_THRESHOLD,
    now: datetime | None = None,
) -> GateResult:
    """Fail-closed gate. Stored scores are irrelevant; only axes are inputs."""

    if not math.isfinite(threshold) or not 0.0 < threshold <= 1.0:
        raise GateError("threshold must be in (0, 1]")
    required = [axis for axis in axes if axis.required]
    if not required:
        raise GateError("at least one required axis is required")

    reason_codes: list[str] = []
    gaps: list[str] = []
    for axis in required:
        if not axis.is_valid(now):
            code = _classify_gap(axis, now)
            reason_codes.append(code)
            gaps.append(axis.name)

    if reason_codes:
        hard = any(
            code.startswith("INVALID_AXIS:") or code.startswith("MISSING_AXIS:")
            for code in reason_codes
        )
        return GateResult(
            verdict="HARD_DENY" if hard else "DENY_DEFAULT",
            lambda_score=None,
            arithmetic_score=None,
            threshold=threshold,
            reason_codes=tuple(reason_codes),
            state="BLOCKED",
            gaps=tuple(gaps),
            arithmetic_would_allow=False,
            divergent=False,
        )

    values = [axis.value for axis in required]
    assert all(isinstance(value, float) for value in values)
    typed_values = [float(value) for value in values]
    weights = [axis.weight for axis in required]
    lam = weighted_geometric_mean(typed_values, weights)
    ari = weighted_arithmetic_mean(typed_values, weights)
    arithmetic_would_allow = ari >= threshold
    if lam == 0.0:
        verdict = "LAMBDA_VETO"
    elif lam >= threshold:
        verdict = "ALLOW"
    else:
        verdict = "ESCALATE"
    return GateResult(
        verdict=verdict,
        lambda_score=lam,
        arithmetic_score=ari,
        threshold=threshold,
        reason_codes=(),
        state="MEASURED",
        gaps=(),
        arithmetic_would_allow=arithmetic_would_allow,
        divergent=arithmetic_would_allow != (verdict == "ALLOW"),
    )


def scores_match(declared: float | None, recomputed: float | None) -> bool:
    if declared is None and recomputed is None:
        return True
    if declared is None or recomputed is None:
        return False
    if not math.isfinite(declared) or not math.isfinite(recomputed):
        return False
    return math.isclose(declared, recomputed, rel_tol=0.0, abs_tol=1e-12)
