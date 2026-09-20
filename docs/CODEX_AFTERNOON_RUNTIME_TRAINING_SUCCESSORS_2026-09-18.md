# Codex handoff — Sep 18 afternoon runtime and post-training successors

Canonical governance: `szl-holdings/szl-frontier#180`

Governed wave: `frontier/waves/2026-09-18-afternoon-runtime-training-successors.json`

Observed protected Frontier source: `10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e`

Disposition: **EVALUATION / HOLD**. This handoff prepares deterministic qualification. It does not authorize a dependency bump, product route, model publication, provider write, proof-success claim, weight mirror, branch-protection bypass, or automatic promotion.

## Exact upstream pins

| Candidate | Exact source | Upstream PR | Primary owner after governance |
|---|---|---:|---|
| vLLM ROCm DeepSeek-V4 sparse-indexer logits layout | `vllm-project/vllm@71fc70d3ae1df53300a23ec69f6d97b7207a109f` | #50455 | Forge + GPU Bridge |
| SGLang Triton speculative runtime token width | `sgl-project/sglang@248c202b46d4a44ad46a3f09d48661b0d9ce6257` | #39859 | Forge + active serving owner |
| vLLM KV-offload backpressure | `vllm-project/vllm@23e26e058839fb2a3e77c78fbf2184f563593227` | #50045 | Forge + active serving owner |
| SGLang router 429/503 breaker semantics | `sgl-project/sglang@4e0b56c8119a2673d0bf3bd748b8d9a895af79cb` | #39464 | Forge + active serving owner |
| TRL streamed GRPO log-prob projection | `huggingface/trl@a98fa6a4428f9aae58dfb26d729d7437f662f27a` | #7077 | Forge |
| Transformers composite-model special-token alignment | `huggingface/transformers@ea31b0c6ab0d1368130b0482aee7293a014c3a38` | #48847 | Forge |

Every lane must record the exact executed commit/container/package and must independently qualify its own runtime/model/hardware path. A passing upstream test, another backend's result, an older SZL receipt, or the green Frontier governance PR cannot transfer qualification.

## Execution contract

### 1. Preflight and ownership

1. Read protected `szl-frontier/main`; require it to still contain or descend from the source revision recorded by the wave. Do not rewrite this observation if main moves; add a successor receipt if necessary.
2. Read #180 and the current draft integration PR before writing. Deduplicate by exact upstream revision, responsibility and evaluation predicate.
3. Put deterministic evaluation code and fixtures in `szl-holdings/szl-forge` unless an existing active owner already contains the corresponding runtime harness. Put accelerator-specific launch/topology closure in `szl-holdings/szl-gpu-bridge`; do not create another serving stack.
4. Make every generated evaluation receipt name the repository commit, upstream commit, model/artifact revision, input hashes, dependency lock, relevant hardware/runtime identity, command, result and known bounds.
5. Missing hardware, unavailable provider access, missing model entitlement or unexecuted topology is `UNAVAILABLE`/`UNQUALIFIED`, never zero or PASS.

### 2. vLLM ROCm DeepSeek-V4 sparse-indexer logits layout

Build an exact-predecessor/candidate pair around `71fc70d3...`. The predecessor must be capable of reproducing the affected layout error on **gfx942 or gfx950**; CUDA evidence cannot satisfy this lane. Pin the exact DeepSeek-V4/V4.1 artifact/config and the ROCm, HIP, AITER, Triton and Torch versions.

Exercise compression ratios **1, 2 and 4**, block-flat versus shuffle representations, page boundaries, representative sequence lengths and graph/eager execution. Preserve valid-position logits and top-k from an independently executed eager reference. Qualification requires finite logits and declared tolerances. Record the negative control even if it fails catastrophically. If no affected accelerator is attached, leave this lane HOLD with an `UNAVAILABLE_HARDWARE` receipt.

### 3. SGLang speculative runtime token width

Construct fixtures where configured capture/draft width differs from runtime `num_tokens_per_req`, including gamma versus gamma+1 verification. Record `draft_token_num`, `num_tokens_per_req`, qo-indptr, mask-indptr, max-extend length, KV-index lengths and sliding-window start positions.

Run EAGLE-family verification with and without custom masks, multiple batch sizes, eager and CUDA-graph replay, and any actually supported MTP path. Exercise cancellation/restart and invalid or nonpositive runtime widths. A qualified lane needs output/accepted-token parity against non-speculative generation or another independently qualified reference and no out-of-bounds or future-token attention.

### 4. vLLM tiered KV-offload backpressure

Use deterministic secondary tiers whose completion latency can be controlled. Exercise warmup, high/low watermark hysteresis, partial per-tier override inheritance, idle decay/recovery, accounting-only, drop and throttle policies, queue drain, cancellation and process restart.

Every KV block needs a deterministic identity. A dropped or deferred store must never later be advertised as durable/available, and a lookup/load must never return stale or foreign bytes. Prove unsupported P2P detector configuration fails closed rather than silently degrading. The incumbent offload path is rollback. Measure throughput only after state-machine and data-integrity receipts pass.

### 5. SGLang router backpressure versus breaker faults

Create deterministic worker responses for 2xx, 429, 503, 500, 502, 504, transport timeout and a stream that returns a 2xx head then fails mid-body. Verify:

- 429/503 do not open a closed breaker;
- 429/503 do not erase a genuine closed-state failure streak;
- 429/503 resolve a half-open probe;
- genuine 5xx/transport/body failures advance the breaker exactly once;
- late concurrent completions cannot reopen/close the wrong breaker epoch.

Upstream explicitly leaves an indefinitely-503 worker outside breaker detection. Add a separate chronic-backpressure test proving an existing higher-level pressure/health signal surfaces that condition and can demote or alarm on it. Never turn neutral breaker accounting into a `healthy=true` proof.

### 6. TRL streamed GRPO log probabilities

Pin TRL, Transformers, PEFT, Torch, Liger where used, model/tokenizer revisions, dtype, optimizer, gradient accumulation and topology. Keep a full-logit reference implementation in the evaluation harness.

For deterministic batches, compare streamed versus full-logit:

- selected per-token log probabilities;
- entropies;
- final losses for configured GRPO-family modes;
- model gradients;
- optimizer updates.

Include more scored tokens than the streaming token-chunk boundary, BF16/FP16 autocast, token- and sequence-level importance sampling, partially masked and fully masked completions, gradient accumulation and distributed execution only where the exact stack supports it. The fully masked path must remain differentiable and yield a correct zero contribution. Memory/throughput receipts are admissible only after numerical/training parity passes.

### 7. Transformers composite special-token alignment

Use at least one Llava-like image-text composite model and one text-only control. Pin processor/tokenizer and model revisions. The predecessor should demonstrate the false top-level mismatch/write without changing a production artifact.

For the candidate, exercise unchanged and changed BOS/EOS/PAD IDs, multiple EOS values, generation config, save/reload, and generation after alignment. Verify the canonical text sub-config owns the token IDs for composite models and that text-only behavior does not regress. Ambiguous composite configs must fail closed; this lane is configuration correctness, not a multimodal quality benchmark.

## Common adversarial and receipt requirements

For every executable lane:

- run at least one immediate-predecessor or known-bad negative control where technically possible;
- retain exact stdout/stderr/result summaries without secrets;
- include cancellation, restart and rollback behavior appropriate to the component;
- preserve licensing and source-content authorization separately from software correctness;
- never use synthetic fixtures as a production-evidence substitute; label them `SYNTHETIC_TEST`;
- never treat an upstream benchmark as an SZL measurement;
- never silently fall back to a different backend/hardware/model when the requested one is unavailable.

## Publication order after qualification

Only if the owner-level qualification gates are genuinely satisfied under normal controls:

1. protected GitHub source admission in the owning repository;
2. canonical Hugging Face artifact/runtime projection through the existing publisher only;
3. exact runtime readback proving the admitted source identity and required capability predicate;
4. `a-11-oy.com` product/runtime state update only from that readback;
5. `a11oy.net` proof publication only from the measured receipts.

Residual whole-chain alignment remains owned by `szl-holdings/szl-frontier#151`. Current A11oy source identity is `43058398fb8ea346a7bd977f1a35391aeec1bf1a`; the proof snapshot is still dated 2026-09-12 at 46 models / 35 datasets / 21 Spaces. Do not combine differently timed observations into a synthetic whole-chain PASS.

## Exit criteria

A candidate may leave HOLD only when its exact source, applicable model/artifact and runtime/hardware identities are closed, deterministic negative controls and candidate tests pass, rollback is demonstrated, licensing/provenance requirements are met, and the owning repository's normal checks/review admit the change. Otherwise preserve **EVALUATION / HOLD** and append evidence rather than weakening the gate.
