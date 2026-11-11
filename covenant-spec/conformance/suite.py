#!/usr/bin/env python3
"""Memory Covenant conformance suite (T1-T8), v0.4-draft.

Stdlib only. Runs on a clean machine with no SZL services. Exit 0 iff
every test passes. T7 verifies the full chain offline, exactly as a
third party would.
"""
from __future__ import annotations

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
    flipped = lines[-1].replace("measured", "meAsured")
    with open(lake_path, "w", encoding="utf-8") as f:
        f.writelines(lines[:-1] + [flipped])
    ok, reason = ReceiptLake.verify_file(lake_path)
    assert not ok, "tampered chain must fail verification"
    assert "digest mismatch" in reason, "verifier must name the broken link: " + reason
    return "one flipped byte -> verifier names the broken link"


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


TESTS = [
    ("T1", t1_hard_deny_fails_closed),
    ("T2", t2_chain_tamper_detected),
    ("T3", t3_fabricated_measured_refused),
    ("T4", t4_approval_cannot_lift_hard_deny),
    ("T5", t5_unreviewed_candidate_never_serves),
    ("T6", t6_cross_tenant_isolation),
    ("T7", t7_offline_verify_clean_machine),
    ("T8", t8_recall_always_receipted),
]


def main() -> int:
    print("Memory Covenant conformance suite (v0.4-draft) — T1..T8")
    failures = 0
    for label, fn in TESTS:
        with tempfile.TemporaryDirectory() as tmp:
            try:
                note = fn(tmp)
                print("  PASS %s — %s" % (label, note))
            except AssertionError as exc:
                failures += 1
                print("  FAIL %s — %s" % (label, exc))
    print("result: %d/%d passed" % (len(TESTS) - failures, len(TESTS)))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
