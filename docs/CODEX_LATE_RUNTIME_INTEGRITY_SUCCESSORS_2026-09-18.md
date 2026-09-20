# Codex handoff — 2026-09-18 late runtime integrity successors

Canonical governance: `szl-holdings/szl-frontier#180`  
Parent wave: `frontier/waves/2026-09-18-runtime-integrity-successors.json`  
Successor wave: `frontier/waves/2026-09-18-late-runtime-integrity-successors.json`  
Observed protected Frontier source: `469dbc1aeba92e1e9158f15dd47abc74859ec16e`  
Disposition: **EVALUATION / HOLD**. This handoff authorizes evaluation preparation, not production promotion.

## Execution invariant

For each candidate: reverify the exact upstream SHA -> inventory whether the active owner exposes the affected path -> construct a deterministic known-bad or negative control -> evaluate the candidate at that owner -> obtain accelerator/runtime evidence only where actually available -> retain commands, fixture hashes and receipts -> preserve rollback -> PR/review -> protected source admission -> canonical Hugging Face publication only through the established writer -> exact HF runtime readback -> product readback -> proof. A skipped or unavailable lane is `UNAVAILABLE`/`UNQUALIFIED`, never PASS. Do not rehost weights, substitute upstream tests or benchmarks for SZL measurements, create parallel publishers, or weaken provenance, tests, policy, licensing, receipts, rollback or branch protection.

## 1. vLLM DeepSeek-V4.1 NaN candidate-block preservation

Pin `vllm-project/vllm@64563d0ec4b761745d5babbc5750b263f0783926` / #57454. Start deterministic fixture work in `szl-forge`; route real TP4/GB200-or-equivalent closure through `szl-gpu-bridge` only if available. Bind exact DeepSeek-V4.1 artifact/config, DSpark/DeepGEMM revisions, TP topology and graph mode.

The predecessor uses `value > -inf` after top-k and therefore discards NaN-scored selected candidates; captured upstream failures underfilled the active sparse prefix and repeated a block where DeepGEMM expects unique IDs. Reproduce zero, NaN and mixed-NaN rows, then require the candidate's `!= -inf` semantics to retain selected IDs while preserving padding. Compare finite-score behavior to an independent/reference selector. Re-run captured-row replay, autotuning, short/long prompts and target/draft graph paths. This repair does not explain the numerical source of NaNs; investigate that separately and do not label storage correctness as numerical sanitization.

## 2. vLLM GLM-5.3-Flash KpoolTail slot-mapping memory safety

Pin `vllm-project/vllm@70df48dc3d01fe1bb3206f7d8a832c7e8de348e8` / #57317. Bind GLM-5.3-Flash, ROCm/AITER sparse-MLA, KV layout, sequence length, concurrency and accelerator/runtime.

The predecessor applies a generic slot mapper whose `position // block_size` index grows with sequence length to a fixed one-block-per-request circular KpoolTail table. Build a poison-row test that proves the predecessor can address a neighboring request or past the table. Exercise the 500k-input regime when capacity exists, plus boundary positions, request interleaving, slot reuse and cancellation. The candidate must keep KpoolTail off the generic mapper while leaving unaffected KV groups on it. Validate generated output and representative accuracy; unit success alone is insufficient for long-context memory-safety qualification.

## 3. vLLM ROCm KV offload private pinned tensors

Pin `vllm-project/vllm@7b942936276d59cc1912185a442b97dea8d2386c` / #57160. Bind ROCm/driver, accelerator count/model, TP topology, model, KV dtype and native offload size/backend.

The predecessor can place ROCm on the shared mmap path, causing every rank to register the whole region; upstream observed `cudaHostRegister` failures and a startup stall with large offload pools. Reproduce that behavior or a bounded registration negative control. The candidate must choose private per-rank pinned tensors and must not enable replicated-layout acknowledgements without a shared medium. Run cold request -> GPU eviction -> CPU-to-GPU reload -> identical replay across ranks and receipt transfer/accounting. Measure host-pinned memory expansion. Execute a CUDA control to prove CUDA's existing shared-region behavior remains unchanged.

## 4. SGLang FlashInfer MoE fused-finalize default

Pin `sgl-project/sglang@c46bf5e990bdd99e2c200214b04683022100e4df` / #40105. Bind SGLang image, FlashInfer packages, CUDA/SM, model/quantization, MoE runner, EP/TP and `SGLANG_FLASHINFER_MOE_FUSED_FINALIZE`.

Upstream changed the default from enabled to disabled for numerical-accuracy reasons and measured a nontrivial performance tradeoff, but explicitly did **not** run model accuracy tests or measure the claimed numerical-error reduction. Build enabled, disabled and deterministic-mode controls on identical tensors/prompts. Measure logits/output error and repeated-run variance against an independent trusted reference across supported CUTLASS and CuTe DSL paths. Record latency/throughput separately across representative token counts and W4A4/W4A16 modes. Do not convert the upstream rationale into a pass and do not silently flip an SZL production default from discovery.

## 5. Transformers balanced device-map largest-leaf sizing

Pin `huggingface/transformers@4618eba18322b19e162b0eb7b33464a4d6a50ddd` / #47211. Bind Transformers, Accelerate and quantizer versions, model/checkpoint, dtype/quantization, `max_memory`, and device topology.

Reproduce the known-bad meta/fake-budget case where a large unquantized childless leaf such as embeddings/lm_head exceeds the buffer calculated from much smaller no-split decoder layers. Then execute an actual representative 4-bit model load on bounded hardware where aggregate GPU budget is sufficient. Assert the candidate does not collapse placement to the final device and spill required quantized modules to CPU/disk. Preserve explicit or genuinely necessary offload behavior. Receipt the resulting placement map, peak memory, load result and representative inference output.

## 6. vLLM DeepSeek-V4 DSML missing-string tool parser

Pin `vllm-project/vllm@39e33db7f3b10ebd3aca6a0008f2990978f118e7` / #56271. Bind the exact Python/Rust frontend actually serving, DeepSeek-V4 model/template/tokenizer and tool schema. Keep tool effectors disabled during evaluation.

Build a predecessor fixture where a DSML parameter omits the optional `string=` attribute. Require complete and streaming candidate parses to retain/coerce the parameter across chunk boundaries; run the equivalent semantic case through both Python and Rust frontends where supported. Add explicit string=true/false, numeric/boolean/nested JSON, whitespace, multiple tools/parameters, malformed tags and closing-tag-in-value controls. Bind the parsed argument receipt to the raw model-output hash before any downstream tool execution. Tool-call success transfers no authority to invoke external effectors.

## Owner routing

`szl-frontier#180` owns canonical governance and deduplication. `szl-forge` owns deterministic fixtures and software-only comparisons. `szl-gpu-bridge` owns actual accelerator closure. The active serving owner receives integration only after candidate qualification. A11oy receives product/HF projection only after protected source admission and through its existing single-writer controls. `a11oy-net` receives proof only from exact measured receipts. Do not create another Space or publisher.

## Authority-chain boundary

Protected `szl-holdings/a11oy@main` remains `43058398fb8ea346a7bd977f1a35391aeec1bf1a`. Current canonical HF A11oy and `a-11-oy.com` source-identity reads report that same SHA. `a11oy.net/models.json` remains the dated `2026-09-12T01:25:04Z` proof record at 46 models / 35 datasets / 21 Spaces with `operational=false`, `trained_all=false`, and `benched_all=false`. These observations do not constitute a same-window whole-chain receipt; issue #151 remains independent HOLD.

## Completion receipt

For every candidate retain: exact upstream SHA and signature-verification state; evaluated image/package lock; checkpoint/config identity; fixture hashes; predecessor/negative-control command and result; candidate command and result; accelerator/driver/runtime identity if exercised; numerical/output tolerances; measured timestamps; unavailable/unqualified lanes; rollback target; license/provenance disposition; owning integration PR; admitted GitHub revision; canonical HF runtime readback where applicable; product readback; proof receipt. Missing evidence remains missing and may not be promoted by inference.
