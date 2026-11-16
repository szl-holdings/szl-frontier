# Memory Covenant v0.4 — Witness-Countersigned Receipt Chain (SPEC PROPOSAL, 2026-11-15)

> **Dated proposal preserved.** The implementation statements below describe
> November 15's proposal, not the present source state. See the
> [November 16 implementation readback](COVENANT_IMPLEMENTATION_STATUS_2026-11-16.md)
> for component evidence and remaining integration/deployment gates.

**Status: SPEC ONLY.** Nothing in this document is implemented. This proposal
does not authorize a release, change the production HOLD, or claim any
capability beyond what the repository already asserts. Λ remains Conjecture 1.

## 0. Why v0.4, why now

v0.3 seals every memory operation in a SHA-256 receipt chain (software gates,
24/24). The competitive record of 2026-11-14
(`COMPETITIVE_LANDSCAPE_MEMORY_RECEIPTS_2026-11-14.md`) shows: no memory
platform cryptographically receipts memory operations; the closest movers
(Armalo "Memory Attestation", the IETF Agent Record draft, Agent Manifest v0.2)
converge on signed, third-party-verifiable records. The open window is to be
**first** with operation-level receipts that are *countersigned by independent
witnesses* and whose policy core is *machine-checked*. The math is the moat.

## 1. Witness-countersigned receipt chain

1.1 The existing per-operation SHA-256 chain is retained unchanged. v0.4 adds a
**receipt tree** per plane session: operations are leaves; the root is a
**signed tree head (STH)** in the Certificate-Transparency (RFC 6962)
construction.

1.2 **Witness pool.** `khipu-consensus` (BFT 3-of-4 multi-party-witnessed
agreement, each witness signing the action hash with its own key) is the named
witness pool. An STH is only valid when ≥3 of 4 witnesses countersign it.

1.3 **Fail-closed rule (the new invariant candidate).** *No countersigned STH,
no release of recalls from that session.* Absent, unreachable, or disagreeing
witnesses leave the plane in deny — consistent with the default effect.

1.4 Honest limits: witness nodes are estate-operated in v0.4.0 (3-of-4 within
the estate, distinct keys, distinct hosts); external/third-party witnesses are
future work. Cross-org witnesses would be required before any "independent"
claim is made; until then the claim is exactly "multi-party-witnessed", never
"trustless".

## 2. Lean-verified policy core

2.1 Target lemma (**DenyMonotonic**): for all policy states, if an operation is
hard-denied (recon / foreign-write / weaponize), then no sequence of approvals
lifts the deny. Formalized in Lean 4 + Mathlib in `lutar-lean` alongside the
existing Λ formalization.

2.2 Λ uniqueness is **not** required for DenyMonotonic; Conjecture 1 remains
open and untouched. The lemma is provable by induction over the policy lattice
with hard-deny modeled as an absorbing state.

2.3 On proof: the software gates remain the enforcement; the theorem is a
verification of the gate semantics, stated in the `lutar-lean` style: proved
claims marked `theorem`, unproved marked `Conjecture`, never blurred.

## 3. Verifier evidence (who verifies the verifier)

3.1 `szl-eclipse` mutation testing over receipt verifiers (ten attack
classes) is the standing evidence that the STH verifier detects tampering.

3.2 `szl-crosscheck` cross-implementation verification: two independent
harnesses consume the same receipt bundle and must agree on CONSISTENT.

3.3 No verifier ships without a passing mutation report pinned to its commit.

## 4. Adjudication endpoint (read-only, spec)

`POST /adjudicate`: submit a receipt bundle (operations + STH + witness
signatures). Response is a receipt itself, one of:
`VERIFIED` (chain intact, witnesses valid), `TAMPERED` (mismatch located),
`UNKNOWN` (never PASS on missing evidence). Adjudication is read-only: it
proves facts about a bundle; it never lifts denies and never authorizes.

## 5. Non-goals

No blockchain claims beyond witness countersigning; no behavioral attestation
or agent reputation (Armalo's territory); no identity continuity (Agent
Record's territory); no claim of external independence until witnesses are
cross-org.

## 6. Implementation order (each owner-gated, decision card per step)

1. STH format + witness config in `khipu-consensus` (spec-conformance tests).
2. Receipt-tree builder + fail-closed recall gate in the plane (software gates).
3. `szl-eclipse` mutation report against the new verifier; `szl-crosscheck` leg.
4. DenyMonotonic in `lutar-lean` (proved or honestly filed as Conjecture).
5. Read-only adjudication endpoint + verify-from-source instructions.

## 7. Current state, restated honestly

SHA-256 receipt chain: LIVE (software gates). Witness countersigning: NOT
IMPLEMENTED. Lean lemma: NOT PROVED. Adjudication: NOT IMPLEMENTED. Production
HOLD unchanged. No FedRAMP/ATO claimed. Trust never 100%.
