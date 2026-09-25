# Codex handoff — 2026-09-18 midday cross-stack integrity successors

Canonical governance: `szl-holdings/szl-frontier#180`  
Wave: `frontier/waves/2026-09-18-midday-cross-stack-integrity-successors.json`  
Observed protected Frontier source: `b8e8f5a8146b3f8b6484db463646d1fdeb9e8047`  
Disposition: **EVALUATION / HOLD**. Discovery authorizes evaluation preparation only.

## Execution invariant

For every candidate: verify the exact upstream SHA -> inventory whether an active SZL owner actually exposes the affected path -> reproduce an immediate predecessor/known-bad control -> run the exact candidate with deterministic fixtures -> obtain real accelerator/runtime evidence only where required and available -> retain immutable receipts -> owner PR/review -> protected source admission -> established Hugging Face publisher -> exact runtime readback -> `a-11-oy.com` readback -> `a11oy.net` measured proof. A missing, skipped or unavailable lane is `UNAVAILABLE`/`UNQUALIFIED`, never PASS.

Do not float upstream `main`, mirror weights for inventory, weaken tests/provenance/licensing/branch protection, create a duplicate serving/training stack, or treat upstream tests/benchmarks as SZL measurements. Preserve rollback throughout.

## 1. Transformers VibeVoice-ASR long-audio token-count correctness

Pin `huggingface/transformers@719d8090f4040de8563ccf05496419b212fb395f` / #48864 and the immediate predecessor. Primary model identity for full-model qualification: `microsoft/VibeVoice-ASR-HF`; do not rehost it.

The predecessor divides an int64 padding-mask sum by hop length through float32 before `ceil`; beyond `2**24` samples, precision loss can undercount audio tokens by one relative to the processor. Build integer-oracle fixtures around `2**24`, every adjacent hop-length boundary, and representative batch padding. Require candidate processor/model token-count identity. Then, only if the actual speech path is exposed, run representative long audio including hour-scale input where resources permit and compare transcripts, token/timestamp/diarization outputs, truncation behavior, cancellation and restart. Bind audio hashes, processor/tokenizer/model revision, dtype and runtime. Arithmetic-fixture success is not full-model speech qualification.

## 2. PEFT LoRA hotswap rank/alpha pattern scaling

Pin `huggingface/peft@50a277e7c87db460ef7444055788f9da29f2da71` / #3752. The predecessor resolves per-module rank/alpha patterns against a full state-dict key rather than the module name used by normal load, allowing silent scaling drift even for the same checkpoint.

In `szl-forge`, construct normal-load versus hotswap known-bad controls using literal and regex-like pattern keys, rank-only, alpha-only and combined patterns, rslora on/off, compiled and eager modes. Require normal load == candidate hotswap under declared tolerances. Exercise A->B->A, same-checkpoint reload, missing target modules, failed swap/rollback and concurrency where a serving owner exposes live swaps. Bind base model, adapter bytes/configs, PEFT/Torch/Transformers versions and compile state. Search historical SZL receipts only for demonstrated use of this exact hotswap lifecycle; mark those `NEEDS_REVALIDATION`, not every receipt containing PEFT.

## 3. TRL KTO Liger distributed-wrapper gradient integrity

Pin `huggingface/trl@03b22f5f93868a8aa73c5089ab99fbceb05ae144` / #7247. The Liger chunked projection accesses `lm_head.weight` directly; bypassing a distributed wrapper's forward can leave gather/reducer hooks unarmed. The successor redirects whenever the model is wrapped or FSDP is active.

Use a deterministic tiny KTO fixture. Compare a single-process oracle with the immediate predecessor and candidate under DDP, then applicable ZeRO-3/FSDP/FSDP2. Receipt loss, `lm_head` gradients, full trainable-gradient digest and one optimizer update. Add accumulation, empty/uneven local batches, checkpoint/resume, rank failure/restart and deterministic seed replay. Bind TRL, Liger, Accelerate, Torch, dataset, checkpoint, topology and hardware. No training receipt inherits qualification unless exact affected exposure is demonstrated.

## 4. Diffusers disk-offload compute-stream lifetime

Pin `huggingface/diffusers@a3e0b8ec235c27a6c17a21976daf7fd32d819d05` / #14657. The known-bad path can release onloaded tensors while a compute stream still reads them, permitting allocator reuse and NaN/foreign-data output.

Reproduce the upstream VidTok-style group disk-offload failure or an equivalent poison-canary under allocator reuse pressure. Compare candidate disk offload to memory offload and no offload under identical seeds/model/input. Cover leaf/block modes, default/separate streams, `record_stream` true/false, repeated generation, cancellation, restart and disk cleanup on error. Bind Diffusers/Torch/model/pipeline/offload config/filesystem/accelerator. Keep output/latent hashes or declared numeric tolerances. Performance/memory evidence is secondary to finite deterministic correctness.

## 5. vLLM TritonMLA causal multi-token decode

Pin `vllm-project/vllm@32636580a6f1c3bc41deefc4bf7800f850c24034` / #51065. The affected decode kernel indexes metadata per query row; causal multi-token blocks therefore need expanded block-table rows plus per-token sequence extents. Missing/incorrect flattening can create illegal metadata memory access or future-token attention.

Start with upstream-independent metadata oracles for query lengths 2,3,4,5,8: each request's causal rows must strictly increase to the full sequence length, block-table rows must be adjacent repeated request rows, padding rows must expose zero KV extent, single-token and non-causal paths must remain valid, malformed non-uniform blocks must refuse, and causal DCP must fail before kernel launch. Then use real hardware, if available, for poison-canary/memory-safety execution, cudagraph/eager behavior, cancellation/reordering/restart and output/logit parity against a trusted attention oracle. Bind model/MLA/Triton/Torch/driver/page-size/topology/image identity. Unit metadata tests do not establish accelerator memory safety.

## 6. Hugging Face Hub positioned-file download integrity

Pin `huggingface/huggingface_hub@0ba990ae4b7974f68d281064aca4bb1b1cc61ad0` / #4937. The predecessor compares expected download size with the file object's absolute position and, when a server ignores Range, can rewind/truncate to byte zero, damaging caller-owned prefix bytes.

Build deterministic HTTP fixtures with a destination containing sentinel prefix bytes and a nonzero current position. Cover Range honored, Range ignored with 200, retry/resume, append/update mode, partial read, expected-size mismatch, cancellation and network failure. Known-bad control must demonstrate the predecessor consistency error and/or sentinel truncation. Candidate must preserve every caller-owned byte and exact payload hash, while incomplete downloads stay incomplete. Evaluate the exact Hub consumer before changing any production dependency. Preserve the qualified v1.32 line as rollback where applicable.

## Owner routing

`szl-frontier#180` owns canonical deduplication/governance. `szl-forge` owns deterministic software fixtures and historical receipt exposure checks. `szl-gpu-bridge` owns hardware closure. The active serving/speech/training owner integrates only after candidate qualification. A11oy receives product/HF projection only after protected source admission through its established writer. `a11oy-net` receives only exact measured proof. Do not create another Space, model mirror or publisher.

## Authority-chain boundary

Protected Frontier source observed for this wave is `b8e8f5a8146b3f8b6484db463646d1fdeb9e8047`. Earlier same-source-identity reads placed protected A11oy, its canonical HF runtime and `a-11-oy.com` at `43058398fb8ea346a7bd977f1a35391aeec1bf1a`, while `a11oy.net/models.json` remained captured `2026-09-12T01:25:04Z` at 46 models / 35 datasets / 21 Spaces with `operational=false`, `trained_all=false`, and `benched_all=false`. Re-check the chain in one fresh observation window before any closure; do not combine the older observations into a new PASS. Issue #151 remains independently authoritative.

## Completion receipt

For each candidate retain exact upstream source; predecessor revision; package/image locks; model/adapter/dataset/input identities; fixture hashes; commands; negative-control result; candidate result; output/gradient/artifact digests and tolerances; hardware/runtime identity when exercised; timestamps; unavailable lanes; license/provenance disposition; rollback target; owning integration PR; admitted GitHub revision; exact HF runtime/artifact readback when applicable; product readback; proof receipt. Missing evidence remains missing.
