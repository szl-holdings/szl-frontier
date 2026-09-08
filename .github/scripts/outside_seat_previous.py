#!/usr/bin/env python3
"""Retrieve the preceding same-workflow main receipt, or fail closed.

Only GitHub REST requests receive GITHUB_TOKEN. Artifact storage requests do
not. The archive is bounded, its GitHub digest is checked, and only receipt.json
is extracted. The verifier separately validates the receipt's own digest.
Genesis means no eligible earlier completed run is visible in GitHub's API;
deleted historical runs cannot be independently witnessed here. A missing or
expired artifact on an existing run is an error, never genesis.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

WORKFLOW = "estate-outside-seat.yml"
WORKFLOW_PATH = f".github/workflows/{WORKFLOW}"
EVENTS = frozenset(("schedule", "workflow_dispatch"))
MAX_JSON_BYTES = 4 * 1024 * 1024
MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
MAX_RECEIPT_BYTES = 2 * 1024 * 1024
MAX_ZIP_MEMBERS = 4096
MAX_PAGES = 10  # Filtered workflow-run listings expose at most 1,000 runs.


class ChainError(RuntimeError):
    """Missing or ambiguous history must not silently reset the chain."""


def positive_int(value: object, field: str) -> int:
    if type(value) is not int or value <= 0:
        raise ChainError(f"Invalid {field}")
    return value


def bounded_read(response, limit: int) -> bytes:
    data = response.read(limit + 1)
    if len(data) > limit:
        raise ChainError("HTTP response exceeded its byte limit")
    return data


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def storage_url_allowed(url: str) -> bool:
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or "").lower()
    return (
        parsed.scheme == "https" and parsed.port in (None, 443)
        and not parsed.username and not parsed.password and not parsed.fragment
        and (host.endswith(".blob.core.windows.net")
             or host.endswith(".actions.githubusercontent.com")
             or host == "objects.githubusercontent.com")
    )


class GitHub:
    def __init__(self, token: str):
        if not token:
            raise ChainError("GITHUB_TOKEN is required for artifact retrieval")
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect)

    def _api_request(self, path: str):
        if not path.startswith("/repos/") or "\\" in path or ".." in path:
            raise ChainError("Invalid GitHub API path")
        return urllib.request.Request("https://api.github.com" + path, headers={
            "Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "szl-outside-seat-chain/2",
        })

    def json(self, path: str) -> dict:
        try:
            with self.opener.open(self._api_request(path), timeout=30) as response:
                data = json.loads(bounded_read(response, MAX_JSON_BYTES))
        except urllib.error.HTTPError as exc:
            raise ChainError(f"GitHub API returned HTTP {exc.code}") from None
        except (urllib.error.URLError, TimeoutError, ValueError, OSError):
            raise ChainError("GitHub API request or JSON decoding failed") from None
        if not isinstance(data, dict):
            raise ChainError("GitHub API returned a non-object response")
        return data

    def archive(self, path: str) -> bytes:
        # Normal urllib redirects can copy Authorization to another host.
        # Receive the redirect explicitly and build a token-free storage request.
        try:
            try:
                with self.opener.open(self._api_request(path), timeout=30) as response:
                    return bounded_read(response, MAX_ARCHIVE_BYTES)
            except urllib.error.HTTPError as exc:
                if exc.code not in (301, 302, 303, 307, 308):
                    raise ChainError(f"Artifact API returned HTTP {exc.code}") from None
                location = exc.headers.get("Location", "")
                exc.close()
            for _ in range(4):
                if not storage_url_allowed(location):
                    raise ChainError("Artifact redirect left allowed GitHub storage")
                request = urllib.request.Request(location, headers={"User-Agent": "szl-outside-seat-chain/2"})
                try:
                    with self.opener.open(request, timeout=60) as response:
                        return bounded_read(response, MAX_ARCHIVE_BYTES)
                except urllib.error.HTTPError as exc:
                    if exc.code not in (301, 302, 303, 307, 308):
                        raise ChainError(f"Artifact storage returned HTTP {exc.code}") from None
                    location = urllib.parse.urljoin(location, exc.headers.get("Location", ""))
                    exc.close()
            raise ChainError("Too many artifact redirects")
        except (urllib.error.URLError, TimeoutError, ValueError, OSError):
            # Never print signed storage URLs, tokens, or arbitrary HTTP bodies.
            raise ChainError("Artifact download failed") from None


def list_items(api: GitHub, path: str, key: str) -> list[dict]:
    results = []
    expected = None
    separator = "&" if "?" in path else "?"
    for page in range(1, MAX_PAGES + 1):
        payload = api.json(f"{path}{separator}per_page=100&page={page}")
        total, batch = payload.get("total_count"), payload.get(key)
        if type(total) is not int or total < 0 or not isinstance(batch, list):
            raise ChainError("Malformed GitHub pagination response")
        if total > MAX_PAGES * 100:
            raise ChainError("GitHub history exceeds the auditable pagination limit")
        if expected is None:
            expected = total
        elif total != expected:
            raise ChainError("GitHub history changed during pagination; retry required")
        if any(not isinstance(item, dict) for item in batch):
            raise ChainError("Malformed GitHub history item")
        results.extend(batch)
        if len(results) == total:
            return results
        if not batch or len(results) > total:
            raise ChainError("GitHub returned incomplete or inconsistent history")
    raise ChainError("GitHub pagination limit reached")


def verify_run(run: dict, repository: str, repository_id: int, workflow_id: int) -> None:
    repo = run.get("repository") or {}
    head = run.get("head_repository") or {}
    if not isinstance(repo, dict) or not isinstance(head, dict):
        raise ChainError("Malformed workflow repository metadata")
    if (
        repo.get("full_name", "").lower() != repository.lower()
        or repo.get("id") != repository_id or head.get("id") != repository_id
        or head.get("full_name", "").lower() != repository.lower()
        or run.get("workflow_id") != workflow_id or run.get("path") != WORKFLOW_PATH
        or run.get("head_branch") != "main" or run.get("event") not in EVENTS
    ):
        raise ChainError("Workflow run repository, branch, event or workflow does not match")
    for field in ("id", "run_number", "run_attempt"):
        positive_int(run.get(field), field)
    if not re.fullmatch(r"[0-9a-f]{40}", run.get("head_sha", "")):
        raise ChainError("Workflow run lacks a valid source revision")


def receipt_from_archive(data: bytes, artifact: dict) -> bytes:
    digest = artifact.get("digest", "")
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
        raise ChainError("Artifact has no supported GitHub SHA-256 digest")
    if "sha256:" + hashlib.sha256(data).hexdigest() != digest:
        raise ChainError("Artifact archive digest does not match GitHub metadata")
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ChainError("Artifact archive exceeds its byte limit")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            members = archive.infolist()
            if len(members) > MAX_ZIP_MEMBERS:
                raise ChainError("Artifact archive has too many entries")
            matches = [member for member in members if member.filename == "receipt.json"]
            if len(matches) != 1:
                raise ChainError("Prior artifact must contain exactly one root receipt.json")
            member = matches[0]
            if member.is_dir() or stat.S_ISLNK(member.external_attr >> 16) or member.flag_bits & 1 or member.file_size > MAX_RECEIPT_BYTES:
                raise ChainError("Prior receipt ZIP entry is unsafe or oversized")
            with archive.open(member) as receipt:
                return bounded_read(receipt, MAX_RECEIPT_BYTES)
    except ChainError:
        raise
    except (zipfile.BadZipFile, RuntimeError, OSError, NotImplementedError):
        raise ChainError("Prior artifact is not a readable receipt ZIP") from None


def retrieve_previous(api: GitHub, repository: str, run_id: int, attempt: int, source_sha: str) -> tuple[bytes | None, dict]:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ChainError("Invalid GITHUB_REPOSITORY")
    positive_int(run_id, "current run id")
    positive_int(attempt, "current run attempt")
    prefix = f"/repos/{repository}"
    repo = api.json(prefix)
    if repo.get("default_branch") != "main" or repo.get("full_name", "").lower() != repository.lower():
        raise ChainError("The expected repository must have main as its default branch")
    repository_id = positive_int(repo.get("id"), "repository id")
    workflow = api.json(f"{prefix}/actions/workflows/{WORKFLOW}")
    workflow_id = positive_int(workflow.get("id"), "workflow id")
    if workflow.get("path") != WORKFLOW_PATH:
        raise ChainError("Workflow path does not match")
    current = api.json(f"{prefix}/actions/runs/{run_id}/attempts/{attempt}")
    verify_run(current, repository, repository_id, workflow_id)
    if current["id"] != run_id or current["run_attempt"] != attempt or current["head_sha"] != source_sha:
        raise ChainError("Current run id, attempt or source differs from the job context")
    context = {"schema": "szl.outside-seat.previous-chain.v1", "repository": repository,
               "repositoryId": repository_id, "workflowId": workflow_id,
               "currentRunId": run_id, "currentRunAttempt": attempt,
               "currentRunNumber": current["run_number"], "sourceRevision": source_sha}
    runs = list_items(api, f"{prefix}/actions/workflows/{workflow_id}/runs?branch=main&status=completed", "workflow_runs")
    candidates, seen = [], set()
    for run in runs:
        candidate_id = positive_int(run.get("id"), "listed run id")
        if candidate_id in seen:
            raise ChainError("Duplicate workflow run in GitHub history")
        seen.add(candidate_id)
        number = positive_int(run.get("run_number"), "listed run number")
        if candidate_id == run_id or number >= current["run_number"]:
            continue
        # PR artifacts are never admissible, even if head_branch reports main.
        if run.get("event") not in EVENTS:
            continue
        verify_run(run, repository, repository_id, workflow_id)
        if run.get("status") != "completed":
            raise ChainError("Completed-run query returned an unfinished predecessor")
        candidates.append(run)
    if not candidates:
        return None, {**context, "status": "GENESIS", "reason": "No eligible earlier completed run is visible"}
    previous = max(candidates, key=lambda run: run["run_number"])
    previous_id, previous_attempt = previous["id"], previous["run_attempt"]
    # Bind a fresh run read to its latest attempt; never fall back after a rerun.
    fresh = api.json(f"{prefix}/actions/runs/{previous_id}")
    verify_run(fresh, repository, repository_id, workflow_id)
    if any(fresh[key] != previous[key] for key in ("id", "run_attempt", "head_sha", "run_number")) or fresh.get("status") != "completed":
        raise ChainError("Preceding run changed during retrieval; retry required")
    artifact_name = f"estate-outside-seat-{previous_id}-{previous_attempt}"
    artifacts = list_items(api, f"{prefix}/actions/runs/{previous_id}/artifacts", "artifacts")
    matches = [item for item in artifacts if item.get("name") == artifact_name]
    if len(matches) != 1:
        raise ChainError("Preceding run has no unique artifact for its current attempt")
    artifact = matches[0]
    artifact_id = positive_int(artifact.get("id"), "artifact id")
    binding = artifact.get("workflow_run") or {}
    if not isinstance(binding, dict) or (
        binding.get("id") != previous_id or binding.get("repository_id") != repository_id
        or binding.get("head_repository_id") != repository_id
        or binding.get("head_branch") != "main" or binding.get("head_sha") != previous["head_sha"]
    ):
        raise ChainError("Artifact repository, run, branch or source does not match")
    if artifact.get("expired") is not False:
        raise ChainError("Preceding artifact is expired or its expiry state is unavailable")
    if positive_int(artifact.get("size_in_bytes"), "artifact byte size") > MAX_ARCHIVE_BYTES:
        raise ChainError("Preceding artifact exceeds the archive byte limit")
    archive = api.archive(f"{prefix}/actions/artifacts/{artifact_id}/zip")
    receipt = receipt_from_archive(archive, artifact)
    return receipt, {**context, "status": "CHAINED", "previousRunId": previous_id,
                     "previousRunAttempt": previous_attempt, "previousRunConclusion": previous.get("conclusion"),
                     "previousArtifactId": artifact_id, "previousArtifactDigest": artifact["digest"],
                     "previousReceiptBytesSha256": hashlib.sha256(receipt).hexdigest(),
                     "receiptDigestValidation": "Required separately by estate_outside_seat.py"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--status-output", type=Path, required=True)
    args = parser.parse_args(argv)
    status = {"schema": "szl.outside-seat.previous-chain.v1", "status": "BLOCKED"}
    result = 3
    try:
        if args.output.exists():
            raise ChainError("Previous receipt output already exists; refusing stale reuse")
        data, status = retrieve_previous(
            GitHub(os.environ.get("GITHUB_TOKEN", "")), os.environ.get("GITHUB_REPOSITORY", ""),
            int(os.environ.get("GITHUB_RUN_ID", "0")), int(os.environ.get("GITHUB_RUN_ATTEMPT", "0")),
            os.environ.get("GITHUB_SHA", ""),
        )
        if data is not None:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_bytes(data)
        result = 0
    except (ChainError, OSError, ValueError, TypeError, AttributeError) as exc:
        status = {"schema": "szl.outside-seat.previous-chain.v1", "status": "BLOCKED",
                  "reason": str(exc) if isinstance(exc, ChainError) else "Chain context or local file operation failed"}
    args.status_output.parent.mkdir(parents=True, exist_ok=True)
    args.status_output.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, sort_keys=True))
    return result


if __name__ == "__main__":
    sys.exit(main())
