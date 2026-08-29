#!/usr/bin/env python3
"""Publish SZL Frontier to Hugging Face: public Space + covenant dataset."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from huggingface_hub import HfApi

SPACE_ID = "SZLHOLDINGS/szl-frontier"
DATASET_ID = "SZLHOLDINGS/szl-frontier-covenant"
IGNORE = [
    ".git",
    ".github",
    "node_modules",
    "artifacts",
    "screenshots",
    "attachments",
    ".grok",
    "AGENTS.md",
    "dist",
    ".output",
    ".vercel",
    ".tanstack",
    ".nitro",
]


def main() -> int:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HF_ORG_TOKEN")
    if not token:
        print("HF_TOKEN/HF_ORG_TOKEN absent. Hub mutation blocked.", file=sys.stderr)
        return 1

    root = Path(os.environ.get("GITHUB_WORKSPACE") or ".").resolve()
    api = HfApi(token=token)

    space = api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        private=False,
        space_sdk="docker",
        exist_ok=True,
    )
    print(f"space {SPACE_ID} url={getattr(space, 'url', space)}")
    try:
        api.update_repo_visibility(repo_id=SPACE_ID, repo_type="space", private=False)
    except Exception as exc:  # noqa: BLE001
        print(f"space visibility skipped: {exc}")

    api.upload_folder(
        repo_id=SPACE_ID,
        repo_type="space",
        folder_path=str(root),
        commit_message="SZL Frontier v0.3 green — Memory Covenant source",
        ignore_patterns=IGNORE,
    )
    print(f"uploaded {SPACE_ID}")

    api.create_repo(
        repo_id=DATASET_ID,
        repo_type="dataset",
        private=False,
        exist_ok=True,
    )
    dataset_dir = root / "hf" / "dataset"
    if dataset_dir.exists():
        api.upload_folder(
            repo_id=DATASET_ID,
            repo_type="dataset",
            folder_path=str(dataset_dir),
            commit_message="Covenant v0.3 gates, formulas, honest posture",
        )
        print(f"uploaded {DATASET_ID}")
    else:
        print(json.dumps({"dataset": "missing", "path": str(dataset_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
