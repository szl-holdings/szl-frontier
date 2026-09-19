# Codex handoff — Sep 18 evening model, serving and deployment integrity successors

Canonical governance: `szl-holdings/szl-frontier#180`

Governed wave: `frontier/waves/2026-09-18-evening-model-serving-integrity-successors.json`

Observed protected Frontier source: `10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e`

Disposition: **EVALUATION / HOLD**. This handoff prepares deterministic qualification only. It does not authorize dependency/default changes, provider writes, model publication, weight mirrors, tool execution, proof-success claims, branch-protection bypass or automatic promotion.

## Exact upstream pins

| Candidate | Exact source | PR | Primary evaluation owner |
|---|---|---:|---|
| Mistral-Large-3 YaRN attention scaling | `vllm-project/vllm@2bdae2a5a83fe8e5640078a3d4bfe86cce323d0b` | #57563 | Forge + serving owner |
| DeepSeek-V4 fused-MoE EP distribution | `vllm-project/vllm@017dced6a6fd3cf430e4686a47b354da1cadfbf5` | #57465 | Forge + GPU Bridge |
| SGLang top-1 MoE routed scaling | `sgl-project/sglang@7714b182f223bdcd1b376c6ade369d9c48dfb7ac` | #40187 | Forge + serving owner |
| SGLang mistral_common tool prompt identity | `sgl-project/sglang@21e6c98ccbb3d85e716e7639786e7f6135c6d86c` | #39773 | Forge + serving owner |
| PEFT rslora weighted-adapter scaling | `huggingface/peft@fd3a7b1f310c6507ccb8191eb05f404aaf4b36ce` | #3449 | Forge |
| Diffusers Qwen-Image 2.1 pipeline | `huggingface/diffusers@6256aa7666cedd47443adc8f82da9a10e110b09c` | #14804 | Forge + GPU Bridge |
| HF Hub Jobs CLI launch flags | `huggingface/huggingface_hub@83ba61a53721caaf3cc2d53e65a25315519be122` | #4936 | Forge |
| vLLM active-LoRA fast-prefill padding | `vllm-project/vllm@a1bf8ac12d9f1537ff2d233f5ab3d1346fd8bd44` | #56456 | Forge + serving owner |

Every lane must preserve its exact executed commit/container/package, model/artifact identity, inputs, dependencies, runtime/hardware, commands, results and known bounds. Upstream tests, an adjacent backend, an older SZL receipt, or green Frontier governance does not transfer qualification.

## Execution contract

### 1. Preflight, ownership and deduplication

1. Read protected `szl-frontier/main` and current PR #181 before writing. Preserve this observation as historical evidence if protected main or the PR branch moves; never silently rewrite prior exact-source receipts.
2. Deduplicate by exact upstream revision, responsibility and predicate. Extend the existing owner rather than creating another inference, training, serving, deployment or model-publication stack.
3. Put deterministic evaluation in `szl-holdings/szl-forge` unless an existing active runtime owner already carries the relevant harness. Put accelerator-specific topology closure in `szl-holdings/szl-gpu-bridge`.
4. Missing model access, hardware, topology, provider permission or reproducible predecessor remains `UNAVAILABLE` or `UNQUALIFIED`, never zero or PASS.
5. Keep production defaults, branch rules, provenance, licensing, receipts, rollback/fallback and all required tests unchanged during intake.

### 2. Mistral-Large-3 YaRN attention scaling

Pin the exact Mistral-Large-3 checkpoint/config/tokenizer and vLLM/Transformers/Torch/CUDA revisions. Capture the raw Mistral `yarn` configuration and adapted `rope_parameters`.

Run predecessor and candidate with `apply_scale=false`. The predecessor receipt must show whether the wrong YaRN magnitude path was selected; the candidate must produce `attention_factor=1.0` and choose the non-YaRN-magnitude DeepSeek-style RoPE path. Include `apply_scale=true` as a non-regression control. Compare deterministic short- and long-context logits plus an appropriate held-out accuracy/perplexity slice to an independently executed reference. Configuration-unit tests alone cannot qualify the model/runtime.

### 3. DeepSeek-V4 fused MoE expert-parallel ownership

Use an actual topology where TP and EP sizes differ. Record the EP process group, rank, world size, logical/physical/redundant/shared expert counts and each rank's expert interval for predecessor and candidate.

Qualification requires each physical/logical expert to be assigned exactly once with no gaps or overlaps and outputs/logits to match a non-fused or otherwise independently qualified reference within declared tolerances. Exercise redundant experts, restart/rebalance and invalid topology/divisibility. No scaling or throughput claim precedes topology/output correctness.

### 4. SGLang top-1 MoE routed scaling

Build deterministic fixtures for top-k=1 with several non-unit `routed_scaling_factor` values. Preserve predecessor output and compare candidate output against a simple explicit reference that applies the routed scaling after expert output. Include unit scaling, top-k>1 and LoRA-hook present/absent controls. Exercise supported fused-reduction, graph/eager and quantized/non-quantized paths. Preserve rollback and reject non-finite output.

### 5. mistral_common prompt-token integrity for tools

Pin model/tokenizer/mistral_common revisions and hash the chat template and tool schema. For representative prompts, preserve both `apply_chat_template(tokenize=true)` IDs and rendered-text-then-encoded IDs. The candidate may select direct IDs only when the probe proves round-trip lossiness.

Exercise tool choice auto/required/none where supported, multiple tools, cached/uncached templates, streaming/non-streaming and text/multimodal requests. Verify exact final input IDs, BOS/control-token count and no prompt corruption. This qualifies prompt construction only: tool selection/arguments and every effector remain subject to their existing downstream gates and may not be enabled from this receipt.

### 6. PEFT weighted rslora adapter composition

Pin base model and source-adapter artifact hashes/configs, ranks, alphas, `use_rslora`, weights, combination type and dtype. Run predecessor and candidate for linear and cat composition using deterministic adapters and compare delta weights plus model outputs with an independently computed weighted composition.

Include multiple ranks, non-unit weights, non-rslora control, save/reload and merge/unmerge. The upstream commit explicitly leaves a separate SVD double-scaling problem; label SVD `UNQUALIFIED` and do not allow this wave's receipt to cover it. No adapter artifact overwrite/publication until numerical, provenance/license and rollback gates close.

### 7. Qwen-Image 2.1 Diffusers pipeline

Primary Hugging Face Diffusers documentation references `Qwen/Qwen-Image-2.1`, but the connected Hub details lookup did not resolve that model during this observation. Before any execution, obtain the exact public checkpoint revision/file identities from an allowed primary HF source. If that cannot be done, emit `UNAVAILABLE_MODEL_IDENTITY` and stop this lane; do not substitute another Qwen image model.

Once identity is closed, bind Diffusers, checkpoint, Qwen3-VL encoder/processor, VAE/transformer subfolders, Torch/CUDA, attention processor, dtype, resolution, seed and condition-image hashes. Compare default segmented block-causal attention and compiled flex attention against a declared reference tolerance. Exercise KV cache on/off, batch 1/>1, multiple prompts/conditions, `num_images_per_prompt>1`, empty prompt, save/reload and tiled VAE shape. Memory/performance comes after output/cache correctness. Never mirror upstream weights just to make inventory easier.

### 8. Hugging Face Jobs CLI launch-argument integrity

Use bounded non-secret test jobs only. Pin the exact `huggingface_hub` source/package and preserve the complete local CLI argv, namespace, test image/script identity and output mode.

Demonstrate the predecessor parsing defect with `--format`, `--json` and `-q` around normal options without launching consequential work. Candidate tests must cover `hf jobs run`, `hf jobs uv run`, `hf jobs scheduled run` and `hf jobs scheduled uv run`, human/json/quiet and detached/non-detached forms, and `--` when a child script intentionally consumes identically named flags. A valid returned Job ID proves submission only, not workload success. Do not mutate production schedules, secrets, billing/resource groups or default flavors.

### 9. vLLM active-LoRA fast-prefill padding

Bind the base model and every active adapter revision/hash, exact vLLM build, CUDA-graph mode, token count, request count and `num_active_loras`. Reproduce a predecessor case where the no-LoRA graph would pad differently from an active-LoRA batch.

Exercise token counts around graph boundaries and 1/2/4 active adapters, eager/captured modes, adapter add/remove between batches, cancellation/restart and mixed LoRA/non-LoRA requests. Candidate metadata must preserve the same active-adapter count and token/logits-index shape as main dispatch. Compare outputs/logprobs with fast prefill disabled. The non-fast-prefill path is rollback.

## Common evidence requirements

For every executable lane:

- run an immediate-predecessor or known-bad negative control where technically possible;
- preserve exact upstream/model/package/runtime/hardware identities;
- hash deterministic fixtures and label synthetic evidence `SYNTHETIC_TEST`;
- capture failure, cancellation, restart and rollback behavior appropriate to the component;
- never convert an upstream benchmark or unit test into an SZL measured receipt;
- never silently switch model, backend, hardware or provider when the requested target is unavailable;
- keep licensing/source-content authorization separate from software correctness.

## Publication order

Only after a lane's owner-level qualification truly passes normal controls:

1. protected source admission in the owning GitHub repository;
2. canonical Hugging Face projection through the existing single writer only;
3. exact runtime/artifact readback tied to admitted source;
4. `a-11-oy.com` product state only from that readback;
5. `a11oy.net` proof only from measured receipts.

Residual whole-chain alignment stays owned by `szl-holdings/szl-frontier#151`. Do not combine observations taken at different times into a synthetic chain PASS.

## Exit criteria

A candidate leaves HOLD only when exact source, model/artifact, dependency, applicable hardware/runtime, predecessor control, deterministic parity, rollback, licensing/provenance and normal owner review/check gates close. Otherwise append evidence and retain **EVALUATION / HOLD**.
