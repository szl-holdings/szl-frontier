"""Deprecated compatibility API for Memory Covenant software rules.

The public module name predates the MC-R namespace repair.  Keep imports and
field shapes working for the 0.5.x transition without representing these
DECLARED software rules as Doctrine v11 formulas.
"""

from __future__ import annotations

import warnings
from pathlib import Path

from .covenant_rule_evidence import (
    INJECTION,
    RECALL_PURPOSES,
    REQUIRED_COVENANT_RULE_IDS,
    SENSITIVITY_RANK,
    WRITE_PURPOSES,
    recall_evidence,
    write_evidence,
)
from .covenant_rule_evidence import load_covenant_rules as _load_covenant_rules

REQUIRED_FORMULA_IDS = REQUIRED_COVENANT_RULE_IDS
_FORMULAS_PATH = Path(__file__).resolve().parents[2] / "hf" / "dataset" / "formulas.jsonl"


def load_formulas(path: Path | None = None) -> list[dict[str, str]]:
    """Return DECLARED MC-R rules through the deprecated 0.5.x entry point."""

    warnings.warn(
        "formula_evidence.load_formulas() is deprecated; use "
        "covenant_rule_evidence.load_covenant_rules()",
        DeprecationWarning,
        stacklevel=2,
    )
    return [
        {**row, "maturity": "DECLARED"}
        for row in _load_covenant_rules(path or _FORMULAS_PATH)
    ]


__all__ = [
    "INJECTION",
    "RECALL_PURPOSES",
    "REQUIRED_FORMULA_IDS",
    "SENSITIVITY_RANK",
    "WRITE_PURPOSES",
    "load_formulas",
    "recall_evidence",
    "write_evidence",
]
