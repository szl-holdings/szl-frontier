# Codex handoff — Harbor provider credential references

Status: **EVALUATION / HOLD**

Evaluate only `huggingface/harbor-hf@271303d7a21fa595a5a71e46ce5524b0aff6bb9f`. This is a deliberate successor to the existing Harbor reproducibility pin `ba67b21d625227abf084eba7b605737e4a057575`; do not follow moving `main`.

## Owning implementation repository

Implement the bounded evaluator in `szl-holdings/szl-forge`. Frontier owns provenance/disposition only. Do not change A11oy product/provider defaults from this lane.

## Required evaluator

Build a deterministic, offline-first contract harness using synthetic provider names, synthetic secret-reference names and mocked presence states only. No real provider token or secret value may be accepted by fixtures, environment capture, logs, receipts or test output.

The evaluator must prove all of the following before any successor adoption proposal:

1. The application contract persists opaque/reference metadata only and rejects attempted secret-value persistence or reflection.
2. Recipe, model, connection, registry or presence changes invalidate an existing review/confirmation.
3. `expected_revision` conflicts fail closed. An ambiguous 503/network-save outcome is followed by authoritative readback, never blind automatic retry.
4. A selected registered reference that is missing, disabled or unauthorized denies admission without legacy Hugging Face credential fallback.
5. Dispatch and restart recheck the exact grant and reviewed binding.
6. Harbor `allowed_hosts` declarations are treated as review metadata, not an egress firewall. Add an independent mocked SZL egress-policy witness; without that witness provider-call eligibility is false.
7. The upstream single-controller write-authority constraint is explicit. Simulated concurrent controllers sharing the same registry must make the qualification result HOLD/UNSUPPORTED rather than implying distributed CAS safety.
8. `native` key-only/null-URL binding is separate from `chat-completions` and `responses`, which require a reviewed non-null base URL plus the exact `model_base_url` run binding.
9. Disabling a reference does not remotely revoke an already-running worker. Record this as an unsupported revocation primitive and require a separately evidenced termination/rotation control for any production successor.
10. Setup success, credential presence and benchmark success are never interpreted as authentication, quota, compatibility, model quality or deployment authorization.

## Evidence shape

Emit one canonical JSON receipt containing the exact upstream commit, evaluator source commit, fixture-set digest, all negative-path outcomes, egress-policy witness state, single-writer test outcome, review-invalidation matrix, fallback-denial result, restart/dispatch recheck result, revocation limitation, and final disposition.

`PASS` means only that the bounded contract behaved as expected. Production authorization and automatic promotion remain false. Missing runtime, unavailable provider simulation, unsupported concurrent-controller semantics or absent termination evidence must remain explicit evidence rather than being coerced to PASS.

Tracking: `szl-frontier#72`.
