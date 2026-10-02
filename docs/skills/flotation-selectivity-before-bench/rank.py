"""MODELED flotation rank. Abstains without a bench CSV.

Repo entry point. The implementation is szl_frontier.flotation.
"""

from __future__ import annotations

import sys
from pathlib import Path

_PYTHON = Path(__file__).resolve().parents[3] / "python"
if str(_PYTHON) not in sys.path:
    sys.path.insert(0, str(_PYTHON))

from szl_frontier.flotation import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
