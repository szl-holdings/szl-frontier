"""Package entry for the portable flotation skill.

The runnable source is docs/skills/flotation-selectivity-before-bench/rank.py
and prior.py so the public skill folder does not depend on this package.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Sequence

from .domain import FrontierError

_RANK = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "skills"
    / "flotation-selectivity-before-bench"
    / "rank.py"
)


def _load():
    spec = importlib.util.spec_from_file_location("szl_flotation_rank", _RANK)
    if spec is None or spec.loader is None:
        raise FrontierError("flotation skill runner is missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_rank = _load()
build_receipt = _rank.build_receipt
selectivity_prior = _rank.selectivity_prior


class FlotationError(FrontierError):
    """Fail-closed flotation input error. No partial rank is emitted."""


def main(argv: Sequence[str] | None = None) -> int:
    try:
        return _rank.main(argv)
    except _rank.FlotationError as exc:
        raise FlotationError(str(exc)) from exc
