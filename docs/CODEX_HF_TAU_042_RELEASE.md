# Codex handoff — Hugging Face Tau 0.4.2

Status: **EVALUATION / HOLD**

Canonical predecessor: `2026-09-09-hf-tau-agent-harness`.
Successor qualification source: `huggingface/tau@55df51608b8b2d172c4bbac2cd11e8345e307476`, tag `v0.4.2`, MIT, published 2026-09-10T06:57:17Z.

Do not rewrite the historical Tau intake. Rebind the pending Forge evaluation deliberately to this stable release and retain the old exact revision as provenance.

## Owning repository

Executable evaluation belongs in `szl-holdings/szl-forge`. Frontier stores only the admission, evidence contract, and disposition. No A11oy/product/proof projection follows from this metadata wave.

## Required evaluation delta

Use one fixed non-secret repository and a versioned task/session corpus. Compare Tau 0.4.2 against the current governed Forge/Codex path under the same tasks and environment.

In addition to the existing Tau harness tests, exercise the release-specific changes:

1. **Session evolution** — create/edit/clear/filter labels, branch and resume sessions, compact them, then replay representative pre-0.4.2 fixtures. Record exact incompatibilities rather than migrating evidence silently.
2. **Custom messages** — persist extension-injected `custom_message` entries, verify ordering and replay, and prove their contents never become policy or tool authority.
3. **Live Codex catalog discovery** — simulate additions, removals, malformed entries and unavailable discovery. A discovered model is inventory only; it cannot authorize a provider, production route, default, or credential scope.
4. **Streaming correctness** — assert interleaved reasoning and answer blocks retain order and content. Exercise incomplete Anthropic-compatible SSE and require rejection/retry rather than an empty success.
5. **Provider serialization/accounting** — cover Z.AI thinking serialization plus compaction/branch-summary usage attribution without turning accounting output into quality evidence.
6. **Shell lifecycle** — verify stdin is disconnected after command completion and that timeout, denied command, path escape and subprocess isolation remain fail-closed.

## Evidence contract

Record exact upstream release/tag commit, exact install/build receipt, dependency and license inventory, fixture/query/task digests, environment, measured results, failures, and rollback/disable procedure. Preserve all existing Forge tests and authority boundaries.

No autonomous merge/deploy, secrets, branch-protection mutation, upstream writes, weight hosting, production default changes, or public capability claims are authorized.

Promotion remains prohibited unless a later governed wave independently proves measurable benefit and all repository, provenance, security, rollback, product/runtime and proof gates pass under normal controls.
