"""Read-only CI witness for the admitted edge source pins, never model qualification.

Copyright 2026 SZL Holdings. SPDX-License-Identifier: Apache-2.0
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

SOURCE_REPOSITORY = "szl-holdings/szl-frontier"
SHA40 = re.compile(r"[0-9a-f]{40}")
SHA256 = re.compile(r"[0-9a-f]{64}")


class WitnessError(ValueError):
    """Unknown or inconsistent evidence cannot yield a successful witness."""


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False).encode("utf-8")


def source_context(root: Path, environ: Mapping[str, str]) -> dict[str, str]:
    """Bind observations to the actual Actions checkout, including PR merge refs.

    This is a run/source binding, not a signature or proof of protected-main
    admission. A pull-request checkout is explicitly recorded as such.
    """
    if environ.get("GITHUB_ACTIONS") != "true":
        raise WitnessError("GitHub Actions context required")
    if environ.get("GITHUB_REPOSITORY") != SOURCE_REPOSITORY:
        raise WitnessError("unexpected source repository")
    expected = environ.get("GITHUB_SHA", "")
    if SHA40.fullmatch(expected) is None:
        raise WitnessError("exact GitHub source revision required")
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root,
                          text=True, capture_output=True, check=True).stdout.strip()
    if head != expected:
        raise WitnessError("checkout differs from event source revision")
    event = environ.get("GITHUB_EVENT_NAME", "")
    ref = environ.get("GITHUB_REF", "")
    admitted_ref = (
        (event == "pull_request" and re.fullmatch(r"refs/pull/[1-9][0-9]*/merge", ref))
        or (event in {"push", "workflow_dispatch"} and ref == "refs/heads/main")
    )
    if not admitted_ref:
        raise WitnessError("unexpected read-only witness event or ref")
    run_id = environ.get("GITHUB_RUN_ID", "")
    attempt = environ.get("GITHUB_RUN_ATTEMPT", "")
    if not re.fullmatch(r"[1-9][0-9]*", run_id) or not re.fullmatch(r"[1-9][0-9]*", attempt):
        raise WitnessError("exact Actions run and attempt required")
    workflow_ref = environ.get("GITHUB_WORKFLOW_REF", "")
    prefix = SOURCE_REPOSITORY + "/.github/workflows/edge-source-witness.yml@"
    if not workflow_ref.startswith(prefix) or workflow_ref[len(prefix):] != ref:
        raise WitnessError("workflow identity differs from the checked event")
    return {"repository": SOURCE_REPOSITORY, "revision": head, "ref": ref,
            "event": event, "workflowRef": workflow_ref,
            "runId": run_id, "runAttempt": attempt,
            "runUrl": f"https://github.com/{SOURCE_REPOSITORY}/actions/runs/{run_id}/attempts/{attempt}",
            "authority": "read-only-source-observation-not-production-authorization"}


def validate_scan(report: Any, expected_pins: Mapping[str, str]) -> None:
    """Require complete, exact-pin source evidence, not an offline PASS fixture."""
    if not expected_pins or any(SHA40.fullmatch(pin) is None for pin in expected_pins.values()):
        raise WitnessError("expected immutable pins required")
    if not isinstance(report, dict) or report.get("schema") != "szl.frontier.watch-output.v1":
        raise WitnessError("unexpected watch report")
    if report.get("live") is not True or report.get("productionPromotion") is not False:
        raise WitnessError("live metadata-only evidence required")
    count = len(expected_pins)
    if any(type(report.get(key)) is not int or report[key] != count
           for key in ("sourceCount", "successfulSources")) or report.get("errors") != []:
        raise WitnessError("primary-source coverage incomplete")
    rows = report.get("sourceResults")
    if not isinstance(rows, list) or len(rows) != count:
        raise WitnessError("one observation per admitted source required")
    seen: set[str] = set()
    changed = 0
    for row in rows:
        if not isinstance(row, dict):
            raise WitnessError("invalid source observation")
        repo = row.get("repoId")
        if not isinstance(repo, str) or repo not in expected_pins or repo in seen:
            raise WitnessError("unknown or duplicate source observation")
        seen.add(repo)
        if row.get("status") != "ok" or row.get("baselineRevision") != expected_pins[repo]:
            raise WitnessError("reviewed source pin was not verified")
        if SHA40.fullmatch(str(row.get("observedRevision", ""))) is None:
            raise WitnessError("observed source revision missing")
        before, after = row.get("baselineFingerprint"), row.get("artifactFingerprint")
        if any(not isinstance(v, str) or SHA256.fullmatch(v) is None for v in (before, after)):
            raise WitnessError("substantive artifact identity missing")
        if type(row.get("materialChange")) is not bool or row["materialChange"] != (before != after):
            raise WitnessError("change verdict differs from artifact identities")
        changed += row["materialChange"]
    candidates = report.get("materialCandidates")
    if not isinstance(candidates, list) or len(candidates) != changed:
        raise WitnessError("material-change candidate count inconsistent")
    for candidate in candidates:
        if not isinstance(candidate, dict) or candidate.get("productionDisposition") != "HOLD":
            raise WitnessError("source observations cannot promote a model")
    canonical_bytes(report)  # Reject non-finite or non-JSON evidence before export.


def make_witness(report: Any, context: Mapping[str, str], expected_pins: Mapping[str, str],
                 code_hashes: Mapping[str, str]) -> dict[str, Any]:
    errors = []
    try:
        validate_scan(report, expected_pins)
    except (WitnessError, TypeError, ValueError) as exc:
        errors.append(str(exc) if isinstance(exc, WitnessError) else "invalid evidence encoding")
    result = {
        "schema": "szl.frontier.edge-source-witness.v1",
        "source": dict(context), "codeSha256": dict(code_hashes),
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "status": "PASS" if not errors else "INCOMPLETE",
        "validationErrors": errors, "observations": report,
        "metadataVerified": not errors, "runtimeVerified": False,
        "modelPerformanceVerified": False, "trainingAuthorized": False,
        "productionDisposition": "HOLD", "sealed": False,
    }
    result["recordSha256"] = hashlib.sha256(canonical_bytes(result)).hexdigest()
    return result


def write_atomic(output: Path, payload: Any) -> None:
    """Replace stale PASS data only after the entire new record is serialized."""
    text = json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".edge-witness-", dir=output.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    try:
        context = source_context(root, os.environ)
        from .edge_lane import ARTIFACTS, scan
        hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
                  for name in ("python/szl_frontier/edge_lane.py", "python/szl_frontier/edge_witness.py")}
        result = make_witness(scan(), context, {a[1]: a[2] for a in ARTIFACTS}, hashes)
    except Exception as exc:  # Always replace a stale success; omit exception text from upstream.
        result = {"schema": "szl.frontier.edge-source-witness.v1", "status": "INCOMPLETE",
                  "metadataVerified": False, "runtimeVerified": False, "sealed": False,
                  "modelPerformanceVerified": False, "trainingAuthorized": False,
                  "productionDisposition": "HOLD", "errorType": type(exc).__name__}
    write_atomic(Path(args.output), result)
    print(json.dumps({"status": result["status"], "metadataVerified": result["metadataVerified"],
                      "productionDisposition": "HOLD"}, sort_keys=True))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
