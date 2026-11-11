<!-- szl:header v1 -->
<!-- Native identity: szl-brand@4309f6fce89179331b0b3ed8c99494e76c5be256; Orbit v2 icon. -->
<p>
  <a href="https://github.com/szl-holdings">
    <img src="https://raw.githubusercontent.com/szl-holdings/szl-brand/4309f6fce89179331b0b3ed8c99494e76c5be256/kit/logos/orbit-v2/suite/szl-icon-32.svg" alt="SZL Holdings — Orbit v2" width="32" height="32" />
  </a>
</p>

**Control before action. Evidence after.**

[Product](https://a-11-oy.com) · [Proof](https://a11oy.net) · [GitHub organization](https://github.com/szl-holdings)
<!-- /szl:header -->
# The Memory Covenant — Open Specification (v0.4-draft)

**No memory enters, leaves, or changes inside an agent's memory plane without identity, purpose, policy evaluation, provenance, lifecycle state, and a sealed receipt.**

| | |
| --- | --- |
| **Version** | 0.4-draft (pre-release) |
| **Status** | SPEC DRAFT — the memory-plane companion to [governed-receipt-spec](https://github.com/szl-holdings/governed-receipt-spec) |
| **Reference implementation** | Memory Covenant v0.3 in this repository (in-process covenant engine) |
| **License** | Apache-2.0 (text and conformance suite); the verification plane remains commercial |
| **Author** | SZL Holdings (Doctrine v11) |

> **The play:** *Give away the covenant; sell the control plane.*

## Honest status (read this first)

- This folder is **spec text + conformance suite + platform adapters**. It does not change the existing covenant engine in `src/lib/covenant`.
- Receipts produced here are **UNSIGNED_HONEST**: canonical JSON, SHA3-256 hash-chained, no signature fabricated. Signed DSSE/ECDSA-P256 envelopes come from [szl-receipt](https://github.com/szl-holdings/szl-receipt) per governed-receipt-spec.
- The Mem0 and Zep adapters are **demo-grade mappings**; the InMemoryPlane is the reference plane for tests and demos.
- Λ = Conjecture 1 — never a theorem. Software status: SPEC DRAFT. No production ATO claimed.

## Quickstart (clean machine, stdlib only)

```bash
cd covenant-spec
python conformance/suite.py   # T1–T8; exit 0 iff every test passes
```

## Conformance levels

| Level | Name | Requires |
| --- | --- | --- |
| **C0** | Receipted writes | DSSE receipt on every WRITE/INGEST |
| **C1** | Receipted reads | Receipts on every RECALL/ROUTE as well |
| **C2** | Gated memory | Deny-by-default policy gate, hard denies, tier honesty, tenant isolation |
| **C3** | Witnessed | Multi-party witness set (BFT 3-of-4) on seal-class and cross-tenant operations |
| **C4** | Learning-honest | Review-gated continuous memory with Learning Receipts and expiry discipline |

**C2 is the recommended enterprise floor.** The reference gateway in this folder implements C0–C2 and the C4 review loop in software.

## Test matrix (excerpt)

| # | Test | Expected |
| --- | --- | --- |
| T1 | WRITE that is hard-denied | Fails closed; no memory created |
| T2 | Receipt chain tamper (flip one byte) | Offline verifier names the exact broken link |
| T3 | Fabricated MEASURED value with no primary source | Tier recorded as UNAVAILABLE; never fabricated |
| T4 | Hard-deny content with admin approval | **Still denied**; approval cannot lift a hard deny |
| T5 | Unreviewed candidate recalled | Fails closed; candidate stays DISCOVERED_REVIEW_REQUIRED |
| T6 | Cross-tenant RECALL | Denied; no leak across tenants |
| T7 | Offline verify of a full chain, no SZL software | Chain verifies end-to-end |
| T8 | Recall without a receipt | Impossible; recalls are always receipted |

## Adapters

`adapters/mem0_adapter.py` and `adapters/zep_adapter.py` wrap the platforms' clients behind the gateway. Benchmarks stay with the platforms — **auditability becomes the Covenant's**. The adapter wraps any memory engine; the Covenant is the gateway, not the store.

## Relationship to emerging standards

The Covenant is the **memory-plane realization** of what current drafts describe informationally: the IETF [Governance Audit Record (GAR)](https://datatracker.ietf.org/doc/html/draft-sato-soos-gar-08) defines the audit record; [Agent Audit Trail](https://datatracker.ietf.org/doc/html/draft-sharif-agent-audit-trail/) a logging format; [Rule Provenance](https://datatracker.ietf.org/doc/html/draft-piehl-agent-rule-provenance-00) policy-rule lineage. All three become cryptographically enforceable when their records are DSSE envelopes in a hash-chained lake. The Covenant adds what none of them touch: **memory itself as the governed object**.

---

*Doctrine v11 · Control before action. Evidence after. Λ = Conjecture 1 (never a closed theorem).*
