# SZL Estate blueprint — operational scope corrected 2026-11-16

**Direction:** make memory and inference decisions auditable through receipt
integrity, explicit policy identity, witness evidence and independently computed
verification results.

The [implementation readback](COVENANT_IMPLEMENTATION_STATUS_2026-11-16.md)
is the current capability boundary. It separates merged component source,
formal models, integration tests and measured runtime behavior. This document
supersedes the broader operational assertions in the
[earlier blueprint](https://github.com/szl-holdings/szl-frontier/blob/a0f7fe3e0acae82a40dddb536e6ab9f8ac2051a2/docs/ESTATE_VS_LEADERS_BLUEPRINT_2026-11-16.md),
which remains available as a historical revision.

## 1. Governed memory

Implemented component work includes the Lean DenyMonotonic policy model,
Khipu's versioned STH verifier and recall-evidence gate, receipt-tree tools and
read-only adjudication source. Their source references and limitations are
listed in the readback.

The next product increment is a composed recall transaction: bind the requested
tenant, session, content, policy revision, receipt-tree root and trusted time to
one decision. A failed or missing check must prevent release, and a valid
positive control must still succeed. Every source revision needs matching
evidence; a historical mutation report cannot qualify a changed verifier.

The Frontier TypeScript and Python reference paths still need their own
integration evidence. The Python reference emits UNSIGNED_HONEST receipts.
A theorem about a defined state machine does not establish correspondence to
all software implementations.

## 2. Payment and delivered evidence

Design goal: a paid inference or memory response should include a verifiable
receipt binding the model revision, policy identity, input/output commitments
and evidence verdict. Payment settlement and delivery verification are separate
facts to measure.

Acceptance requires an observed paid request, verified settlement, successful
authorized execution, a matching response receipt and a negative test showing
that payment cannot override a hard deny. The blueprint itself does not establish
any of those live outcomes or a mathematically guaranteed SLA.

## 3. Verification of the verifier

Use three complementary controls:

- Formal proofs for explicitly modeled invariants, with guards that reject
  newly introduced unapproved axioms.
- Adversarial mutation tests with a valid positive control and source hashes.
- Separately implemented chain/Merkle computation that consumes both compared
  inputs and reports its exact coverage.

A chain/Merkle comparator does not become a second signature verifier merely by
being housed in another package. Distinct fixture keys do not prove distinct
operators or hosts. Reports must name these limits.

## 4. Compute provenance and presentation

Model, dataset, kernel and training surfaces should link to exact source,
evaluation inputs and dated receipts. Missing measurements remain unavailable.
Failed historical runs remain discoverable alongside forward corrections.

Potential extensions include compatible provenance assertions for compute
artifacts, a bounded verifier service and structured telemetry that exposes
policy decisions, receipt continuity and evidence freshness. Any GPU kernel or
edge integration needs measured benefit and a verified CPU/reference baseline
before a performance or deployment claim.

## Admission sequence

1. Repair and regression-test policy ownership, receipt sequencing and proof
   dependency guards.
2. Generate current STH v2 evidence from identified imported source, with
   positive and negative controls and a scoped crosscheck.
3. Review the existing bounded adjudicator repair and its API migration.
4. Connect one real recall path to trusted policy and witness context; verify
   the returned bytes and receipts end to end.
5. Qualify deployment, authentication, durable multi-writer semantics, witness
   failure domains, rollback and service objectives.
6. Publish measured source/runtime/evaluation evidence for exactly that release.

Production HOLD remains until the applicable evidence is complete. Competitive
comparisons and market figures from the earlier draft require separate
primary-source verification before publication.
