#!/usr/bin/env python3
"""Publish SZL Frontier to Hugging Face: public Space + covenant dataset."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

from huggingface_hub import HfApi

SPACE_ID = "SZLHOLDINGS/szl-frontier"
DATASET_ID = "SZLHOLDINGS/szl-frontier-covenant"
SOURCE_REPOSITORY = "szl-holdings/szl-frontier"
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


def exact_source_revision(root: Path) -> str:
    candidate = str(os.environ.get("GITHUB_SHA") or "").strip().lower()
    if not re.fullmatch(r"[0-9a-f]{40}", candidate):
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            text=True,
            capture_output=True,
            check=True,
        )
        candidate = result.stdout.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{40}", candidate):
        raise RuntimeError("publication requires an exact 40-character source revision")
    return candidate


def write_source_identity(root: Path, source_sha: str) -> Path:
    path = root / "public" / "deployment.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "schema": "szl.runtime-source/v1",
                "source_repository": SOURCE_REPOSITORY,
                "source_revision": source_sha,
                "surface": SPACE_ID,
                "authority": "protected-github-source",
            },
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    return path


def main() -> int:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HF_ORG_TOKEN")
    if not token:
        print("HF_TOKEN/HF_ORG_TOKEN absent. Hub mutation blocked.", file=sys.stderr)
        return 1

    root = Path(os.environ.get("GITHUB_WORKSPACE") or ".").resolve()
    source_sha = exact_source_revision(root)
    identity_path = write_source_identity(root, source_sha)
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
        commit_message=f"deploy: exact Frontier source {source_sha[:12]}",
        ignore_patterns=IGNORE,
    )
    print(
        json.dumps(
            {
                "uploaded": SPACE_ID,
                "source_repository": SOURCE_REPOSITORY,
                "source_revision": source_sha,
                "identity_path": str(identity_path.relative_to(root)),
            },
            sort_keys=True,
        )
    )

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
            commit_message=f"Covenant source-bound to {source_sha[:12]}",
        )
        print(f"uploaded {DATASET_ID}")
    else:
        print(json.dumps({"dataset": "missing", "path": str(dataset_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
