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

## Follow-up: operation binding and matcher validation

Review at `114ab263f7c6aaa38fa9541624d0a13016ee5e7a` found two additional
preexisting gaps. First, a policy replacement between evaluation and receipt
construction made the receipt identify a different policy. A deterministic
clock callback reproduced an admitted ALLOW write whose receipt identified
a HARD_DENY policy. The same identity split affected recall, acceptance and
expiration. Second, malformed matcher values used Python membership behavior:
`purposes: "admin"` matched purpose `"min"`, a mapping could act as an operation
set, and null raised during evaluation.

Each gateway operation now captures its Policy once at entry and passes that
same instance to evaluation and receipt construction. An explicit replacement
takes effect for following operations; callbacks cannot relabel an in-flight
operation's receipt. This binds identity without claiming thread safety for
the memory plane or receipt lake.

The four matcher fields (`ops`, `purposes`, `tenants`, `content_contains`)
accept JSON arrays of strings when present. Omitted operation, purpose and
tenant matchers retain wildcard defaults; empty arrays match nothing. Omitted
or empty content matchers impose no content condition. Validation does not
rewrite valid rules or change canonical JSON/SHA3-256 identity.

Before production edits, the expanded 12-method suite exited 1 with 40 failing
subcases: four operation callback cases and 36 malformed matcher cases. After
repair, all 12 methods passed, including those cases and positive controls for
omitted matchers, empty arrays and normal string matchers. T1–T13 also passed,
including replacement before acceptance and receipt-failure rollback. Ruff
E9/F checks passed. CI wiring is unchanged; its existing discovery includes
the new regressions. These remain local Python reference observations, not
runtime-to-Lean refinement or deployed-service qualification.
