"""Deny-by-default policy gate for the Memory Covenant (v0.4-draft).

Versioned, committed policy. No rule matched means deny. Hard denies are
absolute: approval can move a DISCOVERED_REVIEW_REQUIRED candidate to
ADMITTED; nothing can lift a hard deny. Stdlib only.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

ALLOW = "ALLOW"
REVIEW_REQUIRED = "REVIEW_REQUIRED"
HARD_DENY = "HARD_DENY"
DENY = "DENY"


def canonical(obj: Any) -> str:
    """Canonical JSON: sorted keys, no whitespace, no NaN/Infinity."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


@dataclass(frozen=True)
class PolicyVerdict:
    verdict: str
    rule_id: Optional[str]
    reason: str


class Policy:
    """Immutable, versioned policy document.

    Rule shape (JSON, committed and hash-pinned):

        {
          "policy_id": "policy-v1",
          "revision": "2026-11-11",
          "rules": [
            {
              "id": "allow-customer-qa",
              "effect": "allow" | "review" | "hard_deny",
              "ops": ["*"] or ["WRITE", "RECALL", ...],
              "purposes": ["*"] or ["support.customer_qa"],
              "tenants": ["*"] or ["default"],
              "content_contains": [] or ["recon", "weaponize"]
            }
          ]
        }

    Evaluation order is fixed: hard_deny, then review, then allow, then the
    default DENY. That order is the fail-closed posture of the Covenant.
    """

    def __init__(self, doc: Dict[str, Any]):
        if not isinstance(doc, dict) or "rules" not in doc:
            raise ValueError("policy document must be a mapping with 'rules'")
        self.policy_id: str = str(doc.get("policy_id", "policy-unnamed"))
        self.revision: str = str(doc.get("revision", "UNAVAILABLE"))
        self.rules: List[Dict[str, Any]] = list(doc.get("rules", []))
        self._digest = hashlib.sha3_256(canonical(doc).encode("utf-8")).hexdigest()

    @property
    def digest(self) -> str:
        """SHA3-256 over the canonical policy document (algorithm-declared)."""
        return self._digest

    @classmethod
    def load(cls, path: str) -> "Policy":
        with open(path, "r", encoding="utf-8") as f:
            return cls(json.load(f))

    @staticmethod
    def _matches(rule: Dict[str, Any], *, op: str, purpose: str, tenant: str, content: str) -> bool:
        if op not in rule.get("ops", ["*"]) and "*" not in rule.get("ops", ["*"]):
            return False
        purposes = rule.get("purposes", ["*"])
        if purpose not in purposes and "*" not in purposes:
            return False
        tenants = rule.get("tenants", ["*"])
        if tenant not in tenants and "*" not in tenants:
            return False
        for needle in rule.get("content_contains", []):
            if needle.lower() not in content.lower():
                return False
        return True

    def evaluate(self, *, op: str, purpose: str, tenant: str, content: str) -> PolicyVerdict:
        for rule in self.rules:
            if rule.get("effect") == "hard_deny" and self._matches(rule, op=op, purpose=purpose, tenant=tenant, content=content):
                return PolicyVerdict(HARD_DENY, rule.get("id"), "hard deny; approval cannot lift")
        for rule in self.rules:
            if rule.get("effect") == "review" and self._matches(rule, op=op, purpose=purpose, tenant=tenant, content=content):
                return PolicyVerdict(REVIEW_REQUIRED, rule.get("id"), "review required before admission")
        for rule in self.rules:
            if rule.get("effect") == "allow" and self._matches(rule, op=op, purpose=purpose, tenant=tenant, content=content):
                return PolicyVerdict(ALLOW, rule.get("id"), "allowed by rule")
        return PolicyVerdict(DENY, None, "no rule matched; deny-by-default")
