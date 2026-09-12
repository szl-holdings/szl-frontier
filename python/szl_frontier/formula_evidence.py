"""Existing formula IDs as evidence gates (T27).

Does not invent formulas, prove Λ, or treat a memory write as training.
Retrieved text remains untrusted. Opaque provider state is not public evidence.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

REQUIRED_FORMULA_IDS = ("F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9")
WRITE_PURPOSES = frozenset({"evidence-write", "evaluation"})
RECALL_PURPOSES = frozenset({"governed-recall", "policy-review"})
INJECTION = re.compile(
    r"ignore (previous|all) instructions|system prompt|jailbreak|override[- ]covenant|you are now",
    re.I,
)
SENSITIVITY_RANK = {"public": 0, "internal": 1, "confidential": 2}

_FORMULAS_PATH = Path(__file__).resolve().parents[2] / "hf" / "dataset" / "formulas.jsonl"


def load_formulas(path: Path | None = None) -> list[dict[str, str]]:
    target = path or _FORMULAS_PATH
    rows: list[dict[str, str]] = []
    for line in target.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not isinstance(row, dict) or row.get("id") not in REQUIRED_FORMULA_IDS:
            raise ValueError("unexpected formula row")
        rows.append({"id": row["id"], "name": row["name"], "rule": row["rule"], "maturity": "locked"})
    ids = tuple(row["id"] for row in rows)
    if ids != REQUIRED_FORMULA_IDS:
        raise ValueError(f"formula IDs drifted: {ids}")
    return rows


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def write_evidence(
    *,
    purpose: str,
    content: str,
    source_refs: list[str],
    memory_class: str = "evidence_memory",
) -> dict[str, Any]:
    if purpose not in WRITE_PURPOSES:
        return {
            "allowed": False,
            "indexed": False,
            "formula_ids": ["F3"],
            "reason": "purpose ∉ write-set ⇒ deny mutation",
            "record": None,
        }
    if INJECTION.search(content):
        return {
            "allowed": False,
            "indexed": False,
            "formula_ids": ["F7"],
            "reason": "override-covenant text ⇒ quarantine, never index",
            "record": {
                "memory_class": "quarantine_memory",
                "lifecycle": "quarantined",
                "indexed": False,
                "content_sha256": _sha(content),
            },
        }
    if memory_class == "policy_memory":
        return {
            "allowed": False,
            "indexed": False,
            "formula_ids": ["F4"],
            "reason": "policy_memory ⇐ auditor only",
            "record": None,
        }
    if not source_refs:
        return {
            "allowed": False,
            "indexed": False,
            "formula_ids": ["F6"],
            "reason": "evidence requires sourceRefs ∧ contentSha256",
            "record": None,
        }
    if "provider-reasoning" in source_refs or "opaque-state" in source_refs:
        return {
            "allowed": False,
            "indexed": False,
            "formula_ids": ["F6", "F9"],
            "reason": "opaque provider reasoning state is not public evidence",
            "record": None,
        }
    return {
        "allowed": True,
        "indexed": True,
        "formula_ids": ["F3", "F6"],
        "reason": "Committed as evidence. Advisory only — not an execution token and not training admission.",
        "record": {
            "memory_class": memory_class,
            "lifecycle": "active",
            "indexed": True,
            "content_sha256": _sha(content),
            "source_refs": list(source_refs),
            "training_admission": False,
        },
    }


def recall_evidence(
    *,
    purpose: str,
    tenant: str,
    clearance: str,
    records: list[dict[str, Any]],
    query: str,
) -> dict[str, Any]:
    if purpose not in RECALL_PURPOSES:
        return {"allowed": False, "hits": [], "formula_ids": ["F3"], "reason": "purpose cannot recall"}
    hits = []
    for record in records:
        if record.get("tenant") != tenant:
            continue
        if record.get("lifecycle") != "active":
            continue
        if record.get("indexed") is not True:
            continue
        if SENSITIVITY_RANK.get(record.get("sensitivity", "internal"), 1) > SENSITIVITY_RANK.get(clearance, 0):
            continue
        blob = f"{record.get('content', '')} {' '.join(record.get('source_refs', []))}".lower()
        if query.lower() in blob:
            hits.append(record)
    return {
        "allowed": True,
        "hits": hits,
        "formula_ids": ["F1", "F5"],
        "reason": "Foreign tenants and quarantined rows excluded. Retrieval is not training admission.",
    }
