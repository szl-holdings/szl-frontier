# Codex handoff — Harbor private Hugging Face Dataset evaluation

Status: **EVALUATION / HOLD**

Evaluate only `huggingface/harbor-hf@8685727908e8d9ee5ccde48586864a851e24ff79`. Do not follow moving `main`. This succeeds the earlier provider-reference Harbor wave but does not erase it.

## Owning implementation repository

`szl-holdings/szl-forge`

## Required bounded lane

1. Use a purpose-created non-sensitive private Hugging Face Dataset or a deterministic private-repository fixture. Do not ingest any production/private business corpus.
2. Pin the Dataset repository plus exact commit/revision and record file inventory/content SHA-256 digests before evaluation.
3. Exercise the host-restricted Git credential helper and prove it answers only for `huggingface.co`. Reject credentials embedded in URLs, argv, persisted Git config, stdout/stderr, browser payloads, receipts or benchmark records.
4. Keep control `HF_TOKEN`, inference credentials and GitHub credentials distinct. Catalog discovery remains secret-free. The trial agent/model process must not receive control `HF_TOKEN`.
5. Prove missing token, insufficient read grant, missing `git-lfs`, failed LFS materialization and source-revision drift fail before inference as explicit `UNAVAILABLE`/`HOLD`, never synthetic PASS.
6. Prove the evaluation credential is read-only: no commit, upload, delete, visibility/grant change or dataset publication is allowed.
7. Exercise token rotation/revocation and cleanup of cached checkout/materialized LFS data. A revoked credential must deterministically deny new retrieval.
8. Treat remote Jobs listings as moving observations. Bound pagination/reconciliation scans and mark partial history explicitly; never infer completeness from a truncated or moving page set.
9. Record exact Harbor source, Python/Node/Git/Git-LFS versions, container/image identity, Dataset revision/content digests, exit states, failure evidence and rollback instructions in immutable receipts.

## Acceptance boundary

A completed evaluation may establish that the private-Dataset source path behaves correctly under the fixed test fixture. It does **not** authorize production corpus ingestion, broader token grants, model training, provider writes, deployment, serving-route changes, model qualification or automatic promotion.

Tracking: `szl-frontier#83`.
