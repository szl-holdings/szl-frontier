"""Abstaining flotation-reagent selectivity prior.

S is a unitless logistic prior, not recovery. Missing descriptors or unset
weights ABSTAIN. A low |2S-1| margin ABSTAINS. This module has no package
import so the public skill folder stays portable.
"""

from __future__ import annotations

import math
from typing import Any, Mapping

NEEDED = (
    "homo_lumo_gap_eV",
    "dipole_D",
    "surface_charge",
    "pH",
    "collector_mM",
)
DEFAULT_TAU = 0.15
NOT_RECOVERY = "flotation recovery"


def _finite(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def prior(
    features: Mapping[str, Any] | None,
    weights: Mapping[str, Any] | None,
    tau: float = DEFAULT_TAU,
) -> dict[str, Any]:
    """Return ABSTAIN or PRIOR_ONLY. recovery is never emitted."""

    source = features if isinstance(features, Mapping) else {}
    missing = [key for key in NEEDED if _finite(source.get(key)) is None]
    if missing or not weights:
        return {
            "state": "ABSTAIN",
            "reason": "missing descriptor or unset weights",
            "missing": missing,
            "S": None,
            "S_class": "UNAVAILABLE",
            "not": NOT_RECOVERY,
            "tau": tau,
        }
    try:
        parsed_weights = []
        for key in NEEDED:
            weight = _finite(weights.get(key) if isinstance(weights, Mapping) else None)
            feature = _finite(source.get(key))
            if weight is None or feature is None:
                raise ValueError("nonfinite")
            parsed_weights.append(weight * feature)
        z = sum(parsed_weights)
        s = 1.0 / (1.0 + math.exp(-z))
    except (KeyError, TypeError, ValueError):
        return {
            "state": "ABSTAIN",
            "reason": "missing descriptor or unset weights",
            "missing": missing,
            "S": None,
            "S_class": "UNAVAILABLE",
            "not": NOT_RECOVERY,
            "tau": tau,
        }
    if abs(2 * s - 1) < tau:
        return {
            "state": "ABSTAIN",
            "reason": f"|2S-1|<{tau}",
            "missing": [],
            "S": round(s, 6),
            "S_class": "SIMULATED",
            "not": NOT_RECOVERY,
            "tau": tau,
        }
    return {
        "state": "PRIOR_ONLY",
        "reason": "unitless prior; not recovery",
        "missing": [],
        "S": round(s, 6),
        "S_class": "SIMULATED",
        "not": NOT_RECOVERY,
        "tau": tau,
    }
