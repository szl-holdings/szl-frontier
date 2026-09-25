# Codex handoff — GLM Kpool stride and SimpleCPUOffload scratch-group integrity

## Scope

Advance only the exact-source candidates governed by `frontier/waves/2026-09-20-midmorning-glm-kpool-offload-integrity-successors.json`.

This handoff is **EVALUATION / HOLD**. It does not authorize production promotion, dependency/default changes, model publication, weight acquisition/rehosting, paid compute, training, new provider credentials, a second serving stack, or protection weakening.

Canonical governance remains `szl-holdings/szl-frontier#180`. Deterministic fixtures belong in `szl-holdings/szl-forge`; hardware closure belongs in `szl-holdings/szl-gpu-bridge` only when already-available affected hardware is present. Integrate serving only through the existing importing owner after prerequisite receipts pass. Product/HF projection remains `szl-holdings/a11oy`; proof remains `szl-holdings/a11oy-net`.

## Candidate A — NVIDIA GLM-5.3-Flash Kpool padded-stride corruption

Exact upstream source: `vllm-project/vllm@db1bfdd4fb0dd7b8226402ee00abc7a987561b7c`, PR #57477.

Root contract: a Kpool tail view that aliases padded indexer storage must be addressed by its actual runtime strides. A dense-stride writer must never be able to seed one request's tail by overwriting another request's persistent indexer bytes.

### Phase A1 — no-weight deterministic fixture

Build the smallest source-bound fixture that constructs or faithfully reproduces the padded/aliased tail/indexer storage geometry. Use sentinels and multiple block ids. Require a known-bad predecessor to demonstrate the misplaced write. The candidate must:

1. seed exactly the intended tail block;
2. leave unrelated indexer/tail blocks byte-identical;
3. preserve expected gate/score/K bytes;
4. cover low and high block ids plus more than one concurrent request identity;
5. cover cache reset/cancellation/restart semantics where the owning helper exposes them.

Do not substitute a dense standalone tensor for the aliased runtime geometry and call that sufficient.

### Phase A2 — accelerator closure only if already available

If an affected NVIDIA runtime and legally usable existing GLM-5.3-Flash checkpoint are already available to SZL, bind checkpoint/config/tokenizer, vLLM build/container, CUDA/Triton/compiler and device identity. Exercise prefix-cache reuse, prefill->decode, repeated unrelated requests, cache reset and restart. Compare candidate logits/output against an independent correct or cache-disabled reference under a predeclared tolerance.

AMD may be used only as a non-regression/control lane because upstream already used stride-aware addressing there. An AMD PASS is never NVIDIA qualification. Missing affected hardware/model is `UNAVAILABLE`, not PASS.

Rollback: retain the incumbent qualified backend or disable the candidate Kpool path.

## Candidate B — SimpleCPUOffload non-prefix-cacheable group isolation

Exact upstream source: `vllm-project/vllm@f648eed23dc48fcc8ba64be0c4182f8e775b5bfa`, PR #56810.

Root contract: Kpool/QSA/circular-buffer scratch groups with `prefix_cacheable=false` have no durable prefix-cache hash identity and must not participate in CPU prefix-cache store/load/hash/event semantics.

### Phase B1 — deterministic scheduler/event closure

Use no model weights. Construct a cacheable attention group plus a non-prefix-cacheable scratch group whose block size is deliberately incompatible with the request hash block size. Require the predecessor to reproduce the divisibility/assertion failure when KV events are enabled. The candidate must prove:

1. scratch groups are excluded from request-hash resolution;
2. scratch groups are excluded from CPU store/load pairs and durable hit accounting;
3. scratch groups emit no `BlockStored`/`BlockRemoved` durability claims;
4. cacheable attention groups still store/load correctly and emit exact event metadata;
5. events on/off, first prefill, hit/miss, eviction/reset and restart remain deterministic;
6. every separately admitted eager/lazy mode is tested independently; otherwise it stays `UNQUALIFIED`.

### Phase B2 — optional existing-runtime closure

Only if an already-available GLM-5.3-Flash runtime exists, bind exact model/runtime/hardware identities and compare cache-disabled, GPU-hit and CPU-hit paths with byte/token/block accounting before output/performance interpretation. Upstream's 4x GB300 measurements are supporting upstream evidence only and must not be copied into SZL proof as measured results.

Rollback: disable SimpleCPUOffload or return to the incumbent qualified connector/runtime path.

## Cross-candidate negative controls

- Do not merge evidence from #57317 Kpool long-position/OOB mapping into Candidate A.
- Do not merge evidence from #57160 ROCm pinned-memory startup into Candidate B.
- Do not treat Candidate A and Candidate B as one defect merely because both mention GLM/Kpool.
- Do not infer model quality, throughput, production readiness, or publisher integrity from source tests.
- Do not start paid accelerator work to make this wave pass.

## Required receipts

For every executed lane record exact source SHA, build/package/container digest, fixture/input digest, runtime/hardware identity when applicable, test command, raw result digest, known-bad control result, rollback state and explicit `UNAVAILABLE`/`UNQUALIFIED` paths. Never rewrite a completed receipt; create a successor.

## Exit

Leave both candidates `HOLD` unless all evidence required for the exact exercised scope is present under normal repository controls. Promotion, if ever justified, must proceed through the current owning repositories and exact-head gates; this document grants no production authorization.
