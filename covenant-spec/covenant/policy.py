"""Deny-by-default policy gate for the Memory Covenant (v0.4-draft).

Versioned, committed policy. No rule matched means deny. Hard denies are
absolute: approval can move a DISCOVERED_REVIEW_REQUIRED candidate to
ADMITTED; nothing can lift a hard deny. Stdlib only.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Dict, Mapping, Optional, Tuple

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


def _freeze_json(value: Any) -> Any:
    """Own every nested JSON object; no caller or inspection view can edit it."""
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze_json(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze_json(item) for item in value)
    return value


@dataclass(frozen=True, slots=True, init=False, eq=False)
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

    Matchers, when present, must be JSON arrays of strings. Omitted ops,
    purposes and tenants default to ["*"]; an empty array matches nothing.
    Omitted or empty content_contains imposes no content condition. Each
    content string is a literal, case-insensitive substring that must occur.
    Malformed matcher containers or elements are rejected at construction.

    Evaluation order is fixed: hard_deny, then review, then allow, then the
    default DENY. That order is the fail-closed posture of the Covenant.
    """

    policy_id: str
    revision: str
    rules: Tuple[Mapping[str, Any], ...]
    _digest: str

    def __init__(self, doc: Dict[str, Any]):
        if not isinstance(doc, dict) or "rules" not in doc:
            raise ValueError("policy document must be a mapping with 'rules'")
        # Serialize once: identity and evaluation derive from the same owned
        # JSON snapshot, never from two separate reads of caller-owned objects.
        encoded = canonical(doc)
        snapshot = json.loads(encoded)
        rules = snapshot["rules"]
        if not isinstance(rules, list) or any(not isinstance(rule, dict) for rule in rules):
            raise ValueError("policy rules must be a JSON array of rule mappings")
        for index, rule in enumerate(rules):
            for field in ("ops", "purposes", "tenants", "content_contains"):
                if field not in rule:
                    continue
                values = rule[field]
                if not isinstance(values, list) or any(not isinstance(item, str) for item in values):
                    raise ValueError("policy rule %d %s must be a JSON array of strings" % (index, field))
        object.__setattr__(self, "policy_id", str(snapshot.get("policy_id", "policy-unnamed")))
        object.__setattr__(self, "revision", str(snapshot.get("revision", "UNAVAILABLE")))
        object.__setattr__(self, "rules", _freeze_json(rules))
        object.__setattr__(self, "_digest", hashlib.sha3_256(encoded.encode("utf-8")).hexdigest())

    @property
    def digest(self) -> str:
        """SHA3-256 over the canonical policy document (algorithm-declared)."""
        return self._digest

    @classmethod
    def load(cls, path: str) -> "Policy":
        with open(path, "r", encoding="utf-8") as f:
            return cls(json.load(f))

    @staticmethod
    def _matches(rule: Mapping[str, Any], *, op: str, purpose: str, tenant: str, content: str) -> bool:
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
