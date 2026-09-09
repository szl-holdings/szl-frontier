# Codex handoff — Hugging Face `ghlore` project-memory evaluation

Status: **EVALUATION / HOLD**

Tracking: `szl-holdings/szl-frontier#54`

## Exact upstream binding

Evaluate only `huggingface/ghlore@82fd2b25be9205025afa43c334a578307b95d7b4` (Apache-2.0), observed on 2026-09-09. Do not resolve or install from moving `main` in qualification evidence. A later commit requires an intentional re-observation/rebind.

## Repository ownership

- `szl-holdings/szl-frontier`: canonical candidate record, evidence contract and disposition.
- `szl-holdings/szl-forge`: executable sandbox/evaluation implementation if this metadata intake advances.
- `szl-holdings/.github`: cross-estate policy/provenance controls only if a later integration requires them.
- `szl-holdings/a11oy`: no product/runtime exposure from this intake.
- `szl-holdings/a11oy-net`: no proof claim beyond evidence actually produced by a later governed evaluation.

## Codex task

Prepare, but do not promote, a bounded `szl-forge` evaluation lane that answers one question: **does exact-source `ghlore` materially improve retrieval of historical engineering rationale, failures and precedents for SZL coding agents compared with existing GitHub/estate search, without granting new authority or weakening provenance/security?**

### Required implementation properties

1. Use a fixed, non-secret evaluation repository/corpus and versioned query set.
2. Use GitHub credentials scoped read-only to issues/pull requests; no upstream write capability.
3. Treat retrieved issue/PR/review bodies as untrusted content that can never elevate policy or execution authority.
4. Require source URL/citation, author/trust metadata where available and freshness/age for every result used in scoring.
5. Re-open current source/tests before historical rationale is used to justify a patch.
6. Compare the same fixed query set against GitHub search and the existing estate-native retrieval path under the same repository/window.
7. Include deterministic tests for positive retrieval, negative/no-result behavior, prompt-injection text, bot/self-output exclusion, stale rationale and unavailable backend behavior.
8. Record storage scope, retention/deletion reconciliation, token handling, dependency/license inventory, measured resource use and a clean disable/rollback procedure.
9. No public service, mandatory Codex dependency, production routing/default, product exposure or autonomous merge/write authority.

## Stop conditions

Keep `HOLD` if the upstream source moves without deliberate rebind, a stable reproducible install cannot be established, the tool requires broader-than-read-only GitHub authority, historical content can affect agent authority, benchmark benefit is not measurable, citations/freshness are unreliable, storage/retention cannot meet estate policy, or any normal repository control fails.

Do not use this candidate to mask the independent HF inventory drift in `.github#728` or Lyte projection drift in `lyte-services#18`.
