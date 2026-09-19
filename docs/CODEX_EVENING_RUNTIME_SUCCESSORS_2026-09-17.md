# Codex handoff — 2026-09-17 evening runtime successors

Canonical governance: `szl-holdings/szl-frontier#180`  
Wave: `frontier/waves/2026-09-17-evening-runtime-successors.json`  
Observed protected Frontier source: `469dbc1aeba92e1e9158f15dd47abc74859ec16e`  
Disposition: **EVALUATION / HOLD**. Do not publish or promote from this document.

## Execution invariant

For each candidate: Audit -> exact-source plan -> owner branch -> deterministic negative control -> candidate test -> hardware/runtime evidence where actually available -> PR/review -> protected admission -> canonical publication -> exact runtime readback -> product state -> proof. A skipped, unavailable or unexercised lane is not a pass. Preserve rollback, licenses, provenance, receipts and existing branch/test controls.

Do not mirror upstream weights for inventory. Do not create another inference server, vertical backend, publisher or proof authority. Do not use upstream benchmark numbers as SZL measurements.

## 1. vLLM HiSparse/NIXL full-block tail

Pin `vllm-project/vllm@67e5b0acc9988afc50d019db64ad9da0dadaa15e` and its known-bad predecessor. Start in `szl-forge`; use `szl-gpu-bridge` only for hardware closure that cannot be obtained in deterministic CPU/source fixtures. Bind vLLM/NIXL/image/model/tokenizer/block size/topology.

Reproduce token counts `1,15,16,17,31,32,33,127`. Prove the candidate retains/restores a writable final resident page, last-token replay is valid, pending restore does not expose an uninitialized prefix-cache copy, and abort/failure releases host/GPU refs exactly once. Add cancellation, transfer failure and restart. Require output/logit parity before throughput comparison. No serving default changes.

## 2. SGLang DP idle-rank zero-token path

Pin `sgl-project/sglang@a98d921658b2cb78ca1257a4d72a6a3969620456`. In `szl-forge`, build the zero-token originally-IDLE negative control before the candidate. Bind DP/TP topology, model and MLP-sync settings. The idle rank must return zero pruned logits rows while the padded execution mode remains valid for collective synchronization.

Exercise mixed idle/active ranks, return-logprob on/off, speculative modes, repeated empty batches, cancellation and worker restart. Qualify only the exact topology actually executed; hardware absence is `UNAVAILABLE`.

## 3. SGLang exact-token tensor image preprocessing

Pin `sgl-project/sglang@25c9f724d4785eaa6921690d1634d20a3faac57b`. Bind exact processor/model/decoder/input hashes. Compare equivalent PIL-backed and tensor-backed image inputs through the actual exact-token preprocessing path. Dimensions, image-token counts and model-visible prompt structure must agree for the same logical image.

Include JPEG/CUDA-decoder path where available, CPU fallback, grayscale/RGB, non-square inputs and malformed tensor shapes. Unsupported inputs must fail explicitly rather than silently re-encode or change token counts.

## 4. Transformers video token accounting for vLLM backend

Pin `huggingface/transformers@770e4c40d0436082a52dc380f07a9d3f389c99d4`; bind exact vLLM, processor, video processor, decoder and model. Treat this as **Part 1 only**. Build an independent expected-token oracle from sampled frames/patch geometry/merge size and compare predecessor vs candidate across representative durations/resolutions, explicit merge-size overrides, multiple videos and context truncation.

The served prompt-token count must equal the processor/model input represented by the receipt. Do not claim all VLMs or complete video parity from this source.

## 5. Hugging Face Hub eval-result fault isolation

Pin `huggingface/huggingface_hub@77b6b2b32972d54f5afef920414d15b510507c46`. Evaluate in the tooling owner that consumes Hub evaluation metadata, with deterministic fixtures first. One valid eval record plus one `{filename,error}` placeholder must reproduce predecessor all-entry loss; the candidate must preserve the valid record while retaining a visible invalid diagnostic.

Critical proof rule: surviving valid entries do **not** make an incomplete evaluation set complete. Downstream aggregation must carry invalid/unknown state and cannot publish a whole-model/whole-repo PASS from the filtered subset. Test multiple errors, empty responses, malformed valid-looking entries and ordering. `a11oy-net` receives proof only after exact-source measured receipts. This candidate is post-v1.32.0 source and does not rewrite PR #179's stable-release receipt.

## 6. TRL AsyncGRPO synchronous + asynchronous tools

Pin `huggingface/trl@28884e7f8139e752b476de28474e7cf75e1e1cd5`. This advances existing Frontier issue #76; do not open another AsyncGRPO owner. In `szl-forge`, use non-secret deterministic tools with no external effectors. Bind TRL/vLLM/config/tool definitions and `max_inflight_tasks`.

Exercise sync, async, slow, failing and missing tools. Require model-emitted per-turn result ordering, bounded concurrency and continued event-loop progress. Add shared-state race tests, cancellation during sync/async execution, rollout timeout, trainer stop/backpressure, rollout-worker restart and retry. A tool with external side effects must remain disabled in evaluation; simulated idempotency keys should prove no duplicate consequential action on retry/restart.

Do not transfer any success to #76's independent adapter-only synchronization, staleness, LoRA capacity, shared-path or checkpoint gates.

## Authority chain

Fresh observation at wave creation: protected A11oy source `43058398fb8ea346a7bd977f1a35391aeec1bf1a`; canonical HF runtime and `a-11-oy.com` report that same source identity. `a11oy.net/models.json` remains captured `2026-09-12T01:25:04Z` at 46 models / 35 datasets / 21 Spaces and false for `operational`, `trained_all`, `benched_all`. These different observation windows do not close #151.

No candidate in this wave may change Hugging Face projection, a-11-oy.com capability state or a11oy.net success proof before owning-repository qualification and exact readback. Whole-chain closure remains independently governed by #151.

## Completion receipt requirements

For every candidate, preserve: upstream SHA; evaluated package/image digest; fixture/input hashes; exact model/processor/runtime identities; test command and exit state; negative-control result; candidate result; hardware identity when applicable; measured timestamps; rollback target; known unavailable/unqualified lanes; license/provenance disposition; owning PR and admitted GitHub revision. Only then can the normal publisher/proof path consider promotion.