"""Offline, evidence-bound research proposals and result checks.

This validates reference closure and declared measurements, not the truth of a
scientific claim or the authority of an external issuer. It never runs a model,
executes an experiment, or authorizes production.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path, PurePosixPath
from typing import Any

from .domain import FrontierError
from .receipts import ReceiptFactory

PROPOSAL_SCHEMA = "szl.frontier.research-proposal.v1"
RESULT_SCHEMA = "szl.frontier.research-result.v1"
RESEARCH_SUBJECT = "frontier-research-evaluation-only"
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
GIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9_.-]{0,63}\Z")
REPO = re.compile(r"szl-holdings/[A-Za-z0-9_.-]+\Z")
RELATIVE_PATH = re.compile(r"[A-Za-z0-9._/-]+\Z")
MAX_JSON_BYTES = 1024 * 1024
MAX_EVIDENCE_BYTES = 1024 * 1024
MAX_EVIDENCE_AGE = timedelta(days=30)


class ResearchError(FrontierError):
    """The proposal, result, source binding, or local evidence is invalid."""


def _pairs(rows: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in rows:
        if key in value:
            raise ResearchError("duplicate JSON key")
        value[key] = item
    return value


def _nonfinite(_: str) -> None:
    raise ResearchError("nonfinite JSON number")


def _finite_tree(value: Any) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ResearchError("nonfinite JSON number")
    if isinstance(value, dict):
        for item in value.values():
            _finite_tree(item)
    elif isinstance(value, list):
        for item in value:
            _finite_tree(item)


def _load_json(raw: bytes) -> dict[str, Any]:
    if len(raw) > MAX_JSON_BYTES:
        raise ResearchError("JSON byte budget exceeded")
    try:
        value = json.loads(raw, object_pairs_hook=_pairs, parse_constant=_nonfinite)
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise ResearchError("invalid JSON") from exc
    try:
        _finite_tree(value)
    except RecursionError as exc:
        raise ResearchError("JSON nesting budget exceeded") from exc
    if not isinstance(value, dict):
        raise ResearchError("JSON root must be an object")
    return value


def _keys(value: Any, expected: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != expected:
        raise ResearchError(f"{label} fields do not match the schema")
    return value


def _identifier(value: Any, label: str) -> str:
    if not isinstance(value, str) or IDENTIFIER.fullmatch(value) is None:
        raise ResearchError(f"{label} must be a bounded identifier")
    return value


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 500:
        raise ResearchError(f"{label} must be nonempty and at most 500 characters")
    return value


def _list(value: Any, label: str, *, limit: int) -> list[Any]:
    if not isinstance(value, list) or not 1 <= len(value) <= limit:
        raise ResearchError(f"{label} must contain 1..{limit} entries")
    return value


def _number(value: Any, label: str) -> Decimal:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ResearchError(f"{label} must be numeric")
    if isinstance(value, float) and not math.isfinite(value):
        raise ResearchError(f"{label} must be finite")
    number = Decimal(str(value))
    if abs(number) > Decimal("1e12"):
        raise ResearchError(f"{label} is outside the admitted range")
    return number


def _time(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value) is None:
        raise ResearchError(f"{label} must be UTC RFC 3339")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise ResearchError(f"{label} must be UTC RFC 3339") from exc
    return parsed.replace(tzinfo=timezone.utc)


def _relative(value: Any, label: str) -> PurePosixPath:
    if not isinstance(value, str) or RELATIVE_PATH.fullmatch(value) is None:
        raise ResearchError(f"{label} must be a repository-relative POSIX path")
    path = PurePosixPath(value)
    if value.startswith("/") or any(part in {".", ".."} for part in value.split("/")):
        raise ResearchError(f"{label} escapes its root")
    if str(path) != value:
        raise ResearchError(f"{label} is not canonical")
    return path


def _read_bounded(root: Path, value: Any, label: str, *, limit: int) -> bytes:
    relative = _relative(value, label)
    target = (root / Path(*relative.parts)).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise ResearchError(f"{label} is absent or escapes the evidence root")
    with target.open("rb") as stream:
        raw = stream.read(limit + 1)
    if len(raw) > limit:
        raise ResearchError(f"{label} byte budget exceeded")
    return raw


def _git(root: Path, *args: str) -> str:
    try:
        process = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ResearchError("local source checkout is unavailable") from exc
    if process.returncode != 0:
        raise ResearchError("local source checkout is unavailable")
    return process.stdout.strip()


def _source_binding(source_root: Path, source: Any) -> dict[str, str]:
    source = _keys(source, {"repository", "revision"}, "source")
    repository = source["repository"]
    revision = source["revision"]
    if not isinstance(repository, str) or REPO.fullmatch(repository) is None:
        raise ResearchError("source repository must be an SZL GitHub repository")
    if not isinstance(revision, str) or GIT_SHA.fullmatch(revision) is None:
        raise ResearchError("source revision must be an exact commit")
    root = source_root.resolve()
    if not root.is_dir() or Path(_git(root, "rev-parse", "--show-toplevel")).resolve() != root:
        raise ResearchError("source root must be the checkout root")
    if _git(root, "rev-parse", "HEAD") != revision:
        raise ResearchError("source checkout is not at the declared revision")
    origin = _git(root, "remote", "get-url", "origin")
    if origin.removesuffix(".git") not in {
        f"https://github.com/{repository}",
        f"git@github.com:{repository}",
    }:
        raise ResearchError("source checkout origin differs from the declaration")
    if _git(root, "status", "--porcelain", "--untracked-files=all"):
        raise ResearchError("source checkout must be clean")
    return {"repository": repository, "revision": revision, "binding": "LOCAL_CLEAN_CHECKOUT"}


def _evidence(root: Path, entries: Any, now: datetime, label: str) -> dict[str, tuple[str, bytes]]:
    found: dict[str, tuple[str, bytes]] = {}
    for item in _list(entries, label, limit=16):
        item = _keys(item, {"id", "path", "sha256", "observedAt", "expiresAt"}, label)
        identity = _identifier(item["id"], f"{label} id")
        if identity in found:
            raise ResearchError(f"duplicate {label} id")
        digest = item["sha256"]
        if not isinstance(digest, str) or SHA256.fullmatch(digest) is None:
            raise ResearchError(f"{label} digest must be lowercase SHA-256")
        observed = _time(item["observedAt"], f"{label} observedAt")
        expires = _time(item["expiresAt"], f"{label} expiresAt")
        if observed > now or expires < now or not observed < expires:
            raise ResearchError(f"{label} is future-dated or expired")
        if expires - observed > MAX_EVIDENCE_AGE:
            raise ResearchError(f"{label} validity exceeds 30 days")
        raw = _read_bounded(root, item["path"], f"{label} file", limit=MAX_EVIDENCE_BYTES)
        actual = hashlib.sha256(raw).hexdigest()
        if actual != digest:
            raise ResearchError(f"{label} file digest mismatch")
        found[identity] = digest, raw
    return found


def _metric_file_value(evidence: dict[str, tuple[str, bytes]], identity: str, name: str) -> Decimal:
    summary = _load_json(evidence[identity][1])
    _keys(summary, {"metrics"}, "metric summary")
    metrics = summary["metrics"]
    if not isinstance(metrics, dict) or name not in metrics:
        raise ResearchError("metric is absent from its retained summary")
    return _number(metrics[name], "retained metric value")


def _proposal(root: Path, proposal: dict[str, Any], now: datetime, source_root: Path) -> tuple[dict[str, str], dict[str, tuple[str, bytes]]]:
    _keys(
        proposal,
        {"schema", "proposalId", "authority", "productionPromotion", "dataUse", "source",
         "hypothesis", "claims", "evidence", "metrics", "stopConditions",
         "maxRuntimeSeconds", "targetPaths"},
        "proposal",
    )
    if proposal["schema"] != PROPOSAL_SCHEMA or proposal["authority"] != "evaluation-only":
        raise ResearchError("proposal schema or authority is invalid")
    if proposal["productionPromotion"] is not False or proposal["dataUse"] != "evaluation-only":
        raise ResearchError("research cannot authorize production or training")
    _identifier(proposal["proposalId"], "proposalId")
    _text(proposal["hypothesis"], "hypothesis")
    source = _source_binding(source_root, proposal["source"])
    evidence = _evidence(root, proposal["evidence"], now, "proposal evidence")
    for claim in _list(proposal["claims"], "claims", limit=16):
        claim = _keys(claim, {"text", "evidenceIds"}, "claim")
        _text(claim["text"], "claim text")
        ids = [_identifier(value, "claim evidence id") for value in _list(claim["evidenceIds"], "claim evidenceIds", limit=8)]
        if len(ids) != len(set(ids)) or not set(ids) <= set(evidence):
            raise ResearchError("claim has duplicate or unknown evidence references")
    metrics: dict[str, str] = {}
    for item in _list(proposal["metrics"], "metrics", limit=8):
        item = _keys(item, {"name", "direction", "baseline", "minDelta", "baselineEvidenceId"}, "metric")
        name = _identifier(item["name"], "metric name")
        if name in metrics:
            raise ResearchError("duplicate metric name")
        direction = item["direction"]
        if not isinstance(direction, str) or direction not in {"higher", "lower", "zero"}:
            raise ResearchError("metric direction is invalid")
        baseline = _number(item["baseline"], "metric baseline")
        delta = _number(item["minDelta"], "metric minDelta")
        if delta < 0 or (direction == "zero" and delta != 0) or (direction != "zero" and delta <= 0):
            raise ResearchError("metric minDelta is invalid")
        reference = _identifier(item["baselineEvidenceId"], "baselineEvidenceId")
        if reference not in evidence:
            raise ResearchError("metric baseline lacks evidence")
        if _metric_file_value(evidence, reference, name) != baseline:
            raise ResearchError("metric baseline differs from retained summary")
        metrics[name] = direction
    stops = [_identifier(value, "stop condition") for value in _list(proposal["stopConditions"], "stopConditions", limit=12)]
    if len(stops) != len(set(stops)):
        raise ResearchError("duplicate stop condition")
    runtime = proposal["maxRuntimeSeconds"]
    if isinstance(runtime, bool) or not isinstance(runtime, int) or not 1 <= runtime <= 3600:
        raise ResearchError("maxRuntimeSeconds must be 1..3600")
    paths = [_relative(value, "target path") for value in _list(proposal["targetPaths"], "targetPaths", limit=12)]
    if len(paths) != len(set(paths)):
        raise ResearchError("duplicate target path")
    return source, evidence


def evaluate_research(
    evidence_root: Path,
    source_root: Path,
    proposal_path: str,
    result_path: str | None = None,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Validate local evidence and return an evaluation-only, read-only verdict."""
    root = evidence_root.resolve()
    if not root.is_dir():
        raise ResearchError("evidence root is unavailable")
    observed_at = now or datetime.now(timezone.utc)
    if observed_at.tzinfo is None:
        raise ResearchError("validation time must be timezone-aware")
    observed_at = observed_at.astimezone(timezone.utc)
    proposal_raw = _read_bounded(root, proposal_path, "proposal", limit=MAX_JSON_BYTES)
    proposal = _load_json(proposal_raw)
    source, proposal_evidence = _proposal(root, proposal, observed_at, source_root)
    proposal_digest = hashlib.sha256(proposal_raw).hexdigest()
    if result_path is None:
        return {
            "schema": "szl.frontier.research-verdict.v1",
            "status": "PROPOSAL_CHECKED",
            "proposalSha256": proposal_digest,
            "source": source,
            "evidenceSha256": {key: value[0] for key, value in proposal_evidence.items()},
            "claimValidation": "REFERENCE_CLOSURE_ONLY",
            "productionPromotion": False,
        }

    result_raw = _read_bounded(root, result_path, "result", limit=MAX_JSON_BYTES)
    result = _load_json(result_raw)
    _keys(
        result,
        {"schema", "proposalSha256", "authority", "productionPromotion", "observations",
         "metrics", "triggeredStops", "elapsedSeconds"},
        "result",
    )
    if result["schema"] != RESULT_SCHEMA or result["authority"] != "evaluation-only":
        raise ResearchError("result schema or authority is invalid")
    if result["productionPromotion"] is not False or result["proposalSha256"] != proposal_digest:
        raise ResearchError("result is not bound to this proposal")
    observations = _evidence(root, result["observations"], observed_at, "result observation")
    measured: dict[str, dict[str, Any]] = {}
    for item in _list(result["metrics"], "result metrics", limit=8):
        item = _keys(item, {"name", "value", "observationEvidenceId"}, "result metric")
        name = _identifier(item["name"], "result metric name")
        if name in measured:
            raise ResearchError("duplicate result metric")
        reference = _identifier(item["observationEvidenceId"], "observationEvidenceId")
        if reference not in observations:
            raise ResearchError("result metric lacks a retained observation")
        value = _number(item["value"], "result metric value")
        if _metric_file_value(observations, reference, name) != value:
            raise ResearchError("result metric differs from retained summary")
        measured[name] = {"value": value, "evidenceId": reference}
    planned = {item["name"]: item for item in proposal["metrics"]}
    if set(measured) != set(planned):
        raise ResearchError("result metrics differ from the proposal")
    triggered = result["triggeredStops"]
    if not isinstance(triggered, list) or len(triggered) > 12:
        raise ResearchError("triggeredStops must be a bounded list")
    triggered = [_identifier(value, "triggered stop") for value in triggered]
    if len(triggered) != len(set(triggered)) or not set(triggered) <= set(proposal["stopConditions"]):
        raise ResearchError("triggeredStops contain duplicate or unknown conditions")
    elapsed = _number(result["elapsedSeconds"], "elapsedSeconds")
    if elapsed < 0:
        raise ResearchError("elapsedSeconds cannot be negative")
    reasons = [f"stop:{name}" for name in triggered]
    if elapsed > proposal["maxRuntimeSeconds"]:
        reasons.append("runtime-limit-exceeded")
    metric_verdicts: list[dict[str, Any]] = []
    for name, item in planned.items():
        baseline = Decimal(str(item["baseline"]))
        candidate = measured[name]["value"]
        delta = Decimal(str(item["minDelta"]))
        direction = item["direction"]
        met = (
            candidate >= baseline + delta if direction == "higher"
            else candidate <= baseline - delta if direction == "lower"
            else candidate == 0
        )
        if not met:
            reasons.append(f"metric:{name}")
        metric_verdicts.append({"name": name, "met": met, "observationEvidenceId": measured[name]["evidenceId"]})
    status = "PASS" if not reasons else "HOLD"
    result_digest = hashlib.sha256(result_raw).hexdigest()
    receipt = ReceiptFactory().create(
        release_id=proposal["proposalId"],
        subject=RESEARCH_SUBJECT,
        payload={
            "proposalSha256": proposal_digest,
            "resultSha256": result_digest,
            "source": source,
            "proposalEvidenceSha256": {key: value[0] for key, value in proposal_evidence.items()},
            "observationSha256": {key: value[0] for key, value in observations.items()},
            "metricVerdicts": metric_verdicts,
            "status": status,
            "reasons": reasons,
            "productionAuthorized": False,
        },
        created_at=observed_at,
    )
    return {
        "schema": "szl.frontier.research-verdict.v1",
        "status": status,
        "reasons": reasons,
        "claimValidation": "REFERENCE_CLOSURE_ONLY",
        "measurementValidation": "RETAINED_METRIC_SUMMARY_CONSISTENCY_ONLY",
        "productionPromotion": False,
        "receipt": receipt.as_mapping(),
    }
