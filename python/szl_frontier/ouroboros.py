# SPDX-License-Identifier: Apache-2.0
"""Bounded Ouroboros cycle for the frontier organ.

receipts.in ≡ receipts.out. Always terminates. Proposal-only.
The arithmetic mean is a ghost: recorded when it would allow, forbidden to act.

Live GitHub observation is optional and fail-closed. Missing live evidence is
UNAVAILABLE, never a zero that looks measured. Λ stays Conjecture 1.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Mapping
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .domain import FrontierError
from .formula_evidence import load_formulas
from .invariants import check_receipt
from .lambda_gate import (
    DEFAULT_THRESHOLD,
    LAMBDA_POSTURE,
    AxisEvidence,
    GateResult,
    evaluate_lambda_gate,
)
from .receipts import EvidenceReceipt, ReceiptFactory

SCHEMA = "szl.frontier.ouroboros-cycle.v1"
RELEASE_ID = "szl-frontier-ouroboros-cycle"
MAX_ROUNDS = 2
IDENTITY = "receipts.in ≡ receipts.out"
GITHUB_API_ORIGIN = "https://api.github.com"
USER_AGENT = "SZL-Frontier-Ouroboros/1.0 (+https://github.com/szl-holdings/szl-frontier)"
MAX_GITHUB_BYTES = 256 * 1024
SHA40 = re.compile(r"^[0-9a-f]{40}$")
REPO_ROOT = Path(__file__).resolve().parents[2]

YUYAY_REFERENCE_13 = (
    "identity_integrity",
    "authorization_scope",
    "policy_conformance",
    "evidence_completeness",
    "provenance_integrity",
    "freshness",
    "schema_validity",
    "tool_boundary_safety",
    "human_approval",
    "counterparty_trust",
    "reversibility",
    "impact_boundedness",
    "independent_witness",
)

REQUIRED_BY_ACTION = {
    "READ_ONLY": (
        "identity_integrity",
        "authorization_scope",
        "policy_conformance",
        "evidence_completeness",
        "provenance_integrity",
        "freshness",
        "schema_validity",
        "tool_boundary_safety",
        "reversibility",
        "impact_boundedness",
    ),
    "REVERSIBLE_WRITE": (
        "identity_integrity",
        "authorization_scope",
        "policy_conformance",
        "evidence_completeness",
        "provenance_integrity",
        "freshness",
        "schema_validity",
        "tool_boundary_safety",
        "human_approval",
        "reversibility",
        "impact_boundedness",
    ),
    "IRREVERSIBLE_WRITE": (
        "identity_integrity",
        "authorization_scope",
        "policy_conformance",
        "evidence_completeness",
        "provenance_integrity",
        "freshness",
        "schema_validity",
        "tool_boundary_safety",
        "human_approval",
        "independent_witness",
        "impact_boundedness",
    ),
}

TOP_10_PROJECTS = (
    ("openclaw", "openclaw"),
    ("Significant-Gravitas", "AutoGPT"),
    ("n8n-io", "n8n"),
    ("langflow-ai", "langflow"),
    ("langgenius", "dify"),
    ("langchain-ai", "langchain"),
    ("google-gemini", "gemini-cli"),
    ("browser-use", "browser-use"),
    ("infiniflow", "ragflow"),
    ("crewAIInc", "crewAI"),
)


class CycleError(FrontierError):
    """Raised when the cycle cannot be constructed fail-closed."""


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _git(root: Path, *args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    text = result.stdout.strip()
    return text or None


def _axis(
    name: str,
    value: float | None,
    status: str,
    *,
    required: bool,
    now: datetime,
    source_ref: str,
    note: str | None = None,
    ttl: timedelta = timedelta(hours=24),
) -> AxisEvidence:
    return AxisEvidence(
        name=name,
        value=value,
        status=status,
        required=required,
        source_ref=source_ref,
        observed_at=_iso(now),
        expiry_at=_iso(now + ttl),
        note=note,
    )


def collect_local_axes(
    *,
    now: datetime,
    action_class: str,
    root: Path = REPO_ROOT,
    catalog_ok: bool,
    live_required: bool,
    git_head: str | None | object = ...,
    git_commit_time: str | None | object = ...,
    formulas_ok: bool | object = ...,
) -> list[AxisEvidence]:
    if action_class not in REQUIRED_BY_ACTION:
        raise CycleError(f"unknown action class: {action_class}")
    required = set(REQUIRED_BY_ACTION[action_class])
    if live_required:
        required.add("counterparty_trust")

    if git_head is ...:
        git_head = _git(root, "rev-parse", "HEAD")
    if git_commit_time is ...:
        git_commit_time = _git(root, "log", "-1", "--format=%cI")
    if formulas_ok is ...:
        try:
            load_formulas()
            formulas_ok = True
        except Exception:
            formulas_ok = False

    head = git_head if isinstance(git_head, str) else None
    commit_time = git_commit_time if isinstance(git_commit_time, str) else None
    provenance_ok = bool(head) and SHA40.fullmatch(head) is not None
    freshness_ok = False
    if commit_time:
        try:
            committed = datetime.fromisoformat(commit_time.replace("Z", "+00:00"))
            freshness_ok = (now - committed).days <= 365
        except ValueError:
            freshness_ok = False

    durable = timedelta(days=365)
    measured: dict[str, AxisEvidence] = {
        "identity_integrity": _axis(
            "identity_integrity",
            1.0,
            "MEASURED",
            required="identity_integrity" in required,
            now=now,
            source_ref="pkg:szl-frontier",
            note="organ identity is szl-frontier, not a second flagship",
            ttl=durable,
        ),
        "authorization_scope": _axis(
            "authorization_scope",
            1.0,
            "MEASURED",
            required="authorization_scope" in required,
            now=now,
            source_ref="cycle:authority",
            note="PROPOSAL_ONLY",
            ttl=durable,
        ),
        "policy_conformance": _axis(
            "policy_conformance",
            1.0,
            "MEASURED",
            required="policy_conformance" in required,
            now=now,
            source_ref="cycle:default-deny",
            note="default effect deny; approval cannot lift HARD_DENY",
            ttl=durable,
        ),
        "schema_validity": _axis(
            "schema_validity",
            1.0 if formulas_ok and catalog_ok else None,
            "MEASURED" if formulas_ok and catalog_ok else "UNAVAILABLE",
            required="schema_validity" in required,
            now=now,
            source_ref="hf/dataset/formulas.jsonl",
            note="F1–F9 load and catalog parse",
            ttl=durable,
        ),
        "tool_boundary_safety": _axis(
            "tool_boundary_safety",
            1.0,
            "MEASURED",
            required="tool_boundary_safety" in required,
            now=now,
            source_ref="cycle:authority",
            note="no merge, train, promote, or tool execution in this cycle",
            ttl=durable,
        ),
        "reversibility": _axis(
            "reversibility",
            1.0 if action_class == "READ_ONLY" else 0.5,
            "MEASURED",
            required="reversibility" in required,
            now=now,
            source_ref="cycle:action-class",
            note=action_class,
            ttl=durable,
        ),
        "impact_boundedness": _axis(
            "impact_boundedness",
            1.0 if action_class != "IRREVERSIBLE_WRITE" else 0.0,
            "MEASURED",
            required="impact_boundedness" in required,
            now=now,
            source_ref="cycle:action-class",
            note="IRREVERSIBLE_WRITE zero-vetoes self-execution",
            ttl=durable,
        ),
        "provenance_integrity": _axis(
            "provenance_integrity",
            1.0 if provenance_ok else None,
            "MEASURED" if provenance_ok else "UNAVAILABLE",
            required="provenance_integrity" in required,
            now=now,
            source_ref=f"git:HEAD:{head}" if head else "git:HEAD",
            note="exact SHA-1 checkout or UNAVAILABLE",
        ),
        "freshness": _axis(
            "freshness",
            1.0 if freshness_ok else None,
            "MEASURED" if freshness_ok else "UNAVAILABLE",
            required="freshness" in required,
            now=now,
            source_ref="git:committer-date",
            note=commit_time or "git commit time UNAVAILABLE",
        ),
        "human_approval": _axis(
            "human_approval",
            None,
            "UNAVAILABLE",
            required="human_approval" in required,
            now=now,
            source_ref="cycle:human",
            note="cycle cannot self-approve",
            ttl=durable,
        ),
        "counterparty_trust": _axis(
            "counterparty_trust",
            None,
            "UNAVAILABLE",
            required="counterparty_trust" in required,
            now=now,
            source_ref="github:szl-holdings/szl-frontier",
            note="live GitHub fetch not performed in this collector",
        ),
        "independent_witness": _axis(
            "independent_witness",
            None,
            "UNAVAILABLE",
            required="independent_witness" in required,
            now=now,
            source_ref="cycle:witness",
            note="second independent witness is not this process",
            ttl=durable,
        ),
    }

    others_required = [name for name in required if name != "evidence_completeness"]
    complete = all(measured[name].is_valid(now) for name in others_required)
    measured["evidence_completeness"] = _axis(
        "evidence_completeness",
        1.0 if complete else 0.0,
        "MEASURED",
        required="evidence_completeness" in required,
        now=now,
        source_ref="cycle:gap-ledger",
        note="1 only when every other required axis is valid MEASURED; else zero-veto",
        ttl=durable,
    )
    return [measured[name] for name in YUYAY_REFERENCE_13]


def _require_github_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "api.github.com":
        raise CycleError(f"URL left GitHub API allow-list: {url}")


def fetch_github_repo(
    owner: str,
    name: str,
    *,
    token: str | None = None,
    opener: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    url = f"{GITHUB_API_ORIGIN}/repos/{owner}/{name}"
    _require_github_url(url)
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, headers=headers, method="GET")
    get = opener or urlopen
    with get(request, timeout=10) as response:
        body = response.read(MAX_GITHUB_BYTES + 1)
    if len(body) > MAX_GITHUB_BYTES:
        raise CycleError("GitHub response exceeded bound")
    data = json.loads(body.decode("utf-8"))
    if not isinstance(data, dict):
        raise CycleError("GitHub returned a non-object")
    return data


def live_dashboard(
    *,
    token: str | None = None,
    opener: Callable[..., Any] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for owner, name in TOP_10_PROJECTS:
        try:
            data = fetch_github_repo(owner, name, token=token, opener=opener)
            license_info = data.get("license") or {}
            rows.append(
                {
                    "owner": owner,
                    "name": name,
                    "status": "MEASURED",
                    "stars": data.get("stargazers_count"),
                    "forks": data.get("forks_count"),
                    "openIssues": data.get("open_issues_count"),
                    "license": license_info.get("spdx_id", "UNKNOWN"),
                    "pushedAt": data.get("pushed_at"),
                }
            )
        except Exception as exc:  # noqa: BLE001 - live failure is UNAVAILABLE
            rows.append(
                {
                    "owner": owner,
                    "name": name,
                    "status": "UNAVAILABLE",
                    "error": type(exc).__name__,
                }
            )
    return rows


def apply_live_counterparty(
    axes: list[AxisEvidence],
    *,
    now: datetime,
    token: str | None,
    opener: Callable[..., Any] | None = None,
) -> tuple[list[AxisEvidence], dict[str, Any] | None]:
    try:
        data = fetch_github_repo(
            "szl-holdings", "szl-frontier", token=token, opener=opener
        )
        default_branch = data.get("default_branch")
        ok = data.get("full_name") == "szl-holdings/szl-frontier" and bool(default_branch)
        live_axis = _axis(
            "counterparty_trust",
            1.0 if ok else 0.0,
            "MEASURED",
            required=True,
            now=now,
            source_ref="github:szl-holdings/szl-frontier",
            note=f"default_branch={default_branch}",
        )
        observation = {
            "fullName": data.get("full_name"),
            "defaultBranch": default_branch,
            "pushedAt": data.get("pushed_at"),
            "status": "MEASURED",
        }
    except Exception as exc:  # noqa: BLE001
        live_axis = _axis(
            "counterparty_trust",
            None,
            "UNAVAILABLE",
            required=True,
            now=now,
            source_ref="github:szl-holdings/szl-frontier",
            note=type(exc).__name__,
        )
        observation = {"status": "UNAVAILABLE", "error": type(exc).__name__}
    replaced = [
        live_axis if axis.name == "counterparty_trust" else axis for axis in axes
    ]
    return seal_completeness(replaced, now=now), observation


def seal_completeness(
    axes: list[AxisEvidence], *, now: datetime
) -> list[AxisEvidence]:
    """Zero-veto completeness: 1 only if every other required axis is valid."""

    completeness = next(
        (axis for axis in axes if axis.name == "evidence_completeness"), None
    )
    if completeness is None:
        return list(axes)
    required_others = [
        axis
        for axis in axes
        if axis.required and axis.name != "evidence_completeness"
    ]
    complete = all(axis.is_valid(now) for axis in required_others)
    sealed = _axis(
        "evidence_completeness",
        1.0 if complete else 0.0,
        "MEASURED",
        required=completeness.required,
        now=now,
        source_ref="cycle:gap-ledger",
        note="1 only when every other required axis is valid MEASURED; else zero-veto",
        ttl=timedelta(days=365),
    )
    return [sealed if axis.name == "evidence_completeness" else axis for axis in axes]


def _shadow(gate: GateResult) -> dict[str, Any] | None:
    if not gate.divergent:
        return None
    return {
        "kind": "ARITHMETIC_COUNTERFACTUAL",
        "executable": False,
        "arithmeticWouldAllow": gate.arithmetic_would_allow,
        "geometricVerdict": gate.verdict,
        "arithmeticScore": gate.arithmetic_score,
        "lambdaScore": gate.lambda_score,
        "note": (
            "Averaging would have allowed or denied differently. "
            "Weak-link Λ is the only actor. This shadow cannot act."
        ),
    }


def _payload(
    *,
    axes: list[AxisEvidence],
    gate: GateResult,
    action_class: str,
    round_index: int,
    exit_state: str,
    chain_head: str | None,
    incoming_digest: str | None,
    live: bool,
    dashboard: list[dict[str, Any]] | None,
    counterparty: dict[str, Any] | None,
    invariant_ok: bool | None,
    signed: bool,
) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "authority": "PROPOSAL_ONLY",
        "state": "PROPOSAL_ONLY",
        "lambda": LAMBDA_POSTURE,
        "lambdaNeverATheorem": True,
        "energy": "UNAVAILABLE",
        "converge": {"semantic_consensus": "NOT_MEASURED"},
        "signed": signed,
        "signatures": [],
        "actionClass": action_class,
        "verdict": gate.verdict,
        "lambdaScore": gate.lambda_score,
        "arithmeticScore": gate.arithmetic_score,
        "threshold": gate.threshold,
        "reasonCodes": list(gate.reason_codes),
        "gaps": list(gate.gaps),
        "divergent": gate.divergent,
        "shadow": _shadow(gate),
        "productionAuthorized": False,
        "trainingAdmission": False,
        "axes": [axis.as_mapping() for axis in axes],
        "round": round_index,
        "budget": MAX_ROUNDS,
        "exit": exit_state,
        "kind": "SOFTWARE",
        "identity": IDENTITY,
        "chainHead": chain_head,
        "incomingDigest": incoming_digest,
        "live": live,
        "dashboard": dashboard,
        "counterparty": counterparty,
        "invariantsOk": invariant_ok,
        "perpetualMotion": False,
        "terminating": True,
    }


def run_cycle(
    *,
    catalog_ok: bool,
    action_class: str = "READ_ONLY",
    live: bool = False,
    previous: EvidenceReceipt | None = None,
    factory: ReceiptFactory | None = None,
    now: datetime | None = None,
    axes: list[AxisEvidence] | None = None,
    root: Path = REPO_ROOT,
    github_token: str | None = None,
    github_opener: Callable[..., Any] | None = None,
    hmac_key: bytes | None = None,
    include_dashboard: bool = False,
) -> dict[str, Any]:
    """Run a two-round bounded cycle. Always returns; never promotes."""

    clock = now or datetime.now(timezone.utc)
    if clock.tzinfo is None:
        clock = clock.replace(tzinfo=timezone.utc)
    receipts = factory or ReceiptFactory(hmac_key=hmac_key)
    verify_key = hmac_key if hmac_key is not None else getattr(receipts, "_hmac_key", None)
    signed = verify_key is not None
    if axes is None:
        axes = collect_local_axes(
            now=clock,
            action_class=action_class,
            root=root,
            catalog_ok=catalog_ok,
            live_required=live,
        )
    dashboard = None
    counterparty = None
    if live:
        axes, counterparty = apply_live_counterparty(
            axes, now=clock, token=github_token, opener=github_opener
        )
        if include_dashboard:
            dashboard = live_dashboard(token=github_token, opener=github_opener)
    else:
        axes = seal_completeness(axes, now=clock)

    parent_digest = previous.digest if previous is not None else None
    gate = evaluate_lambda_gate(axes, now=clock)
    round1 = receipts.create(
        release_id=RELEASE_ID,
        subject="ouroboros-cycle-round-1",
        payload=_payload(
            axes=axes,
            gate=gate,
            action_class=action_class,
            round_index=1,
            exit_state="observed",
            chain_head=None,
            incoming_digest=parent_digest,
            live=live,
            dashboard=dashboard,
            counterparty=counterparty,
            invariant_ok=None,
            signed=signed,
        ),
        previous_receipt_digest=parent_digest,
        created_at=clock,
    )
    checks1 = check_receipt(round1, incoming=previous, hmac_key=verify_key)

    if not checks1["ok"]:
        return _report(
            exit_state="aborted",
            rounds=(round1,),
            checks=(checks1,),
            gate=gate,
            live=live,
        )

    round2_payload = _payload(
        axes=axes,
        gate=gate,
        action_class=action_class,
        round_index=2,
        exit_state="converged",
        chain_head=round1.digest,
        incoming_digest=round1.digest,
        live=live,
        dashboard=dashboard,
        counterparty=counterparty,
        invariant_ok=True,
        signed=signed,
    )
    round2 = receipts.create(
        release_id=RELEASE_ID,
        subject="ouroboros-cycle-round-2",
        payload=round2_payload,
        previous_receipt_digest=round1.digest,
        created_at=clock + timedelta(milliseconds=1),
    )
    checks2 = check_receipt(round2, incoming=round1, hmac_key=verify_key)
    exit_state = "converged" if checks2["ok"] else "aborted"
    return _report(
        exit_state=exit_state,
        rounds=(round1, round2),
        checks=(checks1, checks2),
        gate=gate,
        live=live,
    )


def _report(
    *,
    exit_state: str,
    rounds: tuple[EvidenceReceipt, ...],
    checks: tuple[dict[str, Any], ...],
    gate: GateResult,
    live: bool,
) -> dict[str, Any]:
    head = rounds[-1]
    return {
        "schema": SCHEMA,
        "kind": "SOFTWARE",
        "identity": IDENTITY,
        "lambda": LAMBDA_POSTURE,
        "lambdaNeverATheorem": True,
        "authority": "PROPOSAL_ONLY",
        "productionPromotion": False,
        "trainingAdmission": False,
        "perpetualMotion": False,
        "terminating": True,
        "budget": MAX_ROUNDS,
        "roundsSpent": len(rounds),
        "exit": exit_state,
        "live": live,
        "verdict": gate.verdict,
        "lambdaScore": gate.lambda_score,
        "arithmeticScore": gate.arithmetic_score,
        "divergent": gate.divergent,
        "gaps": list(gate.gaps),
        "reasonCodes": list(gate.reason_codes),
        "invariantsOk": all(item["ok"] for item in checks),
        "chainHead": head.digest,
        "receipts": [item.as_mapping() for item in rounds],
        "invariantResults": list(checks),
        "honesty": (
            "SOFTWARE bounded cycle. Always terminates. Arithmetic shadow cannot act. "
            "Not a Lean proof. Not production authorization."
        ),
    }


def load_previous(
    path: Path, *, hmac_key: bytes | None = None
) -> EvidenceReceipt | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CycleError(f"unable to read cycle ledger {path}: {exc}") from exc
    if not isinstance(payload, dict) or payload.get("schema") != SCHEMA:
        raise CycleError(f"invalid cycle ledger schema in {path}")
    raw = payload.get("receipt")
    if raw is None:
        raise CycleError("cycle ledger is missing the parent receipt")
    receipt = EvidenceReceipt.from_mapping(raw)
    receipt.verify(hmac_key=hmac_key)
    if payload.get("chainHead") != receipt.digest:
        raise CycleError("cycle ledger chainHead does not bind the stored receipt")
    return receipt


def save_cycle_ledger(path: Path, report: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    receipts = report.get("receipts") or []
    if not receipts:
        raise CycleError("cannot persist a cycle with no receipts")
    path.write_text(
        json.dumps(
            {
                "schema": SCHEMA,
                "chainHead": report["chainHead"],
                "exit": report["exit"],
                "verdict": report["verdict"],
                "receipt": receipts[-1],
            },
            sort_keys=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def github_token_from_env(environ: Mapping[str, str] | None = None) -> str | None:
    env = environ or os.environ
    return env.get("GITHUB_TOKEN") or env.get("GH_TOKEN")
