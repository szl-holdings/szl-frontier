# Codex handoff — Hugging Face Harbor evaluation infrastructure

Status: **EVALUATION / HOLD**

Evaluate only `huggingface/harbor-hf@b64bf326dc5193675da84c560a37e04759c8289a` until an intentional re-observation changes the pin.

Implementation belongs in `szl-holdings/szl-forge`; `szl-frontier` remains the provenance and disposition authority.

Required first lane:

1. Fixed public/non-secret benchmark fixtures and versioned task set.
2. Exact environment/preset/image identities plus benchmark input/output digests.
3. Repeated execution proving deterministic outputs where expected and explicitly measuring permitted nondeterminism otherwise.
4. Negative paths for unavailable QEMU/runtime/backend capability; report `UNAVAILABLE`, never synthesize PASS.
5. No production route/default changes, provider writes, secret access, deploy authority, branch-protection changes, or autonomous merges.
6. Compare receipts and failure semantics with the current Forge lane contract before any successor adoption proposal.
7. Record rollback/disable path, dependency/license posture, resource use, and immutable receipts.

Do not use benchmark success as model qualification or as proof that GitHub → Hugging Face → a-11-oy.com → a11oy.net is aligned. Those claims require their own evidence.
