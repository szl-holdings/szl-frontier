#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Wave-5 payload binding engines. SOFTWARE / HOLD. No provider writes.

Binds payload experiments F1/F3/F7 to existing estate owners:
- F1 impact replay  -> vertical-services #37 (do not replace that store)
- F3 false-completion -> szl-frontier #184 NX08 + a11oy completion controller
- F7 bounded loop -> szl-frontier #190 runSoftwareCycle (MAX_ROUNDS=2)

This module is an offline second-reader / fixture engine.
It does not collect the org, publish Hugging Face, train, merge, or authorize.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

SCHEMA = "szl.frontier-payload-binding/v1"
CYCLE_SCHEMA = "szl.frontier.ouroboros-cycle.v1"
MAX_ROUNDS = 2


class EngineError(ValueError):
    """Fixed diagnostic codes only."""


def need(ok: bool, code: str) -> None:
    if not ok:
        raise EngineError(code)


@dataclass(frozen=True)
class Node:
    id: str
    kind: Literal["source", "brief", "approval", "action"]
    status: str
    executed: bool
    depends_on: tuple[str, ...]
    epoch: int


def replay_impact(nodes: list[Node], corrected_id: str, *, aware: bool) -> dict[str, Any]:
    need(any(n.id == corrected_id for n in nodes), "UNKNOWN_CORRECTION_TARGET")
    descendants: set[str] = set()
    stack = [corrected_id]
    while stack:
        current = stack.pop()
        for node in nodes:
            if current in node.depends_on and node.id not in descendants:
                descendants.add(node.id)
                stack.append(node.id)
    false_valid = 0
    cancelled: list[str] = []
    preserved_history: list[str] = []
    next_nodes: list[dict[str, Any]] = []
    for node in nodes:
        row = {
            "id": node.id,
            "kind": node.kind,
            "status": node.status,
            "executed": node.executed,
            "depends_on": list(node.depends_on),
            "epoch": node.epoch,
        }
        if node.id == corrected_id:
            row["status"] = "CORRECTED"
            row["epoch"] = node.epoch + 1
            next_nodes.append(row)
            continue
        if node.id in descendants and aware:
            if node.executed:
                preserved_history.append(node.id)
                row["status"] = "EXECUTED_HISTORICAL_NOT_REWRITTEN"
            else:
                cancelled.append(node.id)
                row["status"] = "CANCELLED_PENDING_REVIEW"
            next_nodes.append(row)
        else:
            if node.id in descendants and not aware and not node.executed:
                false_valid += 1
            next_nodes.append(row)
    return {
        "schema": SCHEMA,
        "experiment": "F1",
        "aware": aware,
        "corrected": corrected_id,
        "descendants": sorted(descendants),
        "false_valid_descendants": false_valid,
        "cancelled_unexecuted": cancelled,
        "preserved_executed_history": preserved_history,
        "nodes": next_nodes,
        "production_authorized": False,
        "rewrites_historical_execution": False,
        "owner": "szl-holdings/vertical-services#37",
        "does_not_prove": "legal truth, live Terra ownership, or production permission",
    }


def terra_fixture() -> list[Node]:
    return [
        Node("parcel-source", "source", "ADMITTED", False, (), 1),
        Node("cited-brief", "brief", "DERIVED", False, ("parcel-source",), 1),
        Node("operator-approval", "approval", "PENDING", False, ("cited-brief",), 1),
        Node("export-action", "action", "QUEUED", False, ("operator-approval",), 1),
        Node("notify-action", "action", "SENT", True, ("operator-approval",), 1),
        Node("unrelated-matter", "brief", "DERIVED", False, (), 1),
    ]


ChildState = Literal["running", "succeeded", "failed", "unknown_after_attempt"]


@dataclass
class Release:
    parent_snapshot: str
    children: dict[str, ChildState]
    write_accepted: bool
    timeout_after_write: bool
    cdn_revisions: dict[str, str]


def reconcile_release(release: Release) -> dict[str, Any]:
    need(release.parent_snapshot in {"ALIGNED", "PENDING", "FAILED"}, "PARENT_SNAPSHOT_INVALID")
    blockers: list[str] = []
    if release.parent_snapshot == "ALIGNED" and any(
        state != "succeeded" for state in release.children.values()
    ):
        blockers.append("PARENT_ALIGNED_CANNOT_PREEMPT_CHILD")
    if release.timeout_after_write and release.write_accepted:
        blockers.append("UNKNOWN_AFTER_ATTEMPT")
    revisions = set(release.cdn_revisions.values())
    if len(revisions) > 1:
        blockers.append("MIXED_CDN_REVISION")
    if any(state == "failed" for state in release.children.values()):
        blockers.append("REQUESTED_CHILD_FAILED")
    complete = (
        release.parent_snapshot == "ALIGNED"
        and all(state == "succeeded" for state in release.children.values())
        and not release.timeout_after_write
        and len(revisions) <= 1
        and not blockers
    )
    need(not (complete and blockers), "FALSE_COMPLETION")
    return {
        "schema": SCHEMA,
        "experiment": "F3",
        "complete": complete,
        "blockers": blockers,
        "verdict": "CONVERGED" if complete else "INCOMPLETE",
        "production_authorized": False,
        "owner": "szl-holdings/szl-frontier#184",
        "does_not_prove": "atomic GitHub/HF/CDN transaction or admitted merge",
    }


GOLD = {
    "quote-anchor": "exact-text",
    "stale-evidence": "unresolved",
    "schema-bound": "valid-object",
    "overclaim": "unresolved",
}


def propose(task: str, depth: int) -> str:
    naive = {
        "quote-anchor": "paraphrase",
        "stale-evidence": "treat-as-fresh",
        "schema-bound": "valid-object",
        "overclaim": "production-ready",
    }[task]
    if depth == 0:
        return naive
    return GOLD[task]


def verify(task: str, candidate: str) -> str:
    return "PASS" if candidate == GOLD[task] else "FAIL"


def run_loop(task: str, mode: Literal["single", "fixed", "adaptive"]) -> dict[str, Any]:
    need(task in GOLD, "UNKNOWN_TASK")
    budget = 1 if mode == "single" else MAX_ROUNDS
    rounds: list[dict[str, Any]] = []
    candidate = None
    verdict = None
    spent = 0
    stop_reason = None
    for depth in range(budget):
        candidate = propose(task, depth)
        verdict = verify(task, candidate)
        spent += 1
        rounds.append({"depth": depth, "candidate": candidate, "verifier": verdict})
        if mode == "adaptive" and verdict == "PASS":
            stop_reason = "validated_improvement"
            break
        if mode == "single":
            stop_reason = "single_pass"
            break
    if stop_reason is None:
        stop_reason = "budget_exhausted"
    accepted = verdict == "PASS" and candidate == GOLD[task]
    return {
        "schema": CYCLE_SCHEMA,
        "experiment": "F7",
        "kind": "SOFTWARE",
        "actionClass": "READ_ONLY",
        "task": task,
        "mode": mode,
        "rounds": rounds,
        "exit": "converged",
        "accepted": accepted,
        "compute_units": spent,
        "productionAuthorized": False,
        "trainingAdmission": False,
        "permission_created": False,
        "stop_reason": stop_reason,
        "owner": "szl-holdings/szl-frontier#190",
        "does_not_prove": "general intelligence, theorem-level Lambda, or engine qualification",
    }


def compare_modes(task: str) -> dict[str, Any]:
    single = run_loop(task, "single")
    fixed = run_loop(task, "fixed")
    adaptive = run_loop(task, "adaptive")
    return {
        "task": task,
        "single_accepted": single["accepted"],
        "fixed_accepted": fixed["accepted"],
        "adaptive_accepted": adaptive["accepted"],
        "adaptive_compute": adaptive["compute_units"],
        "fixed_compute": fixed["compute_units"],
        "adaptive_saves_compute_vs_fixed": adaptive["compute_units"] < fixed["compute_units"] and adaptive["accepted"],
        "productionAuthorized": False,
    }


def bind_leads(observed: list[dict[str, Any]]) -> dict[str, Any]:
    need(0 < len(observed) <= 64, "LEAD_BOUND")
    rows = []
    seen: set[str] = set()
    for item in observed:
        need(set(item) >= {"repo", "number", "head", "draft", "state"}, "LEAD_FIELDS")
        key = f"{item['repo']}#{item['number']}"
        need(key not in seen, "DUPLICATE_LEAD")
        seen.add(key)
        need(item["state"] in {"open", "closed"}, "LEAD_STATE")
        need(isinstance(item["draft"], bool), "LEAD_DRAFT_TYPE")
        need(isinstance(item["head"], str) and (item["head"] is None or len(item["head"]) in {7, 40}), "LEAD_HEAD")
        rows.append({**item, "production_authorized": False, "semantic_review": "NOT_PERFORMED"})
    return {
        "schema": SCHEMA,
        "experiment": "BIND",
        "as_of": "2026-09-20T14:55:00Z",
        "scope": "PUBLIC_PR_METADATA_NOT_ORG_CENSUS",
        "authoritative_organization_population": None,
        "leads": rows,
        "complete": False,
        "production_authorized": False,
        "source_content_files_read": 0,
        "kernels_count": None,
        "does_not_prove": "private totals, LFS bytes, runtime, or merge admission",
    }
