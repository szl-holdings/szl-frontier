# Codex handoff — 2026-09-18 runtime integrity successors

Canonical governance: `szl-holdings/szl-frontier#180`  
Parent wave: `frontier/waves/2026-09-17-evening-runtime-successors.json`  
Successor wave: `frontier/waves/2026-09-18-runtime-integrity-successors.json`  
Observed protected Frontier source: `469dbc1aeba92e1e9158f15dd47abc74859ec16e`  
Disposition: **EVALUATION / HOLD**. Do not publish or promote from this document.

## Execution invariant

For each candidate: verify the exact upstream SHA -> inventory estate exposure -> build a deterministic known-bad or negative control -> test the candidate at the active owner -> obtain hardware/runtime evidence where actually required -> preserve rollback -> PR/review -> protected source admission -> canonical publication -> exact runtime readback -> product readback -> proof. A skipped or unavailable lane is not a pass. Do not rehost weights, substitute upstream benchmarks for SZL measurements, create a second serving stack, or weaken existing provenance/tests/policy.

## 1. vLLM DeepSeek-V4.1 FlashInfer DSpark non-causal attention

Pin `vllm-project/vllm@80447d27655918da6bfbccd0d3a40e975bda220a` / upstream #57432 and its immediate known-bad predecessor. Start in `szl-forge`; route actual SM100/FlashInfer closure through `szl-gpu-bridge` if that hardware exists. Bind vLLM image, FlashInfer, DeepSeek-V4.1 config, DSpark mode, dtype and exact model artifact.

Build a reference oracle independent of the candidate sparse path. Exercise causal and non-causal windows, short/boundary/long contexts, BF16/FP8, multiple head counts, padded decode slots and CUDA graph replay after Q/KV and visibility change. The candidate must match the reference within declared numerical tolerance and must not treat padded slots as visible keys. Hardware absence is `UNAVAILABLE`; do not infer support from upstream tests.

## 2. vLLM ROCm GLM-5.3-Flash logical-topk readiness

Pin `vllm-project/vllm@e0050f287aae8b3ddbe2947a5af1c5dd23db2781` / #57252. Bind GLM-5.3-Flash, ROCm, AITER, sparse-MLA config and accelerator identity. Reproduce the predecessor boot/initialization crash on the affected backend before accepting the candidate.

The new hook is deliberately a no-op because this implementation shares the top-k buffer and does not join sparse-MLA index groups. Verify that assumption with repeated init, warm restart, worker restart and real prompt/decode traffic. Assert no stale top-k/index-group state crosses lifecycle boundaries. A successful boot alone is not correctness qualification.

## 3. vLLM ROCm AITER MXFP8 enable gate

Pin `vllm-project/vllm@213c379fcafe5ac3bdc235a480e13140ee13c7b5` / #57426. Bind ROCm/AITER/FlyDSL, gfx target, quantization metadata, model and TP/EP topology. Test AITER-enabled and AITER-disabled controls through both auto-selection and explicit backend selection.

When AITER fused MoE is disabled, the AITER MXFP8 backend must not be silently selected. Forced unsupported selection must fail clearly. When enabled and supported, compare logits/output against the existing qualified fallback for representative MXFP8 MoE traffic and exercise TP and EP expert-mask behavior. No backend-default change is authorized by this wave.

## 4. vLLM DiffusionGemma committing-step logprobs

Pin `vllm-project/vllm@2c88fb131c7ae0be01907cd8c276911db5e7aad4` / #57414. Build a predecessor fixture containing multiple requests where decode logits exist for more slots than are committing. The candidate must pop and attach a pending logprob only for the slot that commits the diffusion step.

Exercise mixed commit state, multi-request batching, logprobs on/off, cancellation before commit, slot reuse, retry, restart and repeated steps. Assert a pending logprob never crosses request or commit-step identity. Any score or evaluation receipt derived from ambiguous predecessor logprobs remains invalid for promotion.

## 5. SGLang DeepSeek-V4 ROCm AITER FP4 dequant

Pin `sgl-project/sglang@4f52a2756328df5c27c9c6b76011805f7f40e8f8` / #35123. Bind exact DeepSeek-V4 checkpoint, SGLang image, ROCm/AITER, accelerator, `SGLANG_DSV4_FP4_DEQUANT` state and actual MoE runner.

The predecessor control must demonstrate that requested FP4->FP8 dequantization is silently bypassed on the affected AITER path. For the candidate, verify expert weight and inverse-scale representation after conversion, e4m3fn->e4m3fnuz normalization where applicable, and that weight shuffling occurs only when the selected runner is AITER. Exercise an actual Triton runner too; wrong-runner shuffling must be caught by numerical parity tests. Performance evidence is secondary to output parity.

## 6. SGLang runtime prefill/decode role switching

Pin `sgl-project/sglang@1f60ddef5dc2ae3bbfbe0c5cea45690c4b60a251` / #28403. Treat runtime P<->D switching as a deployment lifecycle capability, not a default. `--enable-pd-role-switch` stays off until qualification. Bind transfer backend, bootstrap/network configuration, model and topology.

Exercise repeated P->D->P transitions with quiescent and in-flight workloads. Verify request draining/cancellation, transfer-resource teardown/recreation, heartbeat-thread shutdown, bootstrap registration and KV ownership. Inject teardown, registration and transfer faults plus worker restart; recovery must be deterministic or fail closed without mixed-role acceptance.

Source-declared unsupported combinations are hard negative controls: DP attention, EP, MoE all-to-all, PP, DP, DCP and speculative decoding must be rejected before service admission. Success on the supported subset transfers no qualification to them.

## Authority-chain boundary

At this handoff's observation window, protected `szl-holdings/a11oy@main` remains `43058398fb8ea346a7bd977f1a35391aeec1bf1a`; fresh reads of the canonical Hugging Face A11oy runtime and `a-11-oy.com` report that same source identity. `a11oy.net/models.json` remains captured at `2026-09-12T01:25:04Z`, 46 models / 35 datasets / 21 Spaces, with `operational=false`, `trained_all=false`, and `benched_all=false`. These are not the same observation window and therefore do not close #151.

No candidate here may alter Hugging Face projection, product capability state or proof before its owning source is admitted and its normal publisher/readback path succeeds. Proof receives only exact measured receipts.

## Completion receipt

For each candidate retain: upstream SHA and verification state; exact evaluated image/package; model/checkpoint/config identity; test fixture hashes; command and exit result; predecessor/negative-control result; candidate result; accelerator and driver/runtime identity when applicable; measured timestamp; rollback target; unavailable/unqualified lanes; license/provenance disposition; owning PR; admitted GitHub SHA; HF runtime readback where applicable; product readback; proof receipt. No omitted field may be silently interpreted as PASS.
