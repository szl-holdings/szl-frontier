# Codex handoff — SGLang DeepSeek V4.1 kernel stack

Canonical model/runtime issue: `szl-holdings/szl-frontier#134`  
Companion runtime-successor issue: `szl-holdings/szl-frontier#168`  
Governed wave: `frontier/waves/2026-09-16-sglang-deepseek-v41-kernel-stack.json`  
Disposition: **EVALUATION / HOLD**

## Objective

Evaluate the newly merged SGLang DeepSeek V4.1 kernel/sparse-indexer source boundary without creating a second DeepSeek V4.1 admission or inheriting qualification from the existing SGLang renderer, vLLM adaptive-verification, or generation-prompt waves.

Exact evaluation head: `sgl-project/sglang@faaff1eca8876b8b77d8704f080c3ee2064b8b65` (`#39648`, merged 2026-09-16T06:54:36Z).

Verified ancestors in this exact source line include:

- `91f691c4907739438e86ecb4e07dbd77cb93912f` / `#39646`: standalone DeepSeek V4.1 kernels and Python wrappers;
- `954bb6804a6331bbf6e5ff88675f972aaf0f12b2` / `#39547`: AMD DeepSeek V4 MTP crash correction.

The `91f691... -> faaff1...` comparison is three commits ahead with no divergence, and `954bb... -> faaff1...` is twelve commits ahead with no divergence. The exact head therefore includes both predecessors, but qualification remains path-specific and must not be generalized to unrelated intervening source changes.

## Why this is material

The successor adds or materially changes DeepSeek V4.1 sparse-indexer and kernel primitives: a small-row BF16 Top-k, block-max keys, candidate-block table construction, occupancy probing, Top-k v2 edge/cluster dispatch, small BF16 GEMMs, WO-A projection, Engram hash/gather/gating, Q RoPE/store, FP32 RMSNorm, HC/MXFP8 epilogues, row argmax, and decode-scheduling metadata. The Top-k fix also changes valid `-Inf` handling by using NaN padding so inactive entries cannot displace valid scores.

Upstream reports 288 Top-k v2 cases passing on SM90/SM100 and extracted standalone-kernel tests on one GB300, but the new sparse-indexer kernels do not have their own registered test suite. Those results are context, not SZL qualification.

## Deduplication and owners

Reuse the DeepSeek V4.1 ownership established by Frontier #134:

- `szl-holdings/szl-forge#310` — independent model/kernel oracles and exact-source correctness;
- `szl-holdings/szl-serve#9` — serving protocol, lifecycle, failure and rollback;
- `szl-holdings/szl-gpu-bridge#102` — accelerator/compiler/runtime/memory closure;
- `szl-holdings/szl-kernels` only if SZL-owned kernel code must actually change.

No receipt from Frontier #150, #149, #161, the baseline SGLang admission, or upstream CI transfers automatically.

## Execution plan

### 1. Bind immutable inputs

Record the exact SGLang source, built wheel/container/JIT artifact hashes, compiler/toolchain, CUDA or ROCm runtime and driver, device identity, and the exact DeepSeek-V4.1 model/checkpoint/tokenizer/encoding bytes already governed by Frontier #134. Moving upstream `main` or a different checkpoint gets no inherited result.

### 2. Independent sparse-indexer oracles

Create tiny deterministic reference implementations that do not call the candidate kernels. Compare `topk_bf16_small`, `block_amax`, and `candidate_block_table` against them over normal and adversarial fixtures:

- ragged rows and page transforms;
- duplicate scores and ties;
- legitimate `-Inf` values;
- NaN padding and key-space boundaries;
- newest-block `+Inf` forcing;
- empty/minimum/maximum supported row shapes;
- malformed or out-of-range candidate-table metadata.

The objective is output/index equivalence and explicit failure behavior, not merely successful compilation.

### 3. Dispatch and hardware separation

Qualify cluster and streaming paths independently. On SM90/SM100, prove the intended cluster width, occupancy-derived pool sizing, threshold behavior and result parity. On architectures that must use streaming, prove the cluster path is not silently selected. Any unavailable lane is `UNAVAILABLE`, not PASS.

For AMD, reproduce the MTP synchronization failure condition or an equivalent deterministic regression witness. Prove the exact source preserves D2H synchronization for MTP while limiting the synchronization skip to DSpark where intended. A source-only inspection is insufficient for an AMD PASS.

### 4. Primitive reachability and end-to-end correctness

Instrument the candidate so receipts show which standalone primitives were actually reached. Where reached, independently test small BF16 GEMM, WO-A, Engram hash/gather/gate, Q RoPE/store, FP32 RMSNorm, HC/MXFP8 epilogues, row argmax and decode-scheduling metadata. Mark unexercised primitives `UNQUALIFIED` rather than inferring coverage from source inclusion.

Then run fixed-seed DeepSeek-V4.1 baseline-versus-candidate fixtures with identical model bytes, prompt/protocol bytes, decoding controls and request corpus. Include supported sparse-indexer, MTP/DSpark, long-context, cancellation and restart cases. Correctness precedes latency, throughput or memory measurements.

### 5. Failure, lifecycle and rollback

Exercise malformed metadata, candidate/index bounds, cancellation, worker restart, cache lifecycle, JIT/build failure, unsupported hardware and explicit route rollback. A candidate failure must not silently substitute different model bytes, tokenizer/protocol, quantization, provider authority or policy.

## Receipt contract

Each result must bind source and artifact digests, exact model bytes, hardware/runtime/compiler identity, fixture revision, seed, declared tolerances, raw results, reachability state, and one of `PASS`, `FAIL`, `UNAVAILABLE`, `UNQUALIFIED`, or `HOLD`. Upstream accuracy/performance results remain `UPSTREAM_REPORTED_NOT_SZL_MEASURED` until reproduced.

## Projection boundary

No Hugging Face SZL artifact/runtime mutation, `a-11-oy.com` capability change, `a11oy.net` success proof, production route/default, weight mirror, provider authority, policy/provenance/license/receipt weakening, or branch-protection bypass is authorized by this wave. Promotion remains governed by the normal owner repositories after all required evidence closes.
