# Codex handoff — 2026-09-16 post-wave runtime correctness successors

Canonical issue: `szl-holdings/szl-frontier#168`  
Governed wave: `frontier/waves/2026-09-16-post-wave-runtime-correctness-successors.json`  
Source baseline observed: `szl-holdings/szl-frontier@27e49abd8dd500f28c54d9bf700d23e5542cb503`  
Disposition: **EVALUATION / HOLD**

## Objective

Prepare executable, evidence-producing qualification for three material exact-source successors that landed after the already-governed 2026-09-16 runtime-correctness wave. Do not create duplicate model admissions and do not infer production authority from upstream merge status.

Authority remains:

`GitHub source -> Hugging Face artifact/runtime projection -> a-11-oy.com product/runtime state -> a11oy.net proof/evidence state`

No downstream projection may advance until the owning repository's normal correctness, provenance, licensing, rollback and protected-branch gates are satisfied.

## Exact successor sources

### 1. vLLM DeepSeek V4.1 FlashMLA mega attention + NVFP4 compressed KV

- Upstream: `vllm-project/vllm`
- Exact source: `d6a1677d5504244c566eb900ca605cb5511f4ab4`
- Upstream PR: `#56935`
- Existing model/protocol authority: `szl-holdings/szl-frontier#134`
- Existing Sep-16 execution intake: `szl-holdings/szl-frontier#168`

This is a runtime/cache-format successor, not a second DeepSeek V4.1 model admission. It changes the attention execution path and introduces an NVFP4 compressed KV representation alongside the existing FP8 cache path.

Codex execution order:

1. In `szl-holdings/szl-forge#331`, add deterministic reference fixtures for FP8 and NVFP4 cache records, quantize/dequantize semantics, page/ragged boundaries and fused-vs-split output parity. Keep source/model/tokenizer identities exact.
2. In `szl-holdings/szl-gpu-bridge#105`, bind exact wheel/container, FlashMLA dependency, CUDA/compiler/driver and accelerator identity. Exercise SM100-specific behavior only where that exact hardware exists; otherwise emit `UNAVAILABLE`.
3. Only after correctness receipts exist, use the normal `szl-serve` lane to test request isolation, cache lifecycle, cancellation, restart, malformed metadata and rollback.
4. Measure memory/latency/throughput only after correctness passes. Upstream benchmark values are context, not SZL proof.

Required negatives: mixed/stale cache format, corrupt scale/layout metadata, unsupported hardware, unexercised fallback, restart with stale cache, and cancellation during cache mutation. Any silent fallback invalidates a claimed candidate-path PASS.

### 2. vLLM Kimi-K3 stateless first-chunk classification

- Upstream: `vllm-project/vllm`
- Exact source: `f8b5c11468f665c75968e3a7c12f16ca074f3a30`
- Upstream PR: `#51483`
- Existing Kimi-K3 admission: `szl-holdings/szl-frontier#47`
- Existing Sep-16 Kimi runtime successor: `szl-holdings/szl-frontier#168`

This is a recurrent-state correctness successor. A real first chunk with no prior state must initialize KDA state instead of being treated as an ordinary decode. Resumed one-token chunks and CUDA-graph capture rows must retain their distinct decode behavior.

Codex execution order:

1. Extend `szl-holdings/szl-forge#331` with exact-state fixtures for: true stateless first chunk; resumed one-token chunk; padding; missing prefill flag; mixed batch; speculative and non-speculative paths.
2. Assert the initial-state/index contract and ensure recycled state never crosses request boundaries.
3. Add fixed-seed incumbent-vs-candidate output parity and contradictory-metadata negatives.
4. In the accelerator/runtime owner, exercise full CUDA-graph capture separately and prove it stays decode-only.
5. Exercise cancellation, worker restart and rollback without carrying KDA state into a fresh request.

Do not broaden this fix into a general Kimi-K3 runtime promotion. The exact successor remains HOLD until its own evidence passes.

### 3. SGLang DeepSeek V4.1 communication kernels and wrappers

- Upstream: `sgl-project/sglang`
- Exact source: `7d5696b3a1638a7c980e46ed77eb876faad158a2`
- Upstream PR: `#39653`
- Existing DeepSeek V4.1 authority: `szl-holdings/szl-frontier#134`
- Prior exact SGLang kernel-stack head: `faaff1eca8876b8b77d8704f080c3ee2064b8b65` under `#168`

This source lands after the already-governed SGLang V4.1 kernel-stack head and adds distributed communication kernels/wrappers. Prior standalone/top-k kernel evidence cannot be inherited.

Codex execution order:

1. In `szl-holdings/szl-forge#331`, construct independent reference checks for each exercised wrapper/primitive: world size, rank mapping, counts, dtype, empty/ragged inputs, dropped slots, bounds and output parity.
2. In `szl-holdings/szl-gpu-bridge#105`, bind exact build/JIT/compiler/CUDA/NCCL-or-equivalent/driver/device topology and run real multi-accelerator tests. If that topology is unavailable, return `UNAVAILABLE`, never a simulated PASS.
3. Stress rank ordering, synchronization, repeated execution and phase/workspace reuse. Exercise peer/process failure, timeout, cancellation and worker restart; deadlock or cross-request contamination is a hard failure.
4. Run fixed-seed end-to-end DeepSeek V4.1 parity against the previously governed exact SGLang kernel-stack source before recording any communication-performance claim.
5. Preserve explicit rollback to the prior exact source/runtime.

Unreached communication primitives remain `UNQUALIFIED` even if sibling primitives pass.

## Ownership and evidence routing

- Canonical governance and deduplication: `szl-holdings/szl-frontier#168`
- DeepSeek V4.1 model/protocol authority: `szl-holdings/szl-frontier#134`
- Deterministic model/runtime evaluation: `szl-holdings/szl-forge#331`
- Accelerator/topology closure: `szl-holdings/szl-gpu-bridge#105`
- Serving/failure/rollback: existing `szl-serve` controls after prerequisite correctness receipts
- Product projection after qualification only: `szl-holdings/a11oy`
- Proof publication from exact measured receipts only: `szl-holdings/a11oy-net`

Do not create a second publisher, alternate proof path, manual provider-byte repair or direct production default. Do not rehost upstream weights merely to make inventory counts match.

## Alignment boundary observed during this sweep

GitHub protected A11oy main and the `a-11-oy.com` honesty endpoint were observed on the same exact source revision `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`, so the source-to-product SHA predicate is currently repaired. The public Hugging Face organization page showed 46 models, but a same-window native membership API observation was unavailable during this pass. `a11oy.net/models.json` remains a dated 2026-09-12 proof snapshot. Therefore **do not** close the residual alignment wave from the page count. `szl-holdings/szl-frontier#159` remains the canonical reconciliation owner until a fresh same-scope membership + proof observation closes under normal writers and receipts.

## Definition of done

A candidate may leave HOLD only when all applicable gates below are evidenced at the exact candidate source and exact executed artifact:

- source, binary/container and dependency provenance;
- license and model/checkpoint rights;
- deterministic correctness against an independent or incumbent reference;
- negative/failure/cancellation/restart cases;
- actual hardware/topology identity for hardware-specific claims;
- rollback/fallback verification;
- normal required checks and branch protections;
- no unresolved authority-chain contradiction;
- measured receipts suitable for the normal proof publisher.

`UNAVAILABLE` and `UNQUALIFIED` are valid terminal evaluation states. They must never be rewritten as PASS to complete a wave. Automatic production promotion remains false.
