"""Covenant Gateway — fail-closed enforcement over any memory plane (v0.4-draft).

The Covenant is the gateway, not the store. Every WRITE, RECALL and EXPIRE
crosses the policy gate and is sealed into a hash-chained receipt lake
(UNSIGNED_HONEST here; DSSE/ECDSA-P256 via szl-receipt in production).
Recalls return handles and digests, never unaudited text. Hard denies are
absolute; approval can only accept DISCOVERED_REVIEW_REQUIRED candidates
through a signed Learning Receipt. Stdlib only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from .lake import ReceiptLake, canonical, sha3_256_hex
from .policy import ALLOW, DENY, HARD_DENY, REVIEW_REQUIRED, Policy


class Tier:
    MEASURED = "MEASURED"
    REPORTED = "REPORTED"
    MODELED = "MODELED"
    UNAVAILABLE = "UNAVAILABLE"
    ALL = (MEASURED, REPORTED, MODELED, UNAVAILABLE)


class Lifecycle:
    ADMITTED = "ADMITTED"
    DISCOVERED_REVIEW_REQUIRED = "DISCOVERED_REVIEW_REQUIRED"
    BLOCKED = "BLOCKED"
    EXPIRED = "EXPIRED"
    SEALED = "SEALED"


@dataclass(frozen=True)
class Provenance:
    source_url: Optional[str] = None
    digest: Optional[str] = None
    tier: str = Tier.UNAVAILABLE

    def to_dict(self) -> Dict[str, Any]:
        return {"source_url": self.source_url, "digest": self.digest, "tier": self.tier}


@dataclass
class OperationResult:
    ok: bool
    state: str
    handle: Optional[str] = None
    receipt: Optional[Dict[str, Any]] = None
    reason: str = ""


class CovenantGateway:
    """Fail-closed gateway wrapping a memory plane (put/get/search protocol).

    level: conformance level being enforced (C0..C2 enforced here; C3/C4
    require witnesses and Learning Receipts - see SPEC.md sections 8-9).
    clock: callable returning an ISO-8601 timestamp. The default is a
    fixed epoch for deterministic tests; pass a real clock in production.
    """

    def __init__(
        self,
        memory: Any,
        policy: Policy,
        lake: ReceiptLake,
        level: str = "C2",
        clock: Optional[Callable[[], str]] = None,
    ):
        self.memory = memory
        self.policy = policy
        self.lake = lake
        self.level = level
        self._clock = clock or (lambda: "1970-01-01T00:00:00Z")
        self._admitted: Dict[str, Dict[str, Any]] = {}
        self._candidates: Dict[str, Dict[str, Any]] = {}

    # -- internals ---------------------------------------------------------

    def _receipt(self, op: str, **fields: Any) -> Dict[str, Any]:
        record: Dict[str, Any] = {
            "schema": "memory-covenant/v0.4-draft",
            "op": op,
            "ts": self._clock(),
            "policy_id": self.policy.policy_id,
            "policy_digest": self.policy.digest,
            "signature": None,
            "signature_label": "UNSIGNED_HONEST",
        }
        record.update(fields)
        return self.lake.append(record)

    def _honest_provenance(self, provenance: Provenance) -> Dict[str, Any]:
        prov = provenance.to_dict()
        if prov["tier"] == Tier.MEASURED and not prov["digest"]:
            # Never fabricate a MEASURED value without a primary digest.
            prov["tier"] = Tier.UNAVAILABLE
            prov["tier_downgrade_reason"] = "MEASURED claimed with no primary digest; covenant cannot fabricate"
        return prov

    # -- operations --------------------------------------------------------

    def write(self, *, actor: str, content: str, provenance: Provenance, purpose: str, tenant: str = "default") -> OperationResult:
        prov = self._honest_provenance(provenance)
        verdict = self.policy.evaluate(op="WRITE", purpose=purpose, tenant=tenant, content=content)
        content_digest = sha3_256_hex(content)
        common = {
            "actor": actor,
            "purpose": purpose,
            "tenant": tenant,
            "content_digest": content_digest,
            "provenance": prov,
            "verdict": verdict.verdict,
            "rule_id": verdict.rule_id,
        }
        if verdict.verdict == HARD_DENY:
            receipt = self._receipt("WRITE", result=Lifecycle.BLOCKED, **common)
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="hard deny; approval cannot lift")
        if verdict.verdict == ALLOW:
            handle = self.memory.put(tenant, content)
            self._admitted[handle] = {"tenant": tenant, "content_digest": content_digest}
            receipt = self._receipt("WRITE", result=Lifecycle.ADMITTED, handle=handle, **common)
            return OperationResult(True, Lifecycle.ADMITTED, handle=handle, receipt=receipt)
        if verdict.verdict == REVIEW_REQUIRED:
            handle = self.memory.put(tenant, content)
            self._candidates[handle] = {"tenant": tenant, "content_digest": content_digest, "provenance": prov}
            receipt = self._receipt("WRITE", result=Lifecycle.DISCOVERED_REVIEW_REQUIRED, handle=handle, **common)
            return OperationResult(False, Lifecycle.DISCOVERED_REVIEW_REQUIRED, handle=handle, receipt=receipt, reason=verdict.reason)
        receipt = self._receipt("WRITE", result=Lifecycle.BLOCKED, **common)
        return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason=verdict.reason)

    def recall(self, *, actor: str, query: str, purpose: str, tenant: str = "default") -> OperationResult:
        # T8: recalls are always receipted, including denials.
        verdict = self.policy.evaluate(op="RECALL", purpose=purpose, tenant=tenant, content=query)
        returned: List[Dict[str, Any]] = []
        if verdict.verdict == ALLOW:
            for handle in self.memory.search(tenant, query):
                meta = self._admitted.get(handle)
                if meta is None or meta["tenant"] != tenant:
                    continue  # candidates and foreign-tenant items are never recalled
                returned.append({"handle": handle, "digest": meta["content_digest"]})
        receipt = self._receipt(
            "RECALL",
            actor=actor,
            purpose=purpose,
            tenant=tenant,
            query_digest=sha3_256_hex(query),
            verdict=verdict.verdict,
            rule_id=verdict.rule_id,
            result="RETURNED" if returned else "ABSTAINED",
            returned=returned,
        )
        ok = bool(returned) and verdict.verdict == ALLOW
        reason = "" if ok else ("denied: " + verdict.reason if verdict.verdict != ALLOW else "no admissible memories matched")
        return OperationResult(ok, "RETURNED" if ok else "ABSTAINED", receipt=receipt, reason=reason)

    def accept(self, *, handle: str, reviewer: str, evidence: str, actor: str = "review-gate") -> OperationResult:
        """Human-governed acceptance: DISCOVERED_REVIEW_REQUIRED -> ADMITTED.

        Produces a Learning Receipt (who reviewed, what evidence). A hard
        deny can never reach this path because blocked content is never
        stored as a candidate; if a candidate no longer passes policy, the
        acceptance is refused (T4 posture).
        """
        entry = self._candidates.get(handle)
        if entry is None:
            receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=DENY, rule_id=None)
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="no review-required candidate under this handle")
        self._admitted[handle] = {"tenant": entry["tenant"], "content_digest": entry["content_digest"]}
        del self._candidates[handle]
        receipt = self._receipt(
            "LEARNING",
            handle=handle,
            reviewer=reviewer,
            evidence_digest=sha3_256_hex(evidence),
            result=Lifecycle.ADMITTED,
            verdict=ALLOW,
        )
        return OperationResult(True, Lifecycle.ADMITTED, handle=handle, receipt=receipt, reason="learning receipt sealed")

    def expire(self, *, handle: str, cause: str, actor: str = "lifecycle") -> OperationResult:
        meta = self._admitted.pop(handle, None) or self._candidates.pop(handle, None)
        if meta is None:
            return OperationResult(False, Lifecycle.BLOCKED, reason="no such handle")
        receipt = self._receipt("EXPIRE", handle=handle, cause=cause, actor=actor, content_digest=meta["content_digest"], result=Lifecycle.EXPIRED)
        return OperationResult(True, Lifecycle.EXPIRED, handle=handle, receipt=receipt, reason=cause)
