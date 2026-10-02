#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""SZL Holdings thread auditor — one Python payload for Grok in terminal.

Paste into a terminal:

    python3 szl_thread_audit_payload.py
    python3 szl_thread_audit_payload.py --json
    python3 szl_thread_audit_payload.py --brief

This file is the payload. It does not train, merge, push, scrape weights,
mint a flagship, or authorize production. Public membership counts below are
a frozen observation snapshot. UNKNOWN is not 0. files_read stays 0.
Promotion cannot lift HOLD.

Grok terminal contract:
  Read this whole file. Audit the encoded thread. Refuse overclaims.
  Do not invent szl-frontier-2. Do not merge protected main.
  Optional evaluation stays opt-in. Envelope authority is NONE.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from typing import Any

SCHEMA = "szl.frontier.thread-audit-payload/v1"
ISSUED_AT = "2026-10-02T16:20:00Z"
ORGAN = "szl-holdings/szl-frontier"
HF_ORG = "SZLHOLDINGS"
MAX_JSON = 8 * 1024 * 1024

HOLD = {
    "productionAuthorization": False,
    "promotionEffect": "NONE",
    "lambda": "CONJECTURE_1",
    "trainingAdmission": False,
    "paidWorkloadBudgetUsd": 0,
    "fileAuditComplete": False,
    "sourceContentFilesRead": 0,
    "semanticReviewComplete": False,
    "runtimeVerified": False,
    "envelopeAuthority": "NONE",
    "mergeProtectedMain": False,
    "recreateFlagship": False,
    "optionalEvaluation": True,
    "optionalEvaluationLiftsHold": False,
}

INVARIANTS = (
    "UNKNOWN != 0",
    "health != ready != source",
    "kernels != models",
    "RUNNING != runtime-verified",
    "membership != qualification",
    "membership != tree != content != qualification",
    "envelope authority NONE",
    "optional evaluation does not lift HOLD",
    "promotion cannot lift HOLD",
    "no second flagship",
    "no training",
    "draft PRs only unless a human explicitly merges",
    "file_audit_complete is forbidden when files_read=0",
    "isolated worktrees / draft PRs only",
)

CONTRACTS = (
    "szl.frontier.health/v1",
    "szl.frontier.readiness/v1",
    "szl.frontier.source-identity/v1",
    "szl.frontier.triad/v1",
    "szl.frontier.head-sha-pin/v1",
    "szl.frontier.membership-identity-pin/v1",
    "szl.frontier.receipt-envelope/v1",
    "szl.frontier.estate-observation/v1",
    "szl.frontier.codex-upgrade-program/v1",
    "szl.frontier.honesty-layers/v1",
    "szl.frontier.optional-evaluation/v1",
    "szl.frontier.space-triad-contract/v1",
)

APIS = (
    "/api/health",
    "/api/ready",
    "/api/source",
    "/api/triad",
    "/api/pin",
    "/api/codex",
    "/api/estate",
    "/api/cycle",
    "/api/workstreams",
    "/api/agent-state",
    "/api/kernels",
    "/api/leases",
)

TABS = (
    "workstreams",
    "cycle",
    "estate",
    "triad",
    "pin",
    "kernels",
    "leases",
    "codex",
    "journeys",
    "lab",
)

THIS_ORGAN = (
    "FE-03",
    "FE-06",
    "DR-01",
    "DR-03",
    "DR-05",
    "DR-06",
    "DR-07",
    "DR-08",
    "DR-10",
)

# Public membership observation only. Not a file audit. Not qualification.
# Snapshot from the 2026-09 estate census. Do not rewrite UNKNOWN to 0.
CENSUS = {
    "schema": "szl.frontier.estate-observation/v1",
    "observedAt": "2026-09-20",
    "kind": "PUBLIC_MEMBERSHIP_SNAPSHOT",
    "githubOrg": "szl-holdings",
    "hfOrg": HF_ORG,
    "counts": {
        "githubRepos": 117,
        "hfModels": 47,
        "hfDatasets": 35,
        "hfSpaces": 21,
        "hfKernels": 14,
    },
    "unknownIsNotZero": True,
    "filesRead": 0,
    "fileAuditComplete": False,
    "qualification": "HOLD",
    "note": "Membership observed. Tree, content, and qualification were not completed.",
}

SURFACES = (
    "SZLHOLDINGS/a11oy",
    "SZLHOLDINGS/killinchu",
    "SZLHOLDINGS/counsel",
    "SZLHOLDINGS/terra",
    "SZLHOLDINGS/sentra",
    "SZLHOLDINGS/finance",
    "SZLHOLDINGS/lyte",
    "SZLHOLDINGS/vertical-services",
    "SZLHOLDINGS/szl-command-lab",
    "SZLHOLDINGS/david-leads",
    "SZLHOLDINGS/szl-constellation",
    "SZLHOLDINGS/szl-frontier",
    "SZLHOLDINGS/szl-model-inference-lab",
    "SZLHOLDINGS/immune-lattice",
    "SZLHOLDINGS/immune",
    "SZLHOLDINGS/ayllu",
    "SZLHOLDINGS/yarqa",
    "SZLHOLDINGS/szl-atelier",
    "SZLHOLDINGS/holographic-unify",
    "SZLHOLDINGS/szl-khipu",
    "SZLHOLDINGS/llm-router-live",
)

LIVE = {
    "source": "https://github.com/szl-holdings/szl-frontier",
    "space": "https://huggingface.co/spaces/SZLHOLDINGS/szl-frontier",
    "direct": "https://szlholdings-szl-frontier.hf.space",
    "covenant": "https://huggingface.co/datasets/SZLHOLDINGS/szl-frontier-covenant",
    "brain": "https://github.com/szl-holdings/szl-second-brain",
    "productOrigin": "https://a-11-oy.com",
    "proofRegistry": "https://a11oy.net",
    "tag": "https://github.com/szl-holdings/szl-frontier/releases/tag/v0.4.0",
    "draftPr": "https://github.com/szl-holdings/szl-frontier/pull/196",
}

# Historical verify, not a claim that main is still this SHA.
HISTORICAL_MAIN = {
    "sha": "9042439",
    "note": "fix(frontier): fail closed on complete source coverage (#8). Later main moved. Do not treat this as current HEAD.",
}

TURNS = (
    {
        "id": "T01",
        "ask": "Comprehensively audit the thread, GitHub org szl-holdings repo by repo and file by file, and Hugging Face SZLHOLDINGS models, spaces, verticals, kernels, datasets. Produce 1 MD + Python Codex payload upgrading frontend and backend of every ecosystem piece. Push the frontier.",
        "disposition": "PARTIAL",
        "did": "Public membership census encoded. Codex program of 26 lanes. Fail-closed Python second-reader. File-by-file audit not claimed.",
        "miss": "files_read=0. Per-repo file audit remains OPEN. UNKNOWN stays UNKNOWN.",
    },
    {
        "id": "T02",
        "ask": "Handle all recommendations and upgrades. Push the frontier.",
        "disposition": "PARTIAL",
        "did": "THIS_ORGAN lanes admitted as optional evaluation under HOLD. HANDOFF lanes named, not executed here.",
        "miss": "HANDOFF owners were not upgraded in place by this organ.",
    },
    {
        "id": "T03",
        "ask": "Handle all of the above. You are the CTO.",
        "disposition": "PARTIAL",
        "did": "CTO closeout 2026-09-25. Draft PR #196. Doctrine kept. No production authorization.",
        "miss": "CTO role does not lift HOLD.",
    },
    {
        "id": "T04",
        "ask": "Figure it out and push the barriers. Make me proud.",
        "disposition": "PARTIAL",
        "did": "Operator plane, triad, pin, receipt envelope, honesty layers, optional-eval gate.",
        "miss": "Dream lanes that mint new flagships refused.",
    },
    {
        "id": "T05",
        "ask": "Do all of the above. Make it optional. Push the frontier and upgrade everything.",
        "disposition": "PARTIAL",
        "did": "optional-eval localStorage switch. evaluate=1 API gate. productionAuthorization smuggle ignored.",
        "miss": "Upgrade-everything cannot include HANDOFF mutation or protected-main merge.",
    },
    {
        "id": "T06",
        "ask": "Handle all PRs and merges.",
        "disposition": "REFUSED_AUTO_MERGE",
        "did": "Draft #196 opened. #190/#193/#194/#185/#186/#187/#195 recorded as already on main before the closeout. Those merges do not lift HOLD.",
        "miss": "Protected main merge of #196 not executed. mergeable_state was blocked.",
    },
    {
        "id": "T07",
        "ask": "Keep pushing the frontier. Finish this off.",
        "disposition": "PARTIAL",
        "did": "eval-panels, honesty contract, package.json test union landed on draft #196.",
        "miss": "frontier.tsx 10-tab wiring was still a local 63-line diff at closeout.",
    },
    {
        "id": "T08",
        "ask": "Give a PowerShell 5.1 admin block for the whole thread.",
        "disposition": "DELIVERED",
        "did": "SZL-Frontier-Thread-Closer-5.1.ps1. Census, idempotent frontier.tsx patch, contract tests, draft push only.",
        "miss": "Script prints a merge command. It does not execute it.",
    },
    {
        "id": "T09",
        "ask": "Give the block in chat.",
        "disposition": "DELIVERED",
        "did": "Full 5.1 script pasted. HOLD banner. Both merge switches still refuse automatic merge.",
        "miss": "None on delivery. Merge still human-only.",
    },
    {
        "id": "T10",
        "ask": "Python payload for Grok in terminal, in code in chat, one large payload, audit the whole thread, miss nothing.",
        "disposition": "THIS_PAYLOAD",
        "did": "This file. Self-audit fails closed if a required turn, lane, workstream, contract, PR, or gap is absent.",
        "miss": "Live re-probe of GitHub/HF is not this payload. Snapshot stays labeled.",
    },
)

PRS = (
    {
        "number": 185,
        "role": "watch/fix class",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 186,
        "role": "watch/fix class",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 187,
        "role": "watch/fix class",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 190,
        "role": "operator plane",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 193,
        "role": "triad / receipt envelope",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 194,
        "role": "evaluation stack absorbed via operator-plane then main",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "baseNote": "operator-plane, not a second flagship",
        "liftsHold": False,
    },
    {
        "number": 195,
        "role": "watch/fix class",
        "state": "ON_MAIN_BEFORE_CLOSEOUT",
        "liftsHold": False,
    },
    {
        "number": 196,
        "role": "optional-eval UI draft",
        "state": "DRAFT",
        "branch": "frontier/optional-eval-ui-tabs-20260925",
        "base": "main",
        "baseShaAtOpen": "9f45fea",
        "headAtComment": "a03ae47",
        "mergeableState": "blocked",
        "commits": (
            "8f67af6 honestyContract + estate-pin/codex-program tests",
            "ceb2ea9 package.json test union",
            "a03ae47 eval-panels.tsx HoldStrip + triad/pin/codex",
        ),
        "liftsHold": False,
        "url": LIVE["draftPr"],
    },
)

LANES = (
    {"id": "FE-01", "plane": "frontend", "title": "a11oy product UI inside flagship", "owners": ["szl-holdings/a11oy"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not clone a11oy or mint a second flagship."},
    {"id": "FE-02", "plane": "frontend", "title": "a11oy-net proof origin", "owners": ["szl-holdings/a11oy-net"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not turn proof into runtime authority."},
    {"id": "FE-03", "plane": "frontend", "title": "szl-frontier operator plane", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Do not promote HOLD. Do not recreate a11oy."},
    {"id": "FE-04", "plane": "frontend", "title": "szl-brand token river", "owners": ["szl-holdings/szl-brand"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not stand up a new site."},
    {"id": "FE-05", "plane": "frontend", "title": "Hologram TS surfaces", "owners": ["szl-holdings/holographic-unify", "szl-holdings/immune", "szl-holdings/lyte-lattice", "szl-holdings/szl-command-lab"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Not a flagship. Not a product certificate."},
    {"id": "FE-06", "plane": "frontend", "title": "HF Spaces frontends", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "RUNNING != runtime-verified. Do not mutate Space repos from this organ."},
    {"id": "FE-07", "plane": "frontend", "title": "Exhibit surfaces", "owners": ["szl-holdings/anatomy", "szl-holdings/the-grid", "szl-holdings/sda"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Not product certificates."},
    {"id": "FE-08", "plane": "frontend", "title": "Archived docs holograms", "owners": ["szl-holdings/szl-frontier"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Archive is not a live product."},
    {"id": "BE-01", "plane": "backend", "title": "a11oy product backend", "owners": ["szl-holdings/a11oy"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not fork the product backend into this organ."},
    {"id": "BE-02", "plane": "backend", "title": "szl-serve profiles", "owners": ["szl-holdings/szl-serve"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not authorize serving from an evaluation note."},
    {"id": "BE-03", "plane": "backend", "title": "szl-router receipts", "owners": ["szl-holdings/szl-router"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Receipts are not production authorization."},
    {"id": "BE-04", "plane": "backend", "title": "szl-forge eval only", "owners": ["szl-holdings/szl-forge"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "No training admission."},
    {"id": "BE-05", "plane": "backend", "title": "Shared substrate", "owners": ["szl-holdings/szl-frontier"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not collapse organs into one backend."},
    {"id": "BE-06", "plane": "backend", "title": "MCP + governance", "owners": ["szl-holdings/szl-frontier"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Governance text is not an ATO."},
    {"id": "BE-07", "plane": "backend", "title": "Vertical FastAPI", "owners": ["szl-holdings/vertical-services"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Verticals cannot mint flagships."},
    {"id": "BE-08", "plane": "backend", "title": "Receipt primitives", "owners": ["szl-holdings/szl-frontier"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Envelope authority stays NONE."},
    {"id": "DR-01", "plane": "dream", "title": "Receipt-carrying UI schema", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "A schema is not a sealed live receipt."},
    {"id": "DR-02", "plane": "dream", "title": "Cross-organ design tokens", "owners": ["szl-holdings/szl-brand"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not mint a token site."},
    {"id": "DR-03", "plane": "dream", "title": "Space triad on every Space", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Contract inventory is not a live probe."},
    {"id": "DR-04", "plane": "dream", "title": "Governed inference receipts", "owners": ["szl-holdings/szl-router"], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not claim FedRAMP or ATO."},
    {"id": "DR-05", "plane": "dream", "title": "Memory covenant only memory plane", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Private 9464-node graph stays unpublished. 0 admitted to gradients."},
    {"id": "DR-06", "plane": "dream", "title": "Kernel family live membership", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Kernels are not models. UNKNOWN family count stays null."},
    {"id": "DR-07", "plane": "dream", "title": "Estate pin heartbeat", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Pin is identity, not qualification."},
    {"id": "DR-08", "plane": "dream", "title": "Four-layer honesty surface", "owners": [ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Do not display UNKNOWN as 0."},
    {"id": "DR-09", "plane": "dream", "title": "Verticals cannot mint flagships", "owners": ["szl-holdings/a11oy", ORGAN], "scope": "HANDOFF", "status": "HOLD", "forbidden": "Do not unify all frontends into one app."},
    {"id": "DR-10", "plane": "dream", "title": "Lambda remains Conjecture 1", "owners": ["szl-holdings/lutar-lean", ORGAN], "scope": "THIS_ORGAN", "status": "ADMITTED_EVALUATION", "forbidden": "Geometric mean 0.97 is shadow only. Promotion cannot lift HOLD."},
)

WORKSTREAMS = (
    ("F01", "Edge0 exact-route expert prefetch", "runtime", "ADMITTED_EVALUATION"),
    ("F02", "Spark-X2.5 context-budget ladder", "runtime", "WATCH"),
    ("F03", "Bonsai packing + runtime", "model", "HOLD"),
    ("F04", "DeepSeek / DSpark serving boundary", "serving", "ADMITTED_EVALUATION"),
    ("F05", "Tencent SAS approximate attention", "runtime", "WATCH"),
    ("F06", "Granite / Lyte forecast uncertainty", "eval", "ADMITTED_EVALUATION"),
    ("F07", "Per-tensor GGUF canaries", "quantization", "ADMITTED_EVALUATION"),
    ("F08", "AutoRound export provenance", "quantization", "WATCH"),
    ("F09", "Kernel Hub typed revisions", "runtime", "ADMITTED_EVALUATION"),
    ("F10", "Compact baselines", "model", "ADMITTED_EVALUATION"),
    ("F11", "Nex observation/action harness", "eval", "WATCH"),
    ("F12", "UltraData rights + holdouts", "data", "WATCH"),
    ("F13", "Open-SWE-Traces patch custody", "eval", "WATCH"),
    ("F14", "ScienceIDE executable tasks", "eval", "BLOCKED_EXTERNAL"),
    ("F15", "ModularRSI isolated harness", "research", "WATCH"),
    ("F16", "SoL-Pi evidence-preserving compaction", "memory", "ADMITTED_EVALUATION"),
    ("F17", "Reef bounded learning candidates", "research", "HOLD"),
    ("F18", "ALTK consistency metrics", "eval", "ADMITTED_EVALUATION"),
    ("F19", "Emergence World contamination tests", "eval", "WATCH"),
    ("F20", "OUI schema-bound interface proposals", "research", "ADMITTED_EVALUATION"),
    ("F21", "TRL / Transformers / Accelerate / PEFT", "runtime", "ADMITTED_EVALUATION"),
    ("F22", "ShadowPEFT attach/detach", "runtime", "ADMITTED_EVALUATION"),
    ("F23", "vLLM / SGLang / Omni / TEI", "serving", "ADMITTED_EVALUATION"),
    ("F24", "Agnes hybrid-memory isolation", "memory", "WATCH"),
    ("F25", "YARQA / RLT looped computation", "research", "ADMITTED_EVALUATION"),
    ("F26", "AuK consented speech", "model", "ADMITTED_EVALUATION"),
    ("F27", "LACI localize/rollback", "runtime", "WATCH"),
    ("F28", "VoiceTrace speaker-aware retrieval", "eval", "HOLD"),
    ("F29", "Zing simulated environments", "eval", "ADMITTED_EVALUATION"),
    ("F30", "Nemotron math verifier lane", "eval", "WATCH"),
    ("F31", "Retrieval / reranking", "eval", "ADMITTED_EVALUATION"),
    ("F32", "Existing tooling reconciliation", "research", "ADMITTED_EVALUATION"),
    ("F33", "Optimum-Intel / OpenVINO", "runtime", "WATCH"),
    ("F34", "Funes-style memory", "memory", "ADMITTED_EVALUATION"),
)

HONESTY_LAYERS = (
    {"id": "membership", "claim": "public ids observed", "not": "qualification"},
    {"id": "tree", "claim": "root listing only", "not": "recursive tree hash"},
    {"id": "content", "claim": "source_content_files_read=0", "not": "file audit"},
    {"id": "qualification", "claim": "HOLD", "not": "production authorization"},
)

GAPS = (
    {
        "id": "G01",
        "item": "frontier.tsx 10-tab optional-eval wiring",
        "state": "OPEN",
        "detail": "At 2026-09-25 closeout the 63-line tab wiring was local, not confirmed on #196 head a03ae47. PowerShell closer can patch draft branch only.",
    },
    {
        "id": "G02",
        "item": "merge #196 to protected main",
        "state": "REFUSED",
        "detail": "Draft. mergeable_state=blocked. Human command may be printed. This payload does not merge.",
    },
    {
        "id": "G03",
        "item": "file-by-file GitHub org audit",
        "state": "OPEN",
        "detail": "117 repos observed as membership. files_read=0. fileAuditComplete forbidden.",
    },
    {
        "id": "G04",
        "item": "HF content audit of models/datasets/spaces/kernels",
        "state": "OPEN",
        "detail": "Counts are membership. Weights not downloaded. Spaces not runtime-verified.",
    },
    {
        "id": "G05",
        "item": "HANDOFF lane execution",
        "state": "NAMED_ONLY",
        "detail": "17 HANDOFF lanes stay with their owners. This organ does not mutate them.",
    },
    {
        "id": "G06",
        "item": "live triad probe of 21 Spaces",
        "state": "CONTRACT_ONLY",
        "detail": "Expected /health /ready /source. List membership is not a probe. RUNNING != runtime-verified.",
    },
    {
        "id": "G07",
        "item": "training / second flagship / production promotion",
        "state": "FORBIDDEN",
        "detail": "trainingAdmission false. recreateFlagship false. promotionEffect NONE.",
    },
    {
        "id": "G08",
        "item": "current main SHA",
        "state": "UNKNOWN",
        "detail": "9042439 is historical. 9f45fea was main at #196 open. Do not invent today's HEAD.",
    },
)

STACK = {
    "ui": "TanStack Start/Router + React 19 + Vite",
    "server": "createServerFn for /api/*",
    "tests": "node --experimental-strip-types --test",
    "closeoutTests": "34/34 contract tests on modules present at closeout",
    "earlierTests": "23/23 unit tests including triad, receipt-envelope, estate-pin, codex-program, optional-eval, honesty",
    "secondReader": "python/payload/szl_codex_upgrade.py ContractError strict_json FILE_AUDIT_OVERCLAIM",
    "optionalGate": "localStorage OPTIONAL_EVAL_KEY default off; evaluate=1 on APIs; smuggled productionAuthorization ignored",
}

FORBIDDEN = (
    "merge protected main from this payload",
    "mint szl-frontier-2 or a second Space",
    "train or download weights",
    "set fileAuditComplete true",
    "display UNKNOWN as 0",
    "treat kernel count as model count",
    "treat health as ready or ready as source",
    "treat RUNNING as runtime-verified",
    "give envelope authority",
    "claim FedRAMP or ATO",
    "publish the private 9464-node graph",
    "relabel software gates as Lean proofs",
    "park this organ on a-11-oy.com",
)


class ContractError(ValueError):
    """Fixed diagnostic. Never a path, token, or raw remote body."""


def need(ok: bool, code: str) -> None:
    if not ok:
        raise ContractError(code)


def canonical(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        allow_nan=False,
    ).encode("utf-8")


def sha256(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def workstream_rows() -> list[dict[str, str]]:
    return [
        {"id": i, "title": t, "family": f, "status": s}
        for i, t, f, s in WORKSTREAMS
    ]


def build() -> dict[str, Any]:
    lanes = [dict(row) for row in LANES]
    this_organ = [row["id"] for row in lanes if row["scope"] == "THIS_ORGAN"]
    handoff = [row["id"] for row in lanes if row["scope"] == "HANDOFF"]
    doc = {
        "schema": SCHEMA,
        "issuedAt": ISSUED_AT,
        "organ": ORGAN,
        "hold": HOLD,
        "invariants": list(INVARIANTS),
        "contracts": list(CONTRACTS),
        "apis": list(APIS),
        "tabs": list(TABS),
        "census": CENSUS,
        "surfaces": list(SURFACES),
        "live": LIVE,
        "historicalMain": HISTORICAL_MAIN,
        "turns": [dict(row) for row in TURNS],
        "prs": [dict(row) for row in PRS],
        "lanes": lanes,
        "thisOrganLanes": this_organ,
        "handoffLanes": handoff,
        "workstreams": workstream_rows(),
        "honestyLayers": [dict(row) for row in HONESTY_LAYERS],
        "gaps": [dict(row) for row in GAPS],
        "stack": STACK,
        "forbidden": list(FORBIDDEN),
        "execution": {
            "isolatedWorktrees": True,
            "draftPrsOnly": True,
            "mergeProtectedMain": False,
            "recreateFlagship": False,
            "forcePush": False,
            "training": False,
            "networkInThisPayload": False,
        },
    }
    doc["digest"] = sha256({k: v for k, v in doc.items() if k != "digest"})
    return doc


def audit(doc: dict[str, Any]) -> list[str]:
    """Return failure codes. Empty means the encoded thread is complete."""
    fails: list[str] = []

    def check(ok: bool, code: str) -> None:
        if not ok:
            fails.append(code)

    check(doc.get("schema") == SCHEMA, "SCHEMA")
    hold = doc["hold"]
    check(hold["productionAuthorization"] is False, "HOLD_AUTH")
    check(hold["promotionEffect"] == "NONE", "HOLD_PROMOTION")
    check(hold["lambda"] == "CONJECTURE_1", "HOLD_LAMBDA")
    check(hold["trainingAdmission"] is False, "HOLD_TRAINING")
    check(hold["paidWorkloadBudgetUsd"] == 0, "HOLD_BUDGET")
    check(hold["fileAuditComplete"] is False, "HOLD_FILE_AUDIT")
    check(hold["sourceContentFilesRead"] == 0, "HOLD_FILES_READ")
    check(hold["semanticReviewComplete"] is False, "HOLD_SEMANTIC")
    check(hold["runtimeVerified"] is False, "HOLD_RUNTIME")
    check(hold["envelopeAuthority"] == "NONE", "HOLD_ENVELOPE")
    check(hold["mergeProtectedMain"] is False, "HOLD_MERGE")
    check(hold["recreateFlagship"] is False, "HOLD_FLAGSHIP")
    check(hold["optionalEvaluation"] is True, "HOLD_OPTIONAL")
    check(hold["optionalEvaluationLiftsHold"] is False, "HOLD_OPTIONAL_LIFT")

    turns = {row["id"]: row for row in doc["turns"]}
    for tid in ("T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10"):
        check(tid in turns and bool(turns[tid].get("ask")) and bool(turns[tid].get("miss")), "TURN_" + tid)
    check(turns.get("T06", {}).get("disposition") == "REFUSED_AUTO_MERGE", "MERGE_NOT_REFUSED")
    check(turns.get("T10", {}).get("disposition") == "THIS_PAYLOAD", "SELF_TURN")

    lane_ids = [row["id"] for row in doc["lanes"]]
    check(len(lane_ids) == 26, "LANE_COUNT")
    check(len(set(lane_ids)) == 26, "LANE_UNIQUE")
    check(tuple(doc["thisOrganLanes"]) == THIS_ORGAN, "THIS_ORGAN_SET")
    check(len(doc["handoffLanes"]) == 17, "HANDOFF_COUNT")
    check(all(row["status"] != "PROMOTED" for row in doc["lanes"]), "LANE_PROMOTED")
    for row in doc["lanes"]:
        check(row.get("forbidden"), "LANE_FORBIDDEN_" + row["id"])
        if row["scope"] == "THIS_ORGAN":
            check(row["status"] == "ADMITTED_EVALUATION", "THIS_ORGAN_STATUS_" + row["id"])
        else:
            check(row["status"] == "HOLD", "HANDOFF_STATUS_" + row["id"])

    ws = doc["workstreams"]
    check(len(ws) == 34, "WORKSTREAM_COUNT")
    check([row["id"] for row in ws] == ["F%02d" % n for n in range(1, 35)], "WORKSTREAM_IDS")
    check(all(row["status"] != "PROMOTED" for row in ws), "WORKSTREAM_PROMOTED")

    check(len(doc["surfaces"]) == 21, "SURFACE_COUNT")
    check("SZLHOLDINGS/szl-frontier" in doc["surfaces"], "SURFACE_SELF")
    check(len(doc["contracts"]) == 12, "CONTRACT_COUNT")
    check(len(doc["apis"]) == 12, "API_COUNT")
    check(list(doc["tabs"]) == list(TABS), "TABS")
    check(len(doc["honestyLayers"]) == 4, "HONESTY_LAYERS")
    check(doc["census"]["filesRead"] == 0, "CENSUS_FILES")
    check(doc["census"]["fileAuditComplete"] is False, "CENSUS_AUDIT")
    check(doc["census"]["counts"]["hfKernels"] != doc["census"]["counts"]["hfModels"], "KERNELS_EQ_MODELS")
    check(doc["census"]["counts"]["githubRepos"] == 117, "CENSUS_GH")
    check(doc["census"]["counts"]["hfModels"] == 47, "CENSUS_MODELS")
    check(doc["census"]["counts"]["hfDatasets"] == 35, "CENSUS_DATASETS")
    check(doc["census"]["counts"]["hfSpaces"] == 21, "CENSUS_SPACES")
    check(doc["census"]["counts"]["hfKernels"] == 14, "CENSUS_KERNELS")

    prs = {row["number"]: row for row in doc["prs"]}
    for number in (185, 186, 187, 190, 193, 194, 195, 196):
        check(number in prs and prs[number]["liftsHold"] is False, "PR_" + str(number))
    check(prs[196]["state"] == "DRAFT", "PR_196_DRAFT")
    check(prs[196]["branch"] == "frontier/optional-eval-ui-tabs-20260925", "PR_196_BRANCH")
    check(len(prs[196]["commits"]) == 3, "PR_196_COMMITS")

    gaps = {row["id"]: row for row in doc["gaps"]}
    for gid in ("G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08"):
        check(gid in gaps, "GAP_" + gid)
    check(gaps["G02"]["state"] == "REFUSED", "GAP_MERGE")
    check(gaps["G03"]["state"] == "OPEN", "GAP_FILE_AUDIT")
    check(gaps["G08"]["state"] == "UNKNOWN", "GAP_HEAD")
    check(doc["execution"]["networkInThisPayload"] is False, "NETWORK")
    check(doc["execution"]["mergeProtectedMain"] is False, "EXEC_MERGE")
    check("merge protected main from this payload" in doc["forbidden"], "FORBIDDEN")

    body = {k: v for k, v in doc.items() if k != "digest"}
    check(doc.get("digest") == sha256(body), "DIGEST")
    check(all(math.isfinite(v) for v in doc["census"]["counts"].values()), "COUNTS_FINITE")
    return fails


def brief() -> str:
    return "\n".join([
        "GROK TERMINAL — SZL THREAD AUDIT",
        "Organ: %s. Not a second flagship. Not a11oy." % ORGAN,
        "HOLD. productionAuthorization=false. promotionEffect=NONE. Lambda=Conjecture 1.",
        "Envelope authority NONE. UNKNOWN != 0. kernels != models. health != ready != source.",
        "Census is membership only: GH 117 / models 47 / datasets 35 / spaces 21 / kernels 14. files_read=0.",
        "Draft PR #196 stays draft. Do not merge protected main.",
        "Open: frontier.tsx tab wiring, file audit, HF content, live triad probe, current main SHA.",
        "Run: python3 szl_thread_audit_payload.py",
        "Reply with live vs modeled vs unavailable. Do not claim training, ATO, or a file audit.",
    ])


def render_text(doc: dict[str, Any], fails: list[str]) -> str:
    lines = [
        brief(),
        "",
        "schema %s" % doc["schema"],
        "digest %s" % doc["digest"],
        "verdict %s" % ("PASS" if not fails else "FAIL"),
        "turns %d  lanes %d  this_organ %d  handoff %d  workstreams %d  gaps %d" % (
            len(doc["turns"]),
            len(doc["lanes"]),
            len(doc["thisOrganLanes"]),
            len(doc["handoffLanes"]),
            len(doc["workstreams"]),
            len(doc["gaps"]),
        ),
        "",
        "TURNS",
    ]
    for row in doc["turns"]:
        lines.append("  %s  %-18s  %s" % (row["id"], row["disposition"], row["ask"][:72]))
        lines.append("      miss: %s" % row["miss"])
    lines.append("")
    lines.append("OPEN / REFUSED")
    for row in doc["gaps"]:
        lines.append("  %s  %-14s  %s" % (row["id"], row["state"], row["item"]))
    if fails:
        lines.append("")
        lines.append("FAILURES")
        lines.extend("  " + code for code in fails)
    lines.append("")
    lines.append("HOLD stands. This payload did not merge, train, or audit file contents.")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="SZL thread audit payload. HOLD. No network.")
    parser.add_argument("--json", action="store_true", help="print the sealed document")
    parser.add_argument("--brief", action="store_true", help="print the Grok terminal brief only")
    parser.add_argument("--self-test", action="store_true", help="exit 0 only if the encoded thread is complete")
    args = parser.parse_args(argv)
    if args.brief:
        sys.stdout.write(brief() + "\n")
        return 0
    doc = build()
    fails = audit(doc)
    if args.json:
        sys.stdout.write(json.dumps(doc, indent=2, sort_keys=True) + "\n")
    else:
        sys.stdout.write(render_text(doc, fails) + "\n")
    if fails:
        sys.stderr.write("THREAD_AUDIT_INCOMPLETE %s\n" % ",".join(fails))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
