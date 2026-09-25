#!/usr/bin/env python3
"""Best-effort previous classified-watch ledger. Genesis is allowed.

Unlike the estate outside-seat chain, a missing prior watch artifact is
FIRST_OBSERVATION, not a fail-closed error. Production stays HOLD.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

DEFAULT_OUT = Path("work/frontier-watch-previous/watch-classified-ledger.v1.json")
WORKFLOW = "Hugging Face frontier watch"
REPO = os.environ.get("GITHUB_REPOSITORY", "szl-holdings/szl-frontier")


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT)
    out.parent.mkdir(parents=True, exist_ok=True)
    seed = Path("frontier/watch-classified-ledger.v1.json")
    if seed.is_file():
        out.write_text(seed.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        out.write_text(
            json.dumps(
                {
                    "schema": "szl.frontier.watch-classified-ledger.v1",
                    "productionPromotion": False,
                    "assets": {},
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    if not os.environ.get("GITHUB_TOKEN"):
        print("no GITHUB_TOKEN; using committed classified ledger seed")
        return 0

    listing = subprocess.run(
        [
            "gh",
            "run",
            "list",
            "--repo",
            REPO,
            "--workflow",
            WORKFLOW,
            "--branch",
            "main",
            "--status",
            "success",
            "--limit",
            "5",
            "--json",
            "databaseId,conclusion,headBranch",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if listing.returncode != 0 or not listing.stdout.strip():
        print("no prior successful watch run; genesis ledger in effect")
        return 0
    try:
        runs = json.loads(listing.stdout)
    except json.JSONDecodeError:
        print("unreadable prior run list; genesis ledger in effect")
        return 0
    if not runs:
        print("empty prior run list; genesis ledger in effect")
        return 0

    run_id = runs[0]["databaseId"]
    dest = out.parent / "artifact"
    dest.mkdir(parents=True, exist_ok=True)
    download = subprocess.run(
        [
            "gh",
            "run",
            "download",
            str(run_id),
            "--repo",
            REPO,
            "--dir",
            str(dest),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if download.returncode != 0:
        print(f"prior artifact unavailable for run {run_id}; committed seed stands")
        return 0

    candidates = list(dest.rglob("watch-classified-ledger.v1.json"))
    if not candidates:
        print(f"prior run {run_id} had no classified ledger file; committed seed stands")
        return 0
    payload = json.loads(candidates[0].read_text(encoding="utf-8"))
    if payload.get("schema") != "szl.frontier.watch-classified-ledger.v1":
        print("prior ledger schema mismatch; committed seed stands")
        return 0
    if payload.get("productionPromotion") is True:
        print("prior ledger claimed production; refusing to inherit it")
        return 0
    out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"inherited classified ledger from watch run {run_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
