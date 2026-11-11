#!/usr/bin/env python3
"""Memory Covenant conformance suite (T1-T13), v0.4-draft.

Stdlib only. Runs on a clean machine with no SZL services. Exit 0 iff
every test passes. T7 verifies the full chain offline, exactly as a
third party would. T9-T12 pin the fail-closed acceptance and staged-
commit contract: acceptance re-checks the current policy and the
backing content, and nothing is ever admitted without a sealed
receipt.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from covenant import (  # noqa: E402
    ALLOW,
    CovenantGateway,
    Policy,
    Provenance,
    ReceiptLake,
    Tier,
)
from adapters.in_memory import InMemoryPlane  # noqa: E402

POLICY = {
    "policy_id": "conformance-policy-v1",
    "revision": "2026-11-11",
    "rules": [
        {"id": "deny-recon", "effect": "hard_deny", "ops": ["*"], "purposes": ["*"], "tenants": ["*"], "content_contains": ["recon sweep"]},
        {"id": "deny-weaponize", "effect": "hard_deny", "ops": ["*"], "purposes": ["*"], "tenants": ["*"], "content_contains": ["weaponize"]},
        {"id": "review-discovered", "effect": "review", "ops": ["WRITE"], "purposes": ["*"], "tenants": ["*"], "content_contains": ["unreviewed claim"]},
        {"id": "allow-qa", "effect": "allow", "ops": ["*"], "purposes": ["support.customer_qa"], "tenants": ["default"]},
    ],
}


def build(tmp: str) -> CovenantGateway:
    lake = ReceiptLake(os.path.join(tmp, "lake.ndjson"))
    return CovenantGateway(memory=InMemoryPlane(), policy=Policy(POLICY), lake=lake)


def provenance(content: str, tier: str = Tier.MEASURED) -> Provenance:
    import hashlib

    return Provenance(source_url="https://example.org/evidence", digest=hashlib.sha3_256(content.encode()).hexdigest(), tier=tier)


def broken_lake(gw: CovenantGateway) -> None:
    """Simulate an unsealable lake (disk full, permissions, corruption)."""

    def append_raises(record):  # noqa: ANN001
        raise OSError("simulated lake seal failure")

    gw.lake.append = append_raises  # type: ignore[method-assign]


def t1_hard_deny_fails_closed(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="recon sweep of the internal network", provenance=provenance("recon sweep"), purpose="support.customer_qa")
    assert not res.ok, "hard-denied write must fail"
    assert res.state == "BLOCKED"
    assert gw.memory.count() == 0, "hard deny must create no memory"
    assert res.receipt is not None, "denials are receipted too"
    return "hard deny -> no memory, receipt sealed"


def t2_chain_tamper_detected(tmp: str) -> str:
    gw = build(tmp)
    gw.write(actor="agent-1", content="measured fact one", provenance=provenance("measured fact one"), purpose="support.customer_qa")
    gw.write(actor="agent-1", content="measured fact two", provenance=provenance("measured fact two"), purpose="support.customer_qa")
    lake_path = gw.lake.path
    with open(lake_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # Tamper a real byte of the receipt record: flip one hex char of the
    # stored digest. (Receipts carry digests, never raw content, so the
    # tamper must target the record itself.)
    entry = json.loads(lines[-1])
    flipped = ("0" if entry["digest"][0] != "0" else "1") + entry["digest"][1:]
    entry["digest"] = flipped
    lines[-1] = json.dumps(entry, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n"
    with open(lake_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    ok, reason = ReceiptLake.verify_file(lake_path)
    assert not ok, "tampered chain must fail verification"
    assert "digest mismatch" in reason, "verifier must name the broken link: " + reason
    return "one flipped digest byte -> verifier names the broken link"


def t3_fabricated_measured_refused(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="fact with no primary source", provenance=Provenance(source_url=None, digest=None, tier=Tier.MEASURED), purpose="support.customer_qa")
    receipt = res.receipt or {}
    assert receipt["provenance"]["tier"] == Tier.UNAVAILABLE, "fabricated MEASURED must be downgraded honestly"
    assert "tier_downgrade_reason" in receipt["provenance"]
    return "MEASURED without primary digest -> UNAVAILABLE, never fabricated"


def t4_approval_cannot_lift_hard_deny(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="weaponize the payload", provenance=provenance("weaponize"), purpose="support.customer_qa")
    assert not res.ok and res.state == "BLOCKED"
    accept = gw.accept(handle="anything", reviewer="admin", evidence="admin wants it")
    assert not accept.ok, "approval must not lift a hard deny"
    assert gw.memory.count() == 0
    return "hard deny + admin approval -> still denied"


def t5_unreviewed_candidate_never_serves(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="convenient unreviewed claim about revenue", provenance=provenance("claim"), purpose="support.customer_qa")
    assert not res.ok and res.state == "DISCOVERED_REVIEW_REQUIRED"
    stored = res.handle
    recall = gw.recall(actor="agent-1", query="revenue", purpose="support.customer_qa")
    assert not recall.ok, "candidates must not be recalled"
    assert all(item["handle"] != stored for item in (recall.receipt or {}).get("returned", []))
    learning = gw.accept(handle=stored, reviewer="stephen", evidence="verified at source revision r1")
    assert learning.ok, "human acceptance must produce a Learning Receipt"
    recall2 = gw.recall(actor="agent-1", query="revenue", purpose="support.customer_qa")
    assert recall2.ok, "after acceptance the memory is admissible"
    return "candidate blocked from serving -> Learning Receipt -> admissible"


def t6_cross_tenant_isolation(tmp: str) -> str:
    gw = build(tmp)
    gw.write(actor="agent-1", content="tenant a secret pricing", provenance=provenance("pricing"), purpose="support.customer_qa", tenant="tenant-a")
    leak = gw.recall(actor="agent-2", query="pricing", purpose="support.customer_qa", tenant="tenant-b")
    assert not leak.ok, "cross-tenant recall must be denied by policy"
    assert (leak.receipt or {}).get("verdict") != ALLOW
    return "cross-tenant recall -> denied, no leak"


def t7_offline_verify_clean_machine(tmp: str) -> str:
    gw = build(tmp)
    gw.write(actor="agent-1", content="measured fact one", provenance=provenance("measured fact one"), purpose="support.customer_qa")
    gw.write(actor="agent-1", content="convenient unreviewed claim", provenance=provenance("claim"), purpose="support.customer_qa")
    gw.recall(actor="agent-1", query="measured", purpose="support.customer_qa")
    copy = os.path.join(tmp, "copy-for-third-party.ndjson")
    shutil.copyfile(gw.lake.path, copy)
    ok, reason = ReceiptLake.verify_file(copy)
    assert ok, "clean chain must verify offline: " + reason
    return reason


def t8_recall_always_receipted(tmp: str) -> str:
    gw = build(tmp)
    before = gw.lake.count()
    denied = gw.recall(actor="agent-1", query="anything", purpose="unknown.purpose", tenant="default")
    after = gw.lake.count()
    assert not denied.ok
    assert after == before + 1, "a denied recall must still append a receipt"
    assert (denied.receipt or {}).get("op") == "RECALL"
    return "even denied recalls append a receipt"


def t9_acceptance_rechecks_current_policy(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="convenient unreviewed claim about revenue", provenance=provenance("claim"), purpose="support.customer_qa")
    assert not res.ok and res.state == "DISCOVERED_REVIEW_REQUIRED"
    handle = res.handle
    # Policy moves after the write: the same content is now hard-denied.
    stricter = {
        "policy_id": "conformance-policy-v2",
        "revision": "2026-11-11",
        "rules": [
            {"id": "deny-unreviewed", "effect": "hard_deny", "ops": ["*"], "purposes": ["*"], "tenants": ["*"], "content_contains": ["unreviewed claim"]},
            {"id": "allow-qa", "effect": "allow", "ops": ["*"], "purposes": ["support.customer_qa"], "tenants": ["default"]},
        ],
    }
    gw.policy = Policy(stricter)
    accept = gw.accept(handle=handle, reviewer="stephen", evidence="verified at source revision r1")
    assert not accept.ok, "acceptance must re-evaluate the CURRENT policy"
    assert accept.state == "BLOCKED"
    assert handle not in gw._admitted, "a hard-denied candidate must never be admitted"
    recall = gw.recall(actor="agent-1", query="revenue", purpose="support.customer_qa")
    assert not recall.ok, "a demoted candidate must never serve"
    return "policy hardened after write -> acceptance refused, candidate demoted, never served"


def t10_altered_or_missing_backing_content(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="convenient unreviewed claim about revenue", provenance=provenance("claim"), purpose="support.customer_qa")
    handle = res.handle
    # Altered: the plane no longer holds what was written.
    gw.memory._by_tenant["default"][handle] = "altered revenue claim"
    accept = gw.accept(handle=handle, reviewer="stephen", evidence="verified at source revision r1")
    assert not accept.ok, "acceptance must verify the backing content"
    assert "altered" in accept.reason, "the refusal must name the integrity break: " + accept.reason
    # Missing: the plane holds nothing under the handle.
    res2 = gw.write(actor="agent-1", content="another unreviewed claim about margins", provenance=provenance("margins"), purpose="support.customer_qa")
    h2 = res2.handle
    gw.memory.remove("default", h2)
    accept2 = gw.accept(handle=h2, reviewer="stephen", evidence="verified at source revision r1")
    assert not accept2.ok, "acceptance must refuse missing backing content"
    assert "missing" in accept2.reason, "the refusal must name the missing backing: " + accept2.reason
    return "altered or missing backing content -> acceptance refused, candidate demoted"


def t11_receipt_failure_leaves_no_memory(tmp: str) -> str:
    gw = build(tmp)
    broken_lake(gw)
    res = gw.write(actor="agent-1", content="measured fact one", provenance=provenance("measured fact one"), purpose="support.customer_qa")
    assert not res.ok, "write must fail closed when the receipt cannot be sealed"
    assert "receipt seal failed" in res.reason, "the failure must be honest: " + res.reason
    assert "rolled back" in res.reason, "the plane mutation must be rolled back: " + res.reason
    assert gw.memory.count() == 0, "no memory may exist without a sealed receipt"
    return "lake seal failure on WRITE -> plane rolled back, honest failure"


def t12_acceptance_atomic_under_lake_failure(tmp: str) -> str:
    gw = build(tmp)
    res = gw.write(actor="agent-1", content="convenient unreviewed claim about revenue", provenance=provenance("claim"), purpose="support.customer_qa")
    handle = res.handle
    broken_lake(gw)
    accept = gw.accept(handle=handle, reviewer="stephen", evidence="verified at source revision r1")
    assert not accept.ok, "acceptance must fail if the Learning Receipt cannot be sealed"
    assert "receipt seal failed" in accept.reason, "the failure must be honest: " + accept.reason
    assert handle not in gw._admitted, "no admission without a sealed receipt"
    recall = gw.recall(actor="agent-1", query="revenue", purpose="support.customer_qa")
    assert not recall.ok, "an unreceipted candidate must never serve"
    return "lake seal failure on LEARNING -> candidate stays unreviewed, never serves"


def t13_failed_rewrite_keeps_admitted_memory(tmp: str) -> str:
    gw = build(tmp)
    content = "measured fact one"
    first = gw.write(actor="agent-1", content=content, provenance=provenance(content), purpose="support.customer_qa")
    assert first.ok, "the first write must be admitted"
    real_append = gw.lake.append
    broken_lake(gw)
    again = gw.write(actor="agent-1", content=content, provenance=provenance(content), purpose="support.customer_qa")
    assert not again.ok, "a re-write must fail closed when the receipt cannot be sealed"
    gw.lake.append = real_append  # type: ignore[method-assign]
    assert gw.memory.get("default", first.handle) == content, "rollback must not delete bytes that back an already-receipted memory"
    recall = gw.recall(actor="agent-1", query="measured", purpose="support.customer_qa")
    assert recall.ok, "the originally admitted memory must still serve"
    return "seal failure on a duplicate WRITE -> admitted memory and its bytes survive"


TESTS = [
    ("T1", t1_hard_deny_fails_closed),
    ("T2", t2_chain_tamper_detected),
    ("T3", t3_fabricated_measured_refused),
    ("T4", t4_approval_cannot_lift_hard_deny),
    ("T5", t5_unreviewed_candidate_never_serves),
    ("T6", t6_cross_tenant_isolation),
    ("T7", t7_offline_verify_clean_machine),
    ("T8", t8_recall_always_receipted),
    ("T9", t9_acceptance_rechecks_current_policy),
    ("T10", t10_altered_or_missing_backing_content),
    ("T11", t11_receipt_failure_leaves_no_memory),
    ("T12", t12_acceptance_atomic_under_lake_failure),
    ("T13", t13_failed_rewrite_keeps_admitted_memory),
]


def main() -> int:
    print("Memory Covenant conformance suite (v0.4-draft) — T1..T13")
    failures = 0
    for label, fn in TESTS:
        with tempfile.TemporaryDirectory() as tmp:
            try:
                note = fn(tmp)
                print("  PASS %s — %s" % (label, note))
            except AssertionError as exc:
                failures += 1
                print("  FAIL %s — %s" % (label, exc))
            except Exception as exc:  # noqa: BLE001 - errors count as failures
                failures += 1
                print("  ERROR %s — %s: %s" % (label, type(exc).__name__, exc))
    print("result: %d/%d passed" % (len(TESTS) - failures, len(TESTS)))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
