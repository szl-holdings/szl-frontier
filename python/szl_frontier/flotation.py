"""Package entry for the portable flotation skill.

Runnable sources live in docs/skills/flotation-selectivity-before-bench/
so the public skill folder does not depend on this package.
"""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
from typing import Sequence

from .domain import FrontierError

_SKILL = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "skills"
    / "flotation-selectivity-before-bench"
)
_RANK = _SKILL / "rank.py"
_PRIOR = _SKILL / "prior.py"


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise FrontierError(f"flotation skill runner missing: {path.name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_rank = _load(_RANK, "szl_flotation_rank")
_prior = _load(_PRIOR, "szl_flotation_prior")
build_receipt = _rank.build_receipt
build_prior_receipt = _prior.build_receipt
prior = _prior.prior


class FlotationError(FrontierError):
    """Fail-closed flotation input error. No partial rank is emitted."""


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="szl-frontier flotation",
        description="MODELED flotation rank or abstaining selectivity prior.",
    )
    parser.add_argument("--table", type=Path, default=None)
    parser.add_argument("--bench", type=Path, default=None)
    parser.add_argument("--score-column", default=None)
    parser.add_argument("--features", type=Path, default=None)
    parser.add_argument("--weights", type=Path, default=None)
    parser.add_argument("--tau", type=float, default=None)
    args = parser.parse_args(argv)
    try:
        if args.features is not None:
            forwarded = ["--features", str(args.features)]
            if args.weights is not None:
                forwarded.extend(["--weights", str(args.weights)])
            if args.tau is not None:
                forwarded.extend(["--tau", str(args.tau)])
            return _prior.main(forwarded)
        if args.table is None:
            raise FlotationError("flotation requires --table or --features")
        forwarded = ["--table", str(args.table)]
        if args.bench is not None:
            forwarded.extend(["--bench", str(args.bench)])
        if args.score_column is not None:
            forwarded.extend(["--score-column", args.score_column])
        return _rank.main(forwarded)
    except (_rank.FlotationError, _prior.PriorError) as exc:
        raise FlotationError(str(exc)) from exc