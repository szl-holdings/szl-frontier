# Covenant policy snapshot verification — 2026-11-16

## Invariant

A policy digest identifies the same rule snapshot for every evaluation of that
Policy instance. Caller-owned or publicly inspected collections must not change
hard-deny behavior under an unchanged digest. Policy transitions require a new
Policy instance.

## Source and reproduced defect

Base: `a0f7fe3e0acae82a40dddb536e6ab9f8ac2051a2`.

Before the repair, Policy copied only the outer rules list. Mutating a source
rule from hard_deny to allow changed the gateway decision while receipts
retained the original digest. Nested operation, purpose, tenant and content
matchers were also aliased.

The regression suite ran against the unchanged implementation first:
9 test methods; the runner reported 15 failing subcases and 1 error. The
gateway control admitted fixture memory despite its digest identifying the
original hard-deny policy.

## Repair

Policy derives evaluation and SHA3-256 identity from one canonical JSON
snapshot, recursively freezes rules and matcher lists, and prevents field
reassignment. Invalid rule containers are rejected at construction. The
canonical JSON and digest algorithm are unchanged.

The native CI verify job now runs the previously omitted reference T1–T13
suite and discovers the policy snapshot unit tests.

## Local validation

Observed on BETTERWITHAGE, Python 3.12, 2026-11-16:

- `python -B -m unittest discover -s covenant-spec/conformance -p test_policy_snapshot.py -v`: 9/9 test methods passed, exit 0.
- `python -B covenant-spec/conformance/suite.py`: T1–T13 passed, exit 0.
- Positive control: benign content remains allowed.
- Explicit replacement control: a new revision changes its verdict and digest
  while both prior snapshots remain unchanged.
- Integration control: attempted input mutation still produces a denied
  gateway receipt with the original policy digest and no stored memory.

These are local observations. Exact-head hosted CI is reported by the PR checks.

## Limits

This establishes object ownership in the Python reference. It does not bind
that implementation to the Lean model, add witness countersigning to the
Frontier recall path, or qualify a hosted service. Historical receipts and the
dated v0.4 proposal are preserved.
