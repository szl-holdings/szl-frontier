# Codex handoff — Sep 19 late FlashMLA and ragged-decode successors

Canonical governance: `szl-holdings/szl-frontier#180`

Governed wave: `frontier/waves/2026-09-19-late-flashmla-ragged-decode-successors.json`

Observed protected Frontier source: `32b2173062dde7098cb881b9264d612324317b4c`

Disposition: **EVALUATION / HOLD**. This handoff authorizes bounded deterministic preparation and owner-local evaluation only. It does not authorize dependency/default changes, provider writes, model publication, weight mirroring, paid jobs, production promotion, proof-success claims, credential changes, branch-protection bypass, or weaker tests/licensing/provenance.

## Exact upstream pins

| Candidate | Exact source | Upstream PR | Existing owner after governance |
|---|---|---:|---|
| `fp8_ds_mla` writer/reader power-of-two scale contract | `vllm-project/vllm@a7fda4c88bfc421d31e33acc5e01e86ebe467ad8` | #49435 | Forge + GPU Bridge; serving owner only after qualification |
| sparse-indexer ragged-decode padded path | `vllm-project/vllm@133b71e0beec3c7bcaae5b0839a03e7e88d20bc7` | #52500 | Forge + GPU Bridge; serving owner only after qualification |

Both merge commits were read directly from upstream GitHub and reported `verification.verified=true`, `reason=valid`. Exact-revision searches in the SZL Frontier catalog/default source and accessible issue queue found no existing governed record for either revision before this wave. Existing DeepSeek/Kimi/cache/indexer waves transfer no qualification.

## 1. Preflight

1. Read current protected `szl-frontier/main`, #180, #181, Forge/GPU Bridge queues, and the actual active serving consumer before writing implementation code.
2. Re-deduplicate the exact upstream SHA and evaluation predicate. Do not open another model admission or serving stack.
3. Put source-level numerical/shape fixtures in `szl-holdings/szl-forge` unless the importing owner already has the exact harness. Accelerator closure belongs to `szl-holdings/szl-gpu-bridge` or the already established hardware owner.
4. Every receipt binds SZL source SHA, upstream SHA, exact package/image, immutable fixture hashes, dependency lock, result, hardware/runtime where exercised, and known limits.
5. Missing architecture, checkpoint, license/right, or executable path is `UNAVAILABLE`/`UNQUALIFIED`, never PASS. New paid spend is zero.

## 2. `fp8_ds_mla` writer/reader scale contract

Primary source: `https://github.com/vllm-project/vllm/pull/49435`

Exact merge: `a7fda4c88bfc421d31e33acc5e01e86ebe467ad8`.

### Why this matters

The physical cache row remains 656 bytes: 512 FP8 NoPE bytes, four FP32 scale fields, and a BF16 RoPE tail. The predecessor could write an arbitrary FP32 scale while the SM90 and SM100 reader paths reduce that scale through different representations. That allows the effective dequantization scale read later to differ from the one used to write the FP8 values. The successor rounds the scale to a power of two after a `1e-4` lower bound across native CUDA, DeepSeek-V3.2 Triton and Kimi-K3 writers.

### Disconfirming evidence that must remain visible

- Upstream explicitly made **no performance claim**; one reported candidate serving run was slower than its control.
- The upstream PR description stated that a full SM90 model evaluation remained outstanding. A GB300/SM103 build/test is not an SM90 model receipt.
- Green source/kernel tests do not qualify every model/checkpoint that consumes the layout.

### Deterministic source lane

Build a small independent reference for the 128-value tile scale:

```text
scale = 2 ** ceil(log2(max(amax / 448, 1e-4)))
```

Cover at minimum:

- all-zero tile;
- values immediately below/at/above `1e-4 * 448`;
- power-of-two boundaries;
- near-FP8 saturation;
- NaN/Inf rejection behavior as actually defined by the owning source;
- byte layout and four scale offsets in the 656-byte row.

Run an immediate predecessor or equivalent known-bad control with non-power-of-two scales and show the writer/reader effective-scale mismatch. Then require exact agreement among the independent oracle and every writer implementation actually present in the executed build.

### Accelerator/runtime closure

Qualify architectures independently. For each actually available architecture bind exact CUDA, driver, Torch, Triton, FlashMLA and model identities. Exercise cache warm/cold, cache-hit vs cache-disabled output/logit parity, prefix reuse, cancellation, restart, and mixed request shapes. Do not infer SM90 from SM100/SM103 or vice versa.

Performance measurements are allowed only after correctness closes and must retain slower results. Cache-disable or the previously qualified non-FP8/incumbent path remains rollback.

## 3. Sparse-indexer ragged-decode padded path

Primary source: `https://github.com/vllm-project/vllm/pull/52500`

Exact merge: `133b71e0beec3c7bcaae5b0839a03e7e88d20bc7`.

### Why this matters

The predecessor can enter a uniform decode reshape when `requires_padding=false` even though the mixed/warmup decode batch is ragged. The observed upstream failure was 8 decode tokens across 6 requests on SM120/GB10 TP2. The successor adds a modulo-based padded-path condition and uses the same predicate for pack and unpack.

### Critical limitation to test, not hide

The upstream source itself records that divisibility is **necessary but not sufficient** to establish a uniform batch. A shape such as `decode_lens=[1,2,3]` has six tokens over three sequences and therefore passes the modulo test even though it is ragged. The candidate is acceptable only if the independently generated metadata reliably sets `requires_padding=true` for every such supported shape. If a reachable false-negative exists, leave this candidate HOLD and prepare a separate narrow successor; do not weaken this test or claim the modulo condition fully solves raggedness.

### Required matrix

Source/shape fixtures first, without model weights:

- zero-token and one-request controls;
- uniform divisible batches;
- non-divisible ragged batches including the 8/6 predecessor shape;
- divisible ragged patterns including `[1,2,3]`, `[1,1,4]`, permutations, short chunked-prefill tails and mixed warmup/decode;
- exact agreement between pack and unpack path selection.

For each supported class, assert the padded/reference implementation produces the same top-k indices and shape semantics. Fail closed on any path where metadata and actual raggedness disagree.

On already available affected hardware, add CUDA-graph capture/replay, TP topology, cancellation, worker restart and any actually supported speculative mode. Compare top-k indices, logits and deterministic outputs to an independently correct padded/reference path. No crash alone is not enough; silent shape/index divergence must also be excluded.

The padded/reference route is rollback. Do not promote a serving default while a supported ragged class remains unqualified.

## 4. Release boundary

For both candidates:

- no inherited qualification from prior vLLM, DeepSeek, Kimi, cache or hardware waves;
- no new weight acquisition or mirror merely for evaluation inventory;
- no paid accelerator dispatch from this handoff;
- preserve scanners, signatures, provenance, branch rules and exact-head checks;
- retain predecessor failures and negative controls as evidence;
- promotion, if ever eligible, proceeds only through the owning repository's normal protected controls after exact execution evidence passes.

Hugging Face/product projection remains downstream of admitted GitHub source. `a11oy.net` may publish only measured exact-subject receipts. Residual whole-chain alignment remains independently owned by `szl-holdings/szl-frontier#151`.
