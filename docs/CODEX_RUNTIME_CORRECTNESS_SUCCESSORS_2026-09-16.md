# Codex handoff — 2026-09-16 runtime correctness successors

Canonical issue: `szl-holdings/szl-frontier#168`  
Governed wave: `frontier/waves/2026-09-16-runtime-correctness-successors.json`  
Disposition: **EVALUATION / HOLD**

## Objective

Prepare reproducible evaluation work for four exact-source successor boundaries without creating duplicate model admissions or changing production defaults. Existing model/runtime admissions remain the deduplication parents; none of their receipts automatically qualify these later loader, quantization, kernel or speculative-decoding semantics.

## Exact sources

1. Transformers Qwen3.8 GGUF: `huggingface/transformers@41f519e7419f5c4cf71d173403caae63c5b28275` (`#48660`).
2. vLLM Kimi-K3 ROCm A4W4 FlyDSL: `vllm-project/vllm@a4d2d9d95edd2db39cc7dec0a3433c764ff2c578` (`#53940`). Its direct parent is the GLM successor below.
3. vLLM GLM-5.3-Flash Quark MXFP4 repair: `vllm-project/vllm@c8d1cf077a7878ea30040a33ac61262003a3953a` (`#56176`).
4. SGLang ROCm EAGLE verification sampling fix: `sgl-project/sglang@7eedd57ab0970dab586fa8ab00d4e4de93392ff5` (`#37134`).

Moving upstream `main`, a later release, a different container, another quantized checkpoint or another model revision inherits no PASS.

## Deduplication parents

- Frontier #25 / PR #26: existing Qwen3.8 and GLM-5.3/Flash model admissions.
- Frontier #47: existing Kimi-K3 admission.
- Frontier #37: existing SGLang runtime admission.
- Frontier #164 / draft #165: Qwen3.5-MoE GGUF watch; useful pattern only, not transferable qualification.

Do not create a second Qwen3.8, GLM-5.3 or Kimi-K3 model admission. This wave qualifies only the exact runtime/format deltas above.

## Execution order

### A. Offline/source fixtures first

Implement deterministic fixtures in the active owning repository, normally `szl-forge`, and keep them runnable without production credentials or routes.

For Qwen3.8 GGUF:

- freeze the Transformers build identity and selected GGUF file digest;
- inventory every GGML dtype present in the selected file;
- provide independent tiny-tensor dequant oracles for each exercised dtype rather than comparing the implementation to itself;
- prove architecture, tensor-shape/order and tokenizer/config identity against the canonical source model;
- fail explicitly on corrupt, truncated, unsupported and structurally inconsistent fixtures;
- compare bounded logits or deterministic generation under a tolerance declared before seeing the result.

For GLM-5.3-Flash Quark MXFP4:

- freeze the exact Quark and base checkpoint revisions and file digests;
- build synthetic split gate/up shards proving the fused `gate_up_proj` resolves to the intended per-layer block-FP8 scheme rather than global MXFP4;
- build FP8 weight/scale fixtures proving both Quark `.weight_scale` handling and the incumbent DeepSeek-style scale name remain correct;
- include missing scale, wrong shape, inconsistent shard and duplicate mapping failures;
- compare bounded source-vs-Quark logits or generation under predeclared tolerances.

For SGLang EAGLE:

- build seeded probability fixtures where argmax and temperature/top-p sampling differ observably;
- prove HIP EAGLE verification follows the requested sampling semantics instead of silently behaving greedily;
- exercise q values at zero, negative, NaN and +/-Inf and assert the safe residual/target-resampling path;
- assert token-map/EAGLE3 configurations that are not supported by the auto-enable rule are not silently changed;
- retain non-HIP regression fixtures where CI can execute them.

### B. Hardware-specific execution second

`szl-gpu-bridge` owns accelerator closure; `szl-forge` owns measured model/runtime equivalence. Do not manufacture PASS when the required accelerator is unavailable.

For Kimi-K3 A4W4:

- record exact GPU, ROCm, driver, PyTorch, vLLM and AITER identities;
- require the exact AITER revision actually executed and distinguish tuned A4W4 rows from heuristic FlyDSL fallback;
- prove no stale A8W4 override wins dispatch;
- execute eager plus cudagraph correctness before any performance comparison;
- compare to the incumbent exact Kimi-K3 runtime with fixed prompts/decoding and frozen model bytes;
- only after correctness, measure TTFT/ITL/throughput/memory under fixed workload definitions.

For GLM/SGLang AMD-specific claims, use the same rule: hardware absent => `UNAVAILABLE`, not source-derived PASS.

### C. Serving and rollback only after model/runtime correctness

`szl-serve` receives a candidate only after exact-source correctness receipts exist. Preserve incumbent defaults. Exercise startup failure, malformed requests, cancellation, worker restart, route disablement and rollback. A fallback may not silently change model bytes, tokenizer/protocol, provider authority, quantization class or policy.

## Receipt contract

Every executed candidate receipt must bind:

- upstream repository and exact commit;
- upstream PR/reference;
- exact package/wheel/container digest;
- exact model/checkpoint/tokenizer/config revisions and content digests used;
- hardware + driver + runtime identity;
- fixture-set revision and seed where applicable;
- predeclared tolerance/acceptance thresholds;
- raw measured results and explicit PASS/FAIL/UNAVAILABLE/HOLD state;
- incumbent rollback identity.

Upstream benchmark, accuracy and throughput statements are context only until SZL reproduces them.

## Authority-chain rule

GitHub remains source of truth. Only admitted GitHub evidence may project to a Hugging Face SZL artifact/runtime; only an admitted HF/runtime projection may change `a-11-oy.com`; only measured exact-source receipts may update `a11oy.net` proof.

Fresh observation for this wave: protected `szl-holdings/a11oy` main and `a-11-oy.com/api/a11oy/v1/honest` both report `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`, so the GitHub -> product source leg remains aligned. `a11oy.net/models.json` is still the dated 2026-09-12 46-model proof record, so full-chain closure remains HOLD under the existing #159 reconciliation. Do not rewrite historical proof to make counts match.

## Non-negotiable bounds

- no production default or route changes from discovery;
- no weight rehosting merely for inventory;
- no weakening tests, policy, provenance, licensing, receipts, rollback/fallback or branch protection;
- no `trust_remote_code` exception inferred from an upstream sample command;
- no hardware claim from a source-only test;
- no performance/capability claim from upstream-reported numbers;
- no projection to Hugging Face, `a-11-oy.com` or `a11oy.net` before the normal owning-repository gates pass;
- automatic production promotion remains `false`.
