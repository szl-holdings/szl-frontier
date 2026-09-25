# Codex handoff — Sep 19 morning serving, model and offload successors

Canonical governance: `szl-holdings/szl-frontier#180` / PR #181.

This handoff is additive to Waves A–H. It does not rewrite or inherit qualification from earlier evidence. GitHub source is authoritative. Any admitted change must follow the existing chain **GitHub -> canonical Hugging Face projection/runtime -> a-11-oy.com -> a11oy.net measured proof**. Missing model, hardware, runtime or provider evidence is `UNAVAILABLE` or `UNQUALIFIED`, never PASS.

## Exact newly observed upstream pins

| Candidate | Exact upstream source | PR | Initial SZL owner |
|---|---|---:|---|
| MiMo-V2.5 fused FP8 QKV sharding | `vllm-project/vllm@211e252d0b4f8429f9b15fc52bdfed07782c7f70` | #57508 | Forge -> GPU Bridge -> serving owner |
| non-V4 compiled MoE mHC isolation | `sgl-project/sglang@76f9213a411018547f4fd6a75f36feaa4d6bed58` | #40353 | Forge -> GPU Bridge |
| Omni prefix-cache Manager/Controller | `vllm-project/vllm-omni@470ec60848fa98e030298706cceff88ae8f691a8` | #6654 | Forge -> GPU Bridge -> serving owner |
| Omni distributed layerwise offload plan topology | `vllm-project/vllm-omni@ea84055507971c4a7f31d4efdba1488f50c264ae` | #7326 | Forge -> GPU Bridge |

Do not float any lane to newer upstream `main`. If a later upstream repair is required, create a separately pinned successor record.

## 1. MiMo-V2.5 fused FP8 QKV sharding

**Failure boundary.** The predecessor assumes checkpoint fused-QKV chunks align one-to-one with KV heads. MiMo-V2.5 SWA layers instead have eight KV heads over four checkpoint pre-shards, so FP8 weight rows and scale rows are reconstructed using incompatible geometry. The MTP draft path had a related scale-sharding error. Server startup is not sufficient proof of numerical correctness.

Codex execution:

1. Resolve the exact public `XiaomiMiMo/MiMo-V2.5` checkpoint/config/tokenizer revision and file identities. Record license and provenance. Never substitute another checkpoint or rehost weights for inventory.
2. Materialize the immediate predecessor and exact candidate worktrees. Bind vLLM, Torch, CUDA/ROCm, FP8 format, hardware, TP/EP and MTP settings.
3. Preserve the known-bad predecessor load or weight/scale mismatch. If the exact predecessor cannot execute on available hardware, record `UNAVAILABLE`; do not fabricate the crash.
4. Build an independent row-mapping oracle from checkpoint shard geometry. For GA, SWA and MTP tensors, prove every Q/K/V row and every scale block is consumed exactly once, with no gaps, overlaps or neighboring-block scale reuse.
5. Execute TP 1/2/4/8, including TP greater than KV heads where supported. Run MTP off/on and EP combinations supported by the model/runtime. Record actual tensor shapes and scale shapes per rank.
6. Compare dequantized tensors plus deterministic logits/output against an independently qualified Hugging Face reference. Upstream GSM8K and draft-acceptance numbers are supporting evidence, not SZL receipts.
7. Add malformed/missing scale metadata and partial-checkpoint controls. These must fail before serving rather than silently requantize from an ambiguous layout.
8. Full-model accelerator inference is mandatory for serving qualification. Preserve the prior qualified model route/runtime as rollback.

Acceptance: exact source + checkpoint identity, predecessor negative control where executable, row/scale oracle parity, full-model accelerator evidence, deterministic output parity, and rollback. Otherwise HOLD.

## 2. SGLang non-V4 compiled MoE mHC context isolation

**Failure boundary.** mHC overlap hooks introduced for DeepSeek-V4 were reachable through the shared DeepseekV2MoE implementation by non-V4 models such as DeepSeek-R1. Under compiled prefill, a non-V4 model can therefore execute `ContextVar.get` for a context it never installs and fail graph tracing/startup.

Codex execution:

1. Bind exact SGLang/Torch compiler source, DeepSeek-R1 and DeepSeek-V4 checkpoint revisions, accelerator, TP width, compiled-prefill backend, CUDA graph mode and dual-stream setting.
2. Reproduce the predecessor `ContextVar.get` compiler failure for non-V4 TP4/TP8 with empty and non-empty batches using the real forward path. A CPU fullgraph reproducer is acceptable as a deterministic negative control but does not qualify GPU numerics.
3. Candidate must keep mHC lookup completely unreachable for non-V4 models without inserting a graph break, globally disabling compile, or bypassing the shared MoE path.
4. Exercise TP1/4/8, normal and dual-stream MoE, empty/non-empty batches, eager vs compiled prefill and real accelerator execution. Compare deterministic outputs/logits against an eager qualified baseline.
5. Prove DeepSeek-V4 still schedules and consumes its mHC callbacks where intended. A repair that simply disables mHC for every model is a failure.
6. Include startup/restart, graph capture/recapture and mixed concurrent request controls. Preserve eager/non-compiled execution as rollback.

Acceptance: predecessor defect evidence, non-V4 compile isolation, V4 callback preservation, accelerator parity, no reduced graph coverage and rollback. Otherwise HOLD.

## 3. vLLM-Omni prefix cache Manager/Controller state machine

**Failure boundary.** The new split introduces an explicit cache correctness protocol: Manager owns occupancy/hit spans; Controller owns staging/copy/write. Each `save_outputs` step ID must be consumed exactly once, writes have explicit state transitions, staging exhaustion applies bounded backpressure, and published cache hashes create obligations about what data must exist behind them. This changes correctness, not merely architecture.

Codex execution:

1. Bind exact vLLM-Omni/vLLM source and image, model/deploy config, text/audio stage roles, cache-key inputs, accelerator devices, async-output state and prefix-cache settings.
2. Instrument the actual `WriteTask` state machine. Exercise `PENDING -> QUEUED -> COPYING -> HOST_READY -> WRITTEN` and `FAILED` from every valid non-terminal state. Record state transitions with request/step IDs but no sensitive content.
3. Prove each returned step ID is consumed exactly once via `materialize` XOR `discard_step`. Duplicate consumption, forgotten IDs and cross-request consumption must fail closed.
4. Exercise abort, cancellation, restart, failed write after a published hash, hidden-row absence, multimodal-key absence, cold/hot cache, concurrent requests and async output materialization after the engine starts the next step.
5. Force staging-slot exhaustion. Validate the bounded wait and distinguish leaked step IDs from stuck in-flight writes. Never turn this into an unbounded wait or drop cache-write failures silently.
6. Validate stage policy: KV-consumer / KV-both stages with connector-derived computed tokens must refuse prefix caching; pooling stages must not construct/use this cache. Producer-only supported stages may proceed.
7. Run text and full audio paths on real hardware with cache enabled/disabled. Compare golden output bytes where deterministic or a pinned semantic/reference digest otherwise. Prove no stale/foreign hidden state or cross-request cache hit.
8. Only after correctness, measure TTFT/TTFP/throughput and preserve full benchmark inputs, warm/cold distinction and hardware. Cache-disable remains rollback.

Acceptance: exactly-once step lifecycle, state-machine integrity, failure/hash consistency, stage-policy refusal, real multimodal hardware parity and rollback. Otherwise HOLD.

## 4. vLLM-Omni distributed layerwise offload plan topology

**Failure boundary.** The distributed layerwise offload backend previously rediscovered topology itself and could stage/hook earlier components before discovering a later invalid component. It also identified resident child state by names and could omit a submodule's own parameters/buffers. The candidate centralizes topology resolution before mutation.

Codex execution:

1. Bind exact vLLM-Omni/vLLM source/image, diffusion checkpoint and files, OffloadConfig, resolved plan, mmap files, host/GPU memory topology, transfer mode and selected components.
2. Construct a known-bad predecessor fixture with an initially streamable component followed by an unstageable declared/large submodule. Preserve evidence that predecessor discovers failure after earlier placement/hook mutation when reproducible.
3. Candidate must reject the full plan before any staging, hook install, mmap placement or resident-state mutation. Add an explicit before/after state digest proving fail-before-mutation.
4. Verify every resolved streamed/staged component, block ring and child component identity. Include each submodule's own parameters and buffers, not just named children.
5. Verify mmap weight identities and destinations one-to-one. Missing, duplicate, unexpected or wrong-residency tensors are hard failures.
6. Keep topology resolution separate from transfer/user policy. Tests must ensure a topology refactor cannot silently change OffloadConfig transfer mode or component selection.
7. Run real engine/checkpoint tests because the upstream local run excluded checkpoint-downloading engine tests. Exercise cancellation, restart and memory pressure on supported hardware.
8. Retain no-offload or the previously qualified offload mode as rollback and compare deterministic output parity before memory/performance claims.

Acceptance: pre-mutation validation, exact residency/mmap identity, real-engine evidence, policy/topology separation, output parity and rollback. Otherwise HOLD.

## Cross-candidate controls

For every lane:

- do not change production dependencies/defaults merely because upstream merged;
- exact source, checkpoint/container, dependency and hardware identities are required;
- use known-bad predecessor or deterministic negative controls where executable;
- run candidate-specific tests plus the complete owning-repository required suite;
- do not bypass failing tests, source witnesses, provenance, licensing, receipts, rulesets or branch protections;
- preserve rollback/fallback and explicitly test it;
- treat skipped jobs as skipped, not green;
- treat missing hardware/provider access as `UNAVAILABLE`, not PASS;
- no upstream benchmark is an SZL measurement until reproduced under a bound SZL execution receipt;
- do not rehost upstream weights merely to make inventory complete;
- no new HF Space/model/dataset/kernel is created unless the existing owner contract specifically requires it after source admission;
- product and proof projections happen only after protected source admission and exact runtime readback.

## Owner routing

- governance and deduplication: `szl-holdings/szl-frontier#180` / PR #181;
- deterministic/adversarial evaluation: `szl-holdings/szl-forge`;
- accelerator/hardware closure: `szl-holdings/szl-gpu-bridge`;
- serving integration: the existing active serving owner after qualification; do not create another serving stack;
- product/HF projection: `szl-holdings/a11oy` through the established single writer;
- proof: `szl-holdings/a11oy-net` from measured receipts only;
- residual authority-chain closure: existing `szl-holdings/szl-frontier#151`.

Current authority observation remains GitHub/HF/product source identity `43058398fb8ea346a7bd977f1a35391aeec1bf1a`; `a11oy.net/models.json` is still the dated 2026-09-12 proof record. Do not combine those different observation windows into a whole-chain PASS.
