"""Abstaining flotation-reagent selectivity prior.

S is a unitless software prior, not recovery, grade, or selectivity percent.
Missing descriptors or unset weights ABSTAIN. |2S-1| below tau ABSTAIN.
This module is portable and has no package import.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

NEEDED = (
    "homo_lumo_gap_eV",
    "dipole_D",
    "surface_charge",
    "pH",
    "collector_mM",
)
DEFAULT_TAU = 0.15
SCHEMA = "szl.frontier.flotation-selectivity-prior.v1"


class PriorError(ValueError):
    """Fail-closed prior input. No recovery number is emitted."""


def _finite(value: Any) -> float | None:
    if value is None or value is False:
        return None
    if isinstance(value, bool):
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
    """Return ABSTAIN or PRIOR_ONLY. recoveryPercent is never set."""

    source = dict(features or {})
    missing = [key for key in NEEDED if _finite(source.get(key)) is None]
    weight_map = dict(weights or {})
    weight_missing = [key for key in NEEDED if _finite(weight_map.get(key)) is None]
    if missing or not weight_map or weight_missing:
        return {
            "state": "ABSTAIN",
            "missing": missing,
            "weightMissing": weight_missing if (weight_map or weight_missing) else list(NEEDED),
            "S": None,
            "S_label": "UNAVAILABLE",
            "not": "flotation recovery",
            "recoveryPercent": None,
        }

    margin = _finite(tau)
    if margin is None or margin < 0:
        raise PriorError("tau must be a finite non-negative number")

    z = sum(float(weight_map[key]) * float(source[key]) for key in NEEDED)
    score = 1.0 / (1.0 + math.exp(-z))
    if abs(2.0 * score - 1.0) < margin:
        return {
            "state": "ABSTAIN",
            "reason": "low margin",
            "S": score,
            "S_label": "SIMULATED",
            "not": "flotation recovery",
            "recoveryPercent": None,
        }
    return {
        "state": "PRIOR_ONLY",
        "S": score,
        "S_label": "SIMULATED",
        "not": "flotation recovery",
        "recoveryPercent": None,
    }


def _load_object(path: Path | None, label: str) -> dict[str, Any] | None:
    if path is None:
        return None
    if not path.is_file():
        raise PriorError(f"{label} missing: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError) as exc:
        raise PriorError(f"{label} unreadable: {exc}") from exc
    if not isinstance(payload, dict):
        raise PriorError(f"{label} must be a JSON object")
    return payload


def build_receipt(
    features_path: Path | None,
    weights_path: Path | None = None,
    tau: float = DEFAULT_TAU,
) -> dict[str, Any]:
    features = _load_object(features_path, "features") if features_path is not None else None
    weights = _load_object(weights_path, "weights") if weights_path is not None else None
    result = prior(features, weights, tau=tau)
    return {
        "schema": SCHEMA,
        "organ": "flotation-selectivity-before-bench",
        "evidenceTier": "SOFTWARE_RECEIPT",
        "selectivity": "MODELED",
        "directive": "DEFER",
        "prior": result,
        "recoveryPercent": None,
        "energyClass": "UNAVAILABLE",
        "ato": False,
        "lambda": "OPEN",
        "trustCeiling": 0.97,
        "note": "unitless software prior; not recovery, grade, or selectivity percent",
        "discourse": "REPORTED topic 412",
        "nexusOrgan": False,
        "mintNexusSpace": False,
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="szl-frontier flotation prior",
        description="Abstaining selectivity prior. Never emits recovery.",
    )
    parser.add_argument("--features", type=Path, required=True)
    parser.add_argument("--weights", type=Path, default=None)
    parser.add_argument("--tau", type=float, default=DEFAULT_TAU)
    args = parser.parse_args(argv)
    try:
        receipt = build_receipt(args.features, args.weights, args.tau)
    except PriorError as exc:
        json.dump(
            {
                "schema": SCHEMA,
                "directive": "DEFER",
                "error": str(exc),
                "recoveryPercent": None,
                "prior": {
                    "state": "ABSTAIN",
                    "S": None,
                    "not": "flotation recovery",
                    "recoveryPercent": None,
                },
            },
            sys.stdout,
            indent=2,
            sort_keys=True,
        )
        sys.stdout.write("\n")
        return 2
    json.dump(receipt, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
