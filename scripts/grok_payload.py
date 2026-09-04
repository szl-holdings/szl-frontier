#!/usr/bin/env python3
"""Print the Frontier brief for a Grok terminal session.

Usage:
  python3 scripts/grok_payload.py
  python3 scripts/grok_payload.py | grok
  python3 scripts/grok_payload.py --path
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIEF = ROOT / "docs" / "GROK_TERMINAL.md"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Emit the Grok terminal payload")
    parser.add_argument("--path", action="store_true", help="print the markdown path only")
    args = parser.parse_args(argv)

    if not BRIEF.is_file():
        print(f"UNAVAILABLE: {BRIEF}", file=sys.stderr)
        return 2

    if args.path:
        print(BRIEF)
        return 0

    text = BRIEF.read_text(encoding="utf-8")
    sys.stdout.write(text if text.endswith("\n") else text + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
