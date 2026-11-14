"""Covenant Gateway — fail-closed enforcement over any memory plane (v0.4-draft).

The Covenant is the gateway, not the store. Every WRITE, RECALL and EXPIRE
crosses the policy gate and is sealed into a hash-chained receipt lake
(UNSIGNED_HONEST here; DSSE/ECDSA-P256 via szl-receipt in production).
Recalls return handles and digests, never unaudited text. Hard denies are
absolute; approval can only accept DISCOVERED_REVIEW_REQUIRED candidates
through a signed Learning Receipt. Stdlib only.

Staged-commit discipline (receipt-first):
1. Pre-flight the lake (tail healthcheck) BEFORE mutating the plane.
2. Mutate the memory plane.
3. Seal the receipt. If sealing fails, roll the plane mutation back and
   report an honest failure — no memory is ever admitted without a
   sealed receipt.
4. Only after a sealed receipt does gateway bookkeeping (admitted /
   candidate sets) change.

Acceptance (LEARNING) is fail-closed: it re-verifies the backing content
against the digest recorded at write time, re-evaluates the CURRENT policy
against the CURRENT content, and seals the Learning Receipt BEFORE moving
the candidate into the admitted set.
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

    def _plane_remove(self, tenant: str, handle: str) -> str:
        """Best-effort rollback of a plane mutation. Honest about failure."""
        remover = getattr(self.memory, "remove", None)
        if remover is None:
            return "ROLLBACK_UNAVAILABLE: plane exposes no remove(); bytes may remain stored without a receipt - investigate at the plane"
        try:
            remover(tenant, handle)
            return "rolled back"
        except NotImplementedError as exc:
            return "ROLLBACK_UNAVAILABLE: %s" % exc
        except Exception as exc:  # noqa: BLE001 - rollback must never mask the seal failure
            return "ROLLBACK_FAILED: %s" % exc

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
            try:
                receipt = self._receipt("WRITE", result=Lifecycle.BLOCKED, **common)
            except Exception as exc:  # noqa: BLE001 - a denial must still be honest about seal failure
                return OperationResult(False, Lifecycle.BLOCKED, reason="receipt seal failed (%s); denial stands, no receipt sealed" % exc)
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="hard deny; approval cannot lift")
        if verdict.verdict in (ALLOW, REVIEW_REQUIRED):
            state = Lifecycle.ADMITTED if verdict.verdict == ALLOW else Lifecycle.DISCOVERED_REVIEW_REQUIRED
            # Staged commit: (1) pre-flight lake health, (2) plane mutation,
            # (3) receipt seal, (4) bookkeeping. Roll back (2) if (3) fails.
            healthy, health_reason = self.lake.healthcheck()
            if not healthy:
                return OperationResult(
                    False,
                    Lifecycle.BLOCKED,
                    reason="receipt lake unhealthy; refusing to admit memory without a sealable receipt: %s" % health_reason,
                )
            handle = self.memory.put(tenant, content)
            # Planes may be content-addressed: a re-write of content that is
            # already tracked returns the SAME handle. Those bytes back an
            # existing sealed receipt, so a failed seal here must not remove
            # them - only a mutation this write introduced is rolled back.
            already_tracked = handle in self._admitted or handle in self._candidates
            try:
                receipt = self._receipt("WRITE", result=state, handle=handle, **common)
            except Exception as exc:  # noqa: BLE001 - report seal failure honestly, roll the plane back
                if already_tracked:
                    rollback = "left intact (handle already backs a receipted memory; nothing new to roll back)"
                else:
                    rollback = self._plane_remove(tenant, handle)
                return OperationResult(
                    False,
                    Lifecycle.BLOCKED,
                    reason="receipt seal failed (%s); plane %s; memory not admitted" % (exc, rollback),
                )
            entry: Dict[str, Any] = {"tenant": tenant, "content_digest": content_digest}
            if verdict.verdict == ALLOW:
                self._admitted[handle] = entry
                return OperationResult(True, Lifecycle.ADMITTED, handle=handle, receipt=receipt)
            self._candidates[handle] = {**entry, "provenance": prov, "purpose": purpose, "actor": actor}
            return OperationResult(False, Lifecycle.DISCOVERED_REVIEW_REQUIRED, handle=handle, receipt=receipt, reason=verdict.reason)
        try:
            receipt = self._receipt("WRITE", result=Lifecycle.BLOCKED, **common)
        except Exception as exc:  # noqa: BLE001
            return OperationResult(False, Lifecycle.BLOCKED, reason="receipt seal failed (%s); denial stands, no receipt sealed" % exc)
        return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason=verdict.reason)

    def recall(self, *, actor: str, query: str, purpose: str, tenant: str = "default") -> OperationResult:
        # T8: recalls are always receipted, including denials. If the lake
        # cannot seal, the recall fails closed - memories are never returned
        # unaudited.
        verdict = self.policy.evaluate(op="RECALL", purpose=purpose, tenant=tenant, content=query)
        returned: List[Dict[str, Any]] = []
        if verdict.verdict == ALLOW:
            for handle in self.memory.search(tenant, query):
                meta = self._admitted.get(handle)
                if meta is None or meta["tenant"] != tenant:
                    continue  # candidates and foreign-tenant items are never recalled
                returned.append({"handle": handle, "digest": meta["content_digest"]})
        try:
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
        except Exception as exc:  # noqa: BLE001 - fail closed: no receipt, no return
            return OperationResult(False, "ABSTAINED", reason="receipt seal failed (%s); recall refused (fail-closed)" % exc)
        ok = bool(returned) and verdict.verdict == ALLOW
        reason = "" if ok else ("denied: " + verdict.reason if verdict.verdict != ALLOW else "no admissible memories matched")
        return OperationResult(ok, "RETURNED" if ok else "ABSTAINED", receipt=receipt, reason=reason)

    def accept(self, *, handle: str, reviewer: str, evidence: str, actor: str = "review-gate") -> OperationResult:
        """Human-governed acceptance: DISCOVERED_REVIEW_REQUIRED -> ADMITTED.

        Fail-closed acceptance contract (v0.4-draft):
        1. The handle must reference an existing review-required candidate.
        2. The backing content must still exist in the plane and match the
           digest recorded at write time; altered or missing content refuses
           the acceptance and demotes the candidate to BLOCKED.
        3. The CURRENT policy is re-evaluated against the CURRENT content
           at acceptance time. A hard deny refuses the acceptance and
           demotes the candidate to BLOCKED; a plain deny refuses while the
           candidate stays review-required. A stale verdict from write
           time is never trusted.
        4. The Learning Receipt is sealed BEFORE the candidate moves into
           the admitted set; if sealing fails the candidate remains
           DISCOVERED_REVIEW_REQUIRED. No admission without a receipt.
        """
        entry = self._candidates.get(handle)
        if entry is None:
            try:
                receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=DENY, rule_id=None)
            except Exception as exc:  # noqa: BLE001
                return OperationResult(False, Lifecycle.BLOCKED, reason="receipt seal failed (%s); acceptance refused" % exc)
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="no review-required candidate under this handle")

        tenant = entry["tenant"]

        # (2) backing content must exist and match the write-time digest.
        content = self.memory.get(tenant, handle)
        if not content:
            del self._candidates[handle]  # integrity broken: demote, never admit
            try:
                receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=DENY, rule_id=None, refusal="backing content missing from plane")
            except Exception:  # noqa: BLE001 - the refusal stands even if it cannot be receipted
                receipt = None
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="backing content missing from plane; acceptance refused and candidate demoted")
        if sha3_256_hex(content) != entry["content_digest"]:
            del self._candidates[handle]  # integrity broken: demote, never admit
            try:
                receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=DENY, rule_id=None, refusal="backing content altered since write; digest mismatch")
            except Exception:  # noqa: BLE001
                receipt = None
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="backing content altered since write; acceptance refused and candidate demoted")

        # (3) re-evaluate the CURRENT policy against the CURRENT content.
        verdict = self.policy.evaluate(op="WRITE", purpose=entry.get("purpose", ""), tenant=tenant, content=content)
        if verdict.verdict == HARD_DENY:
            del self._candidates[handle]  # demoted: a hard deny is absolute
            try:
                receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=HARD_DENY, rule_id=verdict.rule_id, policy_recheck=True)
            except Exception:  # noqa: BLE001
                receipt = None
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="current policy hard-denies this content; acceptance refused and candidate demoted")
        if verdict.verdict == DENY:
            try:
                receipt = self._receipt("LEARNING", handle=handle, reviewer=reviewer, result=Lifecycle.BLOCKED, verdict=DENY, rule_id=None, policy_recheck=True)
            except Exception:  # noqa: BLE001
                receipt = None
            return OperationResult(False, Lifecycle.BLOCKED, receipt=receipt, reason="current policy no longer admits this content; acceptance refused, candidate kept for review")

        # (4) seal the Learning Receipt first; move bookkeeping only after.
        try:
            receipt = self._receipt(
                "LEARNING",
                handle=handle,
                reviewer=reviewer,
                evidence_digest=sha3_256_hex(evidence),
                result=Lifecycle.ADMITTED,
                verdict=verdict.verdict,
                rule_id=verdict.rule_id,
                policy_recheck=True,
            )
        except Exception as exc:  # noqa: BLE001
            return OperationResult(
                False,
                Lifecycle.BLOCKED,
                reason="receipt seal failed (%s); candidate remains DISCOVERED_REVIEW_REQUIRED" % exc,
            )
        self._admitted[handle] = {"tenant": tenant, "content_digest": entry["content_digest"]}
        del self._candidates[handle]
        return OperationResult(True, Lifecycle.ADMITTED, handle=handle, receipt=receipt, reason="learning receipt sealed")

    def expire(self, *, handle: str, cause: str, actor: str = "lifecycle") -> OperationResult:
        meta = self._admitted.get(handle) or self._candidates.get(handle)
        if meta is None:
            return OperationResult(False, Lifecycle.BLOCKED, reason="no such handle")
        # Receipt-first: seal the EXPIRE receipt before mutating bookkeeping.
        try:
            receipt = self._receipt("EXPIRE", handle=handle, cause=cause, actor=actor, content_digest=meta["content_digest"], result=Lifecycle.EXPIRED)
        except Exception as exc:  # noqa: BLE001
            return OperationResult(False, Lifecycle.BLOCKED, reason="receipt seal failed (%s); memory not expired" % exc)
        self._admitted.pop(handle, None)
        self._candidates.pop(handle, None)
        return OperationResult(True, Lifecycle.EXPIRED, handle=handle, receipt=receipt, reason=cause)
