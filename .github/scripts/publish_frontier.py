#!/usr/bin/env python3
"""Publish SZL Frontier to Hugging Face: public Space + covenant dataset.

One Hub asset per invocation (``--target space`` or ``--target dataset``), so
each workflow job holds exactly one per-asset write lock
(``hf-write/<type>/SZLHOLDINGS/<id>``). Every write fails closed:

* the target repo must already exist (creating a Hub repo, or changing its
  visibility, is an owner decision, never a side effect of a deploy);
* each asset is an exact mirror of its declared publish set: files the source
  no longer publishes are deleted in the same commit (``.gitattributes`` is
  Hub-managed and always kept);
* after the upload the Hub head is read back and must equal the commit this
  run created (``hub_oid == created_oid``), and the file list at that commit
  must equal the publish set;
* for the Space, the runtime must then report RUNNING on that exact commit and
  the live app must answer ``/healthz`` and serve ``/deployment.json`` naming
  this repository and the exact source revision.

A receipt is written for every attempt, including failed ones.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

SPACE_ID = "SZLHOLDINGS/szl-frontier"
DATASET_ID = "SZLHOLDINGS/szl-frontier-covenant"
SOURCE_REPOSITORY = "szl-holdings/szl-frontier"
SPACE_ORIGIN = "https://szlholdings-szl-frontier.hf.space"
HF_API = "https://huggingface.co/api"
RECEIPT_SCHEMA = "szl.hf-write-receipt/v1"
TERMINAL_RUNTIME_STAGES = frozenset({"BUILD_ERROR", "CONFIG_ERROR", "RUNTIME_ERROR"})
TARGETS = {
    "space": {"repo_id": SPACE_ID, "repo_type": "space"},
    "dataset": {"repo_id": DATASET_ID, "repo_type": "dataset"},
}
# Paths the Space never receives. huggingface_hub matches ignore and delete
# patterns with fnmatch against repo-relative paths, so a bare directory name
# ("dist") matches only a file literally named "dist": each directory needs its
# "<dir>/*" form. The bare names this list used to hold published .github/ and
# the __pycache__ written by the ouroboros seal to the Space.
EXCLUDED_DIRS = (
    ".github",
    "node_modules",
    "artifacts",
    "screenshots",
    "attachments",
    ".grok",
    "dist",
    ".output",
    ".vercel",
    ".tanstack",
    ".nitro",
)
SPACE_EXCLUDE = (
    *(f"{name}/*" for name in EXCLUDED_DIRS),
    "AGENTS.md",
    "__pycache__/*",
    "*/__pycache__/*",
    "*.pyc",
)
# Every remote file outside the publish set is deleted in the same commit.
MIRROR_DELETE = ("*",)
HUB_MANAGED = frozenset({".gitattributes"})


class PublishError(RuntimeError):
    """The write, or its post-write verification, did not hold. Fail closed."""


def lock_group(repo_type: str, repo_id: str) -> str:
    """Canonical per-asset lock key; the workflow's concurrency groups use it."""
    return f"hf-write/{repo_type}/{repo_id}"


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


def write_ouroboros_cycle(root: Path) -> Path:
    """Replace the source seed with the exact-checkout SOFTWARE cycle receipt."""

    python_root = root / "python"
    if str(python_root) not in sys.path:
        sys.path.insert(0, str(python_root))
    # The workspace is the Space upload: importing must not leave __pycache__ in it.
    sys.dont_write_bytecode = True
    from szl_frontier.ouroboros import run_cycle

    report = run_cycle(catalog_ok=True, live=False, root=root)
    path = root / "public" / "frontier" / "ouroboros-cycle.v1.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return path


def require_existing_repo(api: Any, repo_id: str, repo_type: str) -> str:
    """Return the current Hub head of an existing repo, or fail closed."""

    if not api.repo_exists(repo_id=repo_id, repo_type=repo_type):
        raise PublishError(
            f"target repo absent: {repo_type}/{repo_id}. Creating it is an owner decision."
        )
    head = str(getattr(api.repo_info(repo_id=repo_id, repo_type=repo_type), "sha", "") or "")
    if not re.fullmatch(r"[0-9a-f]{40}", head):
        raise PublishError(f"{repo_type}/{repo_id} reported no exact head sha: {head!r}")
    return head


def read_back_head(api: Any, repo_id: str, repo_type: str, created_oid: str) -> str:
    """D4 readback: the Hub head must be the commit this run created."""

    hub_oid = str(getattr(api.repo_info(repo_id=repo_id, repo_type=repo_type), "sha", "") or "")
    if hub_oid != created_oid:
        raise PublishError(
            f"{repo_type}/{repo_id} head {hub_oid!r} is not the created commit {created_oid!r}"
        )
    return hub_oid


def publish_set(
    folder: Path,
    ignore_patterns: Iterable[str],
    filter_objects: Callable[..., Iterable[str]],
) -> set[str]:
    """Repo-relative paths ``upload_folder`` sends from ``folder``.

    ``filter_objects`` is ``huggingface_hub.utils.filter_repo_objects`` at run
    time, so the expected tree uses the exact walk and matcher of the upload.
    """

    relpaths = sorted(p.relative_to(folder).as_posix() for p in folder.glob("**/*") if p.is_file())
    return set(filter_objects(relpaths, ignore_patterns=list(ignore_patterns)))


def read_back_tree(
    api: Any, repo_id: str, repo_type: str, created_oid: str, expected: set[str]
) -> dict[str, Any]:
    """The file list at the created commit must be exactly the publish set."""

    hub = set(api.list_repo_files(repo_id=repo_id, repo_type=repo_type, revision=created_oid))
    extra = sorted(hub - expected - HUB_MANAGED)
    missing = sorted(expected - hub)
    if extra or missing:
        raise PublishError(
            f"{repo_type}/{repo_id}@{created_oid} tree differs from the publish set: "
            f"extra={extra[:20]} missing={missing[:20]}"
        )
    return {"files": len(hub), "published": len(expected), "hub_managed": sorted(hub & HUB_MANAGED)}


def _get(url: str, timeout: float = 20.0) -> tuple[int, bytes]:
    request = urllib.request.Request(
        url,
        headers={"Cache-Control": "no-cache", "User-Agent": "SZL-Frontier-source-proof/2"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return int(response.status), response.read()
    except urllib.error.HTTPError as exc:
        return int(exc.code), exc.read() if exc.fp else b""


def attest_space_runtime(
    created_oid: str,
    source_sha: str,
    *,
    timeout_s: float = 1200.0,
    interval_s: float = 15.0,
    get: Callable[[str], tuple[int, bytes]] = _get,
    sleep: Callable[[float], None] = time.sleep,
    monotonic: Callable[[], float] = time.monotonic,
) -> dict[str, Any]:
    """Wait for RUNNING on the exact created commit, then prove the live app.

    Uses only public, unauthenticated GETs, so anyone can repeat the check.
    """

    deadline = monotonic() + timeout_s
    while True:
        try:
            status, body = get(f"{HF_API}/spaces/{SPACE_ID}")
            if status != 200:
                raise ValueError(f"Space API HTTP {status}")
            info = json.loads(body.decode("utf-8"))
            runtime = info.get("runtime") or {}
            stage = runtime.get("stage")
            running_sha = runtime.get("sha") or info.get("sha")
            if running_sha == created_oid and stage in TERMINAL_RUNTIME_STAGES:
                raise PublishError(f"{SPACE_ID}@{created_oid} entered {stage}")
            if stage == "RUNNING" and running_sha == created_oid:
                health_status, health_body = get(f"{SPACE_ORIGIN}/healthz")
                health = json.loads(health_body.decode("utf-8")) if health_status == 200 else {}
                ident_status, ident_body = get(f"{SPACE_ORIGIN}/deployment.json")
                ident = json.loads(ident_body.decode("utf-8")) if ident_status == 200 else {}
                if (
                    health.get("ok") is True
                    and ident.get("source_repository") == SOURCE_REPOSITORY
                    and ident.get("source_revision") == source_sha
                ):
                    return {
                        "stage": stage,
                        "running_sha": running_sha,
                        "healthz": {"status": health_status, "schema": health.get("schema")},
                        "deployment": ident,
                    }
                last = (
                    f"RUNNING on {running_sha}; /healthz HTTP {health_status}, "
                    f"/deployment.json HTTP {ident_status} "
                    f"repository={ident.get('source_repository')!r} "
                    f"revision={ident.get('source_revision')!r}"
                )
            else:
                last = f"stage={stage!r} running_sha={running_sha!r}"
        except (OSError, ValueError) as exc:
            last = f"{type(exc).__name__}: {exc}"
        if monotonic() >= deadline:
            raise PublishError(f"{SPACE_ID} did not converge on {created_oid}: {last}")
        print(f"waiting for {SPACE_ID}: {last}", flush=True)
        sleep(interval_s)


def publish(api: Any, target: str, root: Path, source_sha: str, receipt: dict[str, Any]) -> None:
    from huggingface_hub.utils import DEFAULT_IGNORE_PATTERNS, filter_repo_objects

    spec = TARGETS[target]
    repo_id, repo_type = spec["repo_id"], spec["repo_type"]
    receipt["parent_oid"] = require_existing_repo(api, repo_id, repo_type)

    if target == "space":
        identity_path = write_source_identity(root, source_sha)
        write_ouroboros_cycle(root)
        receipt["identity_path"] = str(identity_path.relative_to(root)).replace("\\", "/")
        folder = root
        message = f"deploy: exact Frontier source {source_sha[:12]}"
        exclude: tuple[str, ...] = SPACE_EXCLUDE
    else:
        folder = root / "hf" / "dataset"
        if not (folder / "README.md").is_file():
            raise PublishError(f"dataset source {folder} has no README.md card")
        message = f"Covenant source-bound to {source_sha[:12]}"
        exclude = ()

    expected = publish_set(folder, [*exclude, *DEFAULT_IGNORE_PATTERNS], filter_repo_objects)
    receipt["exclude_patterns"] = list(exclude)
    commit = api.upload_folder(
        repo_id=repo_id,
        repo_type=repo_type,
        folder_path=str(folder),
        commit_message=message,
        commit_description=(
            f"source_repository={SOURCE_REPOSITORY}\nsource_revision={source_sha}"
        ),
        # Fresh lists: upload_folder appends its defaults to ignore_patterns in place.
        ignore_patterns=list(exclude),
        delete_patterns=list(MIRROR_DELETE),
        # Optimistic lock across repositories: a concurrent Hub writer fails this commit.
        parent_commit=receipt["parent_oid"],
    )
    created_oid = str(getattr(commit, "oid", "") or "")
    if not re.fullmatch(r"[0-9a-f]{40}", created_oid):
        raise PublishError(f"upload to {repo_type}/{repo_id} returned no exact commit oid")
    receipt["created_oid"] = created_oid
    receipt["new_commit"] = created_oid != receipt["parent_oid"]
    receipt["commit_message"] = message if receipt["new_commit"] else None
    receipt["hub_oid"] = read_back_head(api, repo_id, repo_type, created_oid)
    receipt["tree"] = read_back_tree(api, repo_id, repo_type, created_oid, expected)

    if target == "space":
        receipt["runtime"] = attest_space_runtime(created_oid, source_sha)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--target", choices=sorted(TARGETS), required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args(argv)

    spec = TARGETS[args.target]
    receipt: dict[str, Any] = {
        "schema": RECEIPT_SCHEMA,
        "target": args.target,
        "repo_type": spec["repo_type"],
        "repo_id": spec["repo_id"],
        "lock_group": lock_group(spec["repo_type"], spec["repo_id"]),
        "source_repository": SOURCE_REPOSITORY,
        "workflow_run": os.environ.get("GITHUB_RUN_ID"),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "verdict": "FAILED",
    }
    try:
        token = os.environ.get("HF_TOKEN") or os.environ.get("HF_ORG_TOKEN")
        if not token:
            raise PublishError("HF_TOKEN/HF_ORG_TOKEN absent. Hub mutation blocked.")
        import huggingface_hub
        from huggingface_hub import HfApi

        receipt["hub_client"] = f"huggingface_hub=={huggingface_hub.__version__}"
        root = Path(os.environ.get("GITHUB_WORKSPACE") or ".").resolve()
        source_sha = exact_source_revision(root)
        receipt["source_revision"] = source_sha
        publish(HfApi(token=token), args.target, root, source_sha, receipt)
        receipt["verdict"] = "VERIFIED"
        return 0
    except PublishError as exc:
        receipt["reason"] = str(exc)
        print(f"::error::{exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        # Hub/HTTP client errors: record the class and message, then surface the traceback.
        receipt["reason"] = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        receipt["finished_at"] = datetime.now(timezone.utc).isoformat()
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    raise SystemExit(main())
