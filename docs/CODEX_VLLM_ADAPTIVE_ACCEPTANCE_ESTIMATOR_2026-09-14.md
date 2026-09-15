# Codex handoff — vLLM adaptive acceptance estimator successor

Canonical issue: `szl-holdings/szl-frontier#134`  
Canonical companion wave: `frontier/waves/2026-09-14-vllm-adaptive-acceptance-estimator.json`  
Upstream vLLM source: `3bb0a03f35269185b6358753e64932bb946cc531`  
Disposition: **EVALUATION / HOLD**

## Why this is a successor, not a new model admission

DeepSeek-V4.1-Flash is already governed by Frontier #134 and its merged execution handoff #138. That handoff already assigns Forge #310, Serve #9 and GPU Bridge #102. This source therefore extends the serving/evaluation boundary; it does not create another DeepSeek model owner and does not inherit qualification from the existing vLLM 0.29 waves.

The upstream source adds an `OnlineAcceptanceEstimator` that estimates per-position speculative-token acceptance from the draft-logit distribution and calibrates itself online. The current code path can use that estimator when adaptive verification is enabled without a trained confidence head; DSpark disables the estimator when its trained confidence head is present.

Current upstream documentation still says adaptive verification is supported only for DSpark with a confidence head. Treat that code/documentation disagreement as an evidence gap. Do not convert source inspection into a broad capability claim.

## Execution order

### 1. `szl-forge#310` — correctness before throughput

Add an exact-source evaluation lane for `vllm-project/vllm@3bb0a03f35269185b6358753e64932bb946cc531`. If a later revision is required to obtain a runnable engine, pin that later revision separately and record its relationship to this feature source; do not float `main`.

Deterministically reproduce:

1. acceptance-probability calculation from fixed logits and temperatures;
2. request-state-slot to step-batch mapping under request reordering;
3. cudagraph padded rows never writing to a live request slot;
4. estimator cold-start behavior;
5. online accumulation/refit and coefficient stability;
6. full-block baseline vs estimator-driven adaptive verification on fixed prompts, model bytes and seeds;
7. accepted/rejected token accounting and emitted-output equality/correctness before any speed comparison;
8. cancellation/request removal and estimator state isolation.

Record estimator calibration error and token-admission behavior separately from end-to-end throughput.

### 2. `szl-gpu-bridge#102` — execution envelope

Bind accelerator, driver, CUDA, Torch, Triton, vLLM revision/container digest and graph-capture settings. Adaptive verification requires full cudagraph support. `--enforce-eager` or an incompatible graph path must fail fast rather than silently disabling the gate.

Exercise attention backends with device-decided query lengths. If a backend plans from CPU query lengths and is therefore incompatible, receipt `UNAVAILABLE` or explicit refusal.

### 3. `szl-serve#9` — serving and rollback

Keep the incumbent non-adaptive path available. Prove:

- feature disabled -> incumbent full-block behavior;
- LoRA is refused for this path while upstream marks it unsupported;
- pipeline parallelism is refused while unsupported;
- incompatible attention backends refuse at startup;
- cancellation, worker restart and rollback do not leak estimator state across requests;
- exact serving revision and configuration are visible in the receipt.

No automatic fallback may silently change model bytes, quantization, tokenizer/protocol or provider authority.

### 4. Frontier #134 model/protocol gates remain authoritative

This runtime successor cannot independently qualify DeepSeek-V4.1-Flash. Keep all exact model revision, multimodal protocol, CED/CSA2/KV, licensing, hardware and rollback gates from #134 in force. Speculative decode speed does not substitute for baseline output correctness.

### 5. Projection boundary

Until exact-source evaluation passes normal controls:

- no new SZL Hugging Face runtime projection;
- no `a-11-oy.com` capability/default claim;
- no `a11oy.net` success claim beyond measured receipts and known bounds.

## Exit criteria

Remain **HOLD** unless exact-source fixtures prove estimator math/state isolation, adaptive vs baseline correctness, limitation fail-fast behavior, cancellation/restart/rollback, exact hardware/runtime identity, and measured benefit under the same workload. Required repository checks and protected-branch controls remain unchanged.
