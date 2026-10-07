"""Memory Covenant software rules as evidence gates (T27).

These are DECLARED application rules, not Doctrine v11 formulas or Lean proofs.
They do not prove Λ or treat a memory write as training. Retrieved text remains
untrusted. Opaque provider state is not public evidence.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

REQUIRED_COVENANT_RULE_IDS = (
    "MC-R1",
    "MC-R2",
    "MC-R3",
    "MC-R4",
    "MC-R5",
    "MC-R6",
    "MC-R7",
    "MC-R8",
    "MC-R9",
)
WRITE_PURPOSES = frozenset({"evidence-write", "evaluation"})
RECALL_PURPOSES = frozenset({"governed-recall", "policy-review"})
INJECTION = re.compile(
    r"ignore (previous|all) instructions|system prompt|jailbreak|override[- ]covenant|you are now",
    re.I,
)
SENSITIVITY_RANK = {"public": 0, "internal": 1, "confidential": 2}

_RULES_PATH = Path(__file__).resolve().parents[2] / "hf" / "dataset" / "covenant-rules.jsonl"


def _with_legacy_rule_ids(result: dict[str, Any]) -> dict[str, Any]:
    """Dual-emit the deprecated field name for the 0.5.x compatibility window."""

    return {
        **result,
        "formula_ids": list(result["covenant_rule_ids"]),
    }


def load_covenant_rules(path: Path | None = None) -> list[dict[str, str]]:
    target = path or _RULES_PATH
    rows: list[dict[str, str]] = []
    for line in target.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if (
            not isinstance(row, dict)
            or row.get("id") not in REQUIRED_COVENANT_RULE_IDS
            or row.get("evidence_class") != "DECLARED"
        ):
            raise ValueError("unexpected covenant rule row")
        rows.append(
            {
                "id": row["id"],
                "name": row["name"],
                "rule": row["rule"],
                "evidence_class": row["evidence_class"],
            }
        )
    ids = tuple(row["id"] for row in rows)
    if ids != REQUIRED_COVENANT_RULE_IDS:
        raise ValueError(f"covenant rule IDs drifted: {ids}")
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
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "indexed": False,
                "covenant_rule_ids": ["MC-R3"],
                "reason": "purpose ∉ write-set ⇒ deny mutation",
                "record": None,
            }
        )
    if INJECTION.search(content):
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "indexed": False,
                "covenant_rule_ids": ["MC-R7"],
                "reason": "override-covenant text ⇒ quarantine, never index",
                "record": {
                    "memory_class": "quarantine_memory",
                    "lifecycle": "quarantined",
                    "indexed": False,
                    "content_sha256": _sha(content),
                },
            }
        )
    if memory_class == "policy_memory":
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "indexed": False,
                "covenant_rule_ids": ["MC-R4"],
                "reason": "policy_memory ⇐ auditor only",
                "record": None,
            }
        )
    if not source_refs:
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "indexed": False,
                "covenant_rule_ids": ["MC-R6"],
                "reason": "evidence requires sourceRefs ∧ contentSha256",
                "record": None,
            }
        )
    if "provider-reasoning" in source_refs or "opaque-state" in source_refs:
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "indexed": False,
                "covenant_rule_ids": ["MC-R6", "MC-R9"],
                "reason": "opaque provider reasoning state is not public evidence",
                "record": None,
            }
        )
    return _with_legacy_rule_ids(
        {
            "allowed": True,
            "indexed": True,
            "covenant_rule_ids": ["MC-R3", "MC-R6"],
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
    )


def recall_evidence(
    *,
    purpose: str,
    tenant: str,
    clearance: str,
    records: list[dict[str, Any]],
    query: str,
) -> dict[str, Any]:
    if purpose not in RECALL_PURPOSES:
        return _with_legacy_rule_ids(
            {
                "allowed": False,
                "hits": [],
                "covenant_rule_ids": ["MC-R3"],
                "reason": "purpose cannot recall",
            }
        )
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
    return _with_legacy_rule_ids(
        {
            "allowed": True,
            "hits": hits,
            "covenant_rule_ids": ["MC-R1", "MC-R5"],
            "reason": "Foreign tenants and quarantined rows excluded. Retrieval is not training admission.",
        }
    )
