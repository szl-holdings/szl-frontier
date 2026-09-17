# Codex handoff — Cosmos3 checkpoint-owned ModelOpt FP8 denoising policy

Canonical issue: `szl-holdings/szl-frontier#147`  
Canonical wave: `frontier/waves/2026-09-14-cosmos3-modelopt-fp8-policy.json`  
Upstream Diffusers source: `759164b7ad116e091e9d3e222211c9aa27d835f6`  
Disposition: **EVALUATION / HOLD**

## Objective

Qualify the new Cosmos3 ModelOpt FP8 runtime-policy boundary without inheriting generic ModelOpt qualification or treating a moving Hub `fp8` ref as evidence. The checkpoint may declare `diffusion_step_policy`; Diffusers can then use W8A16 on edge scheduler steps and native W8A8 in the middle. Missing policy remains all-W8A8. Incomplete policy must fail closed.

No production route, package/default, weight mirror, product claim or proof success is authorized by this handoff.

## Execution order

### 1. `szl-forge` — exact artifact and deterministic correctness

Create a bounded evaluation lane that accepts only:

- exact Diffusers revision `759164b7ad116e091e9d3e222211c9aa27d835f6`;
- an immutable Hugging Face commit for each Cosmos3 checkpoint under test;
- recorded digests for `transformer/config.json`, quantization metadata and every weight shard actually consumed;
- an explicit ModelOpt/runtime identity supplied by the hardware lane.

Deterministic fixtures must cover:

1. checkpoint policy present and valid;
2. no policy -> all-W8A8;
3. malformed/incomplete policy -> refusal;
4. on-disk policy recovery when the live restored quantization config omits the policy;
5. non-ModelOpt quantizer -> unchanged native forward;
6. W8A16 first/last step selection and W8A8 middle-step selection;
7. identical precision for CFG conditional/unconditional calls within one scheduler step;
8. explicit all-W8A8 override;
9. BF16/FP16/FP32 activation paths where upstream claims support;
10. fixed-seed output and temporal-stability comparison against all-W8A8 and an incumbent non-quantized fallback.

The upstream change intentionally lacks focused runtime unit tests after review. Do not use upstream merge status as a substitute for these tests.

### 2. `szl-gpu-bridge` — ModelOpt and hardware closure

Pin and receipt:

- accelerator SKU and compute capability;
- driver and CUDA versions;
- exact ModelOpt package/source;
- Torch/Diffusers dependency closure;
- container image digest;
- VRAM and host-memory envelope.

Exercise supported and unsupported device paths. Unsupported stacks are `UNAVAILABLE`; they are never represented by a simulated PASS.

Measure cold start, latency, throughput, VRAM and recovery separately from output-quality metrics. Upstream workstation percentages remain `UPSTREAM_REPORTED_NOT_SZL_MEASURED` until reproduced on the bound stack.

### 3. `szl-serve` — route, failure and rollback contract

Only after Forge and GPU Bridge return exact-source receipts:

- expose an evaluation-only profile;
- preserve the incumbent route as fallback;
- refuse config/artifact digest mismatch;
- test cancellation, OOM, restore failure, process restart and rollback;
- never silently substitute a different quantizer, checkpoint revision or precision policy.

### 4. `a11oy` / Hugging Face projection

No product/runtime projection is authorized while the wave is HOLD. If normal gates later pass, project only the qualified exact artifact/runtime tuple and retain rollback. Do not mirror upstream weights just to populate inventory.

### 5. `a11oy-net`

Publish only measured receipts and known bounds. Do not publish upstream flicker/performance statements as SZL measurements.

## License and provenance gate

The official Cosmos3 Hub family currently presents OpenMDW 1.1. Review the exact artifact revision and all runtime/container/dependency terms for the intended use before any redistribution or product promotion. Preserve source URLs, immutable revisions and digests in every receipt.

## Exit criteria

Promotion remains false until all of the following are true under normal repository controls:

- exact Diffusers and Hub revisions are immutable and receipt-bound;
- deterministic policy/runtime tests pass;
- artifact/config mismatch and malformed policy fail closed;
- quality/temporal-stability evidence and performance evidence are measured separately;
- exact GPU/ModelOpt/container stack is qualified;
- failure/restart/rollback is proven;
- licensing is cleared for the intended use;
- required repository checks and protected-branch controls pass.

Anything less remains **EVALUATION / HOLD**.
