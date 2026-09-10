# Codex handoff — Hugging Face core stack 2026-09-10

Status: **EVALUATION / HOLD**

Tracking: `szl-holdings/szl-frontier#60`

## Exact qualification sources

Use only these release-bound commits for qualification evidence:

- `huggingface/transformers@856157a2f3e9594954310df18fdccc31ffddebe9` — v5.17.0
- `huggingface/accelerate@6afc1e5ee217051fde702b23de2813344dc0fd33` — v1.15.0
- `huggingface/trl@3d9261f1fec9f9a8140099c78a65c7da73dce79c` — v1.13.0

Do not resolve moving upstream `main`. A later release or commit requires an intentional Frontier re-observation.

## Ownership

- `szl-holdings/szl-frontier`: immutable intake, provenance, disposition and evidence contract.
- `szl-holdings/szl-forge`: executable compatibility/performance matrix.
- Kernel repositories: only kernel-specific implementation changes proved necessary by evaluation.
- `szl-holdings/a11oy`: no product/runtime exposure from this intake.
- `szl-holdings/a11oy-net`: publish only evidence actually produced by a later governed evaluation.

## Required Forge work

Build one reproducible matrix against the current known-good Forge dependency closure. Record exact environment, package/source receipts and prior-stack rollback target.

### Transformers 5.17.0

Verify affected estate paths for import/API compatibility, generation behavior, cache failure semantics, Hub-kernel fallback visibility and custom vision 2D/3D RoPE handling. Confirm generation does not unconditionally fetch remote Hub files in the bounded test. Do not turn framework architecture support into a model qualification claim. Hy4 and NeoMME are already represented elsewhere and must not be duplicated.

### Accelerate 1.15.0

Where hardware permits, test FSDP2 layer-level activation checkpointing, checkpoint-input offload, save/load, tied embeddings, PEFT adapter full-state handling and DTensor gradient clipping. If the required distributed/GPU/NPU backend is unavailable, record `UNAVAILABLE` with environment evidence; never synthesize a PASS.

### TRL 1.13.0

Test `chunked_nll`, fused-linear loss parity on deterministic fixtures, long-context configuration validation, vLLM compatibility/fail-fast paths, model-revision forwarding, and explicit migration behavior for removed PPO APIs. Upstream 1M-token and performance numbers are reference evidence only until reproduced on SZL-controlled hardware.

## Negative paths

Require deterministic failures for incompatible dependency floors, removed PPO imports, unavailable vLLM/backend, malformed long-context configuration, kernel fallback or missing kernel visibility, paged attention without cache where applicable, and rollback to the current known-good stack.

## Promotion boundary

Do not alter production dependency locks, model/provider defaults, A11oy routing, Hub publication, autonomous authority, branch protection, provenance policy, receipts, licensing controls or rollback/fallback until a successor wave proves the relevant normal gates. Independent `.github#728` and `lyte-services#18` alignment drift remains outside this wave.
