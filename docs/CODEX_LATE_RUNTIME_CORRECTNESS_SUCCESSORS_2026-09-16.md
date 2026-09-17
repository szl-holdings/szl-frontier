# Codex handoff — late 2026-09-16 runtime correctness successors

Canonical governance: `szl-holdings/szl-frontier#168`  
DeepSeek protocol owner: `szl-holdings/szl-frontier#134`  
Predecessor runtime-correctness PR: `szl-holdings/szl-frontier#172`  
Deterministic execution owner: `szl-holdings/szl-forge#331`  
Accelerator evidence owner: `szl-holdings/szl-gpu-bridge#105`  
Alignment dependency: `szl-holdings/szl-frontier#159`  
Disposition: **EVALUATION / HOLD**

## Why this is a successor instead of an edit to #172

PR #172 was already source-bound and green for three earlier September 16 runtime correctness boundaries. The three items below merged later and introduce independent correctness predicates. Preserve #172 as historical evidence and evaluate these in a successor wave rather than silently expanding a previously witnessed scope.

No item inherits qualification from moving `vllm` main, from upstream test results, or from the prior wave.

## Exact upstream boundaries

### 1. DeepSeek V4.1 VL causal image SWA — P0

Exact vLLM merge: `9f9e1dac26ff0379651dd7e8ca409b573ccfce54` / upstream PR #57152, verified signature.

The repair changes DeepSeek V4.1 multimodal sliding-window semantics. V4.1 had inherited a widened/bidirectional image-token rule from the earlier Vision-Exp behavior; the merged correction restores the official causal window for image tokens as well as text. Upstream targeted metadata/kernel tests are useful source evidence, but upstream explicitly did not provide full-model VL accuracy, generation-length or AMD runtime qualification.

Codex implementation/evaluation work:

- pin exact runtime/model/tokenizer/processor/template/environment identities in every receipt;
- build an independent causal-window oracle and regression fixtures for full and continuation prefill, image boundaries and compression ratios 0/1/2;
- prove gathered and paged sparse indices expose no future image tokens and no keys outside the declared causal window;
- run fixed-seed text+image model checks, eager/CUDA-graph paths, prefix reuse, mixed batches, cancellation and restart;
- keep every unexecuted hardware/backend path `UNAVAILABLE` or `UNQUALIFIED`;
- retain the incumbent exact runtime as rollback.

### 2. DeepSeek V4 ROCm catastrophic accuracy regression repair — P0

Exact vLLM merge: `bc0f47cd03d6ae99f9f217f096684423bb4ebc2b` / upstream PR #57132, verified signature.

Upstream reports a DeepSeek-V4 ROCm/AITER configuration collapsing GSM8K exact-match to near zero and recovering to roughly 0.95 after reverting the offending quantized-linear changes. Treat this as a production correctness hazard, not an optimization update.

Codex implementation/evaluation work:

- bind vLLM, model, AITER, ROCm, driver/compiler, device topology, KV precision and all serving flags exactly;
- create a low-level reference invariant for the preshuffled/row-major FP8 weight/scale layout boundary so the regression is detectable without relying only on a benchmark score;
- where executable, retain a known-bad predecessor as a negative control and prove the new guard fails it;
- run fixed-seed logits/tokens plus a model-level accuracy sentinel on the admitted ROCm lane;
- exercise AITER on/off and only the fused/shared-expert paths SZL actually intends to support;
- do not project an AMD repair into NVIDIA qualification or a public accuracy claim.

### 3. A100 FP8 backend admission — P1

Exact vLLM merge: `2bdbbc80804b2199cbf39b75e78cf7269d0383a4` / upstream PR #55884, verified signature.

The prior selector could choose a CUTLASS FP8 linear backend on A100/sm80 despite that backend not being supported there, causing execution failure. The repair uses the backend capability predicate so a supported fallback can be selected. A100 is already represented in SZL runtime/runbook surfaces, making this an estate-relevant compatibility boundary.

Codex implementation/evaluation work:

- pin exact vLLM/model/quantization/CUDA/driver/A100 identities and record the selected kernel backend;
- add a deterministic selector test proving unsupported CUTLASS FP8 is rejected on sm80 and a supported fallback is chosen;
- add the inverse regression proving valid newer architectures are not accidentally denied;
- run a representative FP8 model on real A100 through load, prefill and decode when hardware is available;
- if A100 is unavailable, record `UNAVAILABLE`; never convert source review or an upstream A100 result into an SZL PASS;
- prove missing/unsupported fallback behavior fails explicitly instead of silently changing precision or execution semantics.

## Execution order

1. Re-read the exact upstream commits and license/provenance metadata; abort the lane if the bound revision differs.
2. Implement CPU/source-level deterministic guards where meaningful without pretending they replace accelerator evidence.
3. Run accelerator-specific qualification through GPU Bridge under exact hardware and software identity.
4. Emit source-bound receipts to the normal proof path only after the candidate-specific correctness predicates pass.
5. Let `szl-serve` own any candidate rollout/rollback experiment after prerequisite receipts exist.
6. Do not alter Hugging Face projection, `a-11-oy.com` capability state, or `a11oy.net` proof claims merely because source support exists.

## Independent alignment HOLD

`szl-holdings/szl-frontier#159` has independently reopened the A11oy authority-chain source predicate after protected `szl-holdings/a11oy` main moved. These runtime candidates do not repair that drift. Evaluation receipts must not treat stale runtime/product/proof projections as qualification evidence.

## Acceptance gates

A candidate remains HOLD unless all applicable gates are present and exact-source bound: source and executed artifact identity; license/provenance; independent deterministic correctness oracle; negative regression control; accelerator/runtime identity; model-level correctness where behavior can change; failure-path and restart/isolation evidence; explicit rollback; normal branch/check policy; and a receipt that names what was unavailable or not exercised.

No branch protection, test, provenance, policy, receipt, licensing, rollback/fallback or production default may be weakened to make a candidate pass. No upstream weights are rehosted for inventory.
