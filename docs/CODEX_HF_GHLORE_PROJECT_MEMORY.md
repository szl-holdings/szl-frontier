# Codex handoff — Hugging Face `ghlore` project-memory evaluation

Status: **EVALUATION / HOLD**

Tracking: `szl-holdings/szl-frontier#54`

## Exact upstream binding

Evaluate only `huggingface/ghlore@82fd2b25be9205025afa43c334a578307b95d7b4` (Apache-2.0), observed on 2026-09-09. Do not resolve or install from moving `main` in qualification evidence. Upstream is same-day and unreleased; a later commit requires an intentional re-observation/rebind.

## Repository ownership

- `szl-holdings/szl-frontier`: canonical candidate record, evidence contract and disposition.
- `szl-holdings/szl-forge`: executable sandbox/evaluation implementation if this metadata intake is advanced.
- `szl-holdings/.github`: cross-estate policy/provenance controls only if a later integration requires them.
- `szl-holdings/a11oy`: no product/runtime exposure from this intake.
- `szl-holdings/a11oy-net`: no proof claim beyond evidence actually produced by a later governed evaluation.

## Codex task

Prepare, but do not promote, a bounded `szl-forge` evaluation lane that answers one question: **does exact-source `ghlore` materially improve retrieval of historical engineering rationale, failures and precedents for SZL coding agents compared with existing GitHub/estate search, without granting new authority or weakening provenance/security?**

### Required implementation properties

1. Use a fixed, non-secret evaluation repository/corpus and versioned query set. Do not start with private-sensitive repositories.
2. Use GitHub credentials scoped read-only to issues/pull requests. The evaluator must have no upstream write capability.
3. Treat every retrieved issue/PR/review body as untrusted content. Retrieval output may inform search but may never be executed as an instruction or elevate policy/authority.
4. Require source URL/citation, author/trust metadata where available and freshness/age for every result used in scoring.
5. Before a historical result justifies a patch, re-open current source/tests and independently verify the claim still applies.
6. Compare the same fixed query set against at least GitHub search and the existing estate-native retrieval path under the same repository/window.
7. Include deterministic tests for positive retrieval, negative/no-result behavior, prompt-injection text in historical comments, bot/self-output exclusion, stale rationale and unavailable backend behavior.
8. Record backfill/poll scope, storage location, retention/deletion reconciliation, token handling, dependency/license inventory, measured resource use and a clean disable/rollback procedure.
9. No public service, mandatory Codex dependency, production routing/default, product exposure or autonomous merge/write authority.

### Evidence required before any successor admission

- exact upstream commit and install/build receipt;
- fixed benchmark corpus/query-set digest;
- deterministic benchmark results against named baselines;
- security tests proving retrieved text remains data only;
- proof of read-only upstream permissions;
- storage/retention/deletion and credential boundary record;
- failure-mode evidence, including empty results and unavailable backend;
- rollback/disable procedure;
- license/dependency review;
- normal repository CI/checks green on the exact candidate head.

## Stop conditions

Keep `HOLD` if the upstream source moves without deliberate rebind, a stable reproducible install cannot be established, the tool requires broader-than-read-only GitHub authority, prompt-injection/history content can affect agent authority, benchmark benefit is not measurable, source citations/freshness are not reliable, storage/retention cannot meet estate policy, or any normal repository control fails.

Do not use this candidate to mask the independent HF inventory drift in `.github#728` or Lyte projection drift in `lyte-services#18`.
