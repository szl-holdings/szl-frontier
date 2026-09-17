# Codex handoff — vLLM DeepSeek V4.1 `add_generation_prompt` protocol successor

Canonical model/protocol issue: `szl-holdings/szl-frontier#134`  
Governed wave: `frontier/waves/2026-09-15-vllm-deepseek-v41-generation-prompt.json`  
Exact upstream engine source: `vllm-project/vllm@142020c6c2c0d4fec4d36df28290e3d9b654a385`  
Upstream PR: `vllm-project/vllm#56593`  
Exact model source remains the #134 binding: `deepseek-ai/DeepSeek-V4.1-Flash@df42c109f1defefcbfcedbe7d905718a12266e40`  
Execution owners: `szl-forge#310`, `szl-serve#9`, `szl-gpu-bridge#102`  
Disposition: **WATCH / EVALUATION / HOLD**

## Why this is material

The upstream Rust frontend previously had paths where the DeepSeek V3.2/V4/V4.1 renderer emitted the assistant transition, and for reasoning mode the thinking opener, at the final user-like boundary even when the caller selected `add_generation_prompt=false`. The exact successor changes the renderer so the terminal transition follows the caller option while still preserving transitions that are structurally required before an already-present assistant turn.

For SZL this is a protocol-integrity issue, not a cosmetic formatter change. Frontier #134 already requires source-owned DeepSeek V4.1 encoding rather than a generic Jinja fallback. A synthetic final `<｜Assistant｜>` or thinking opener changes exact prompt bytes, continuation semantics, tool/result boundaries, cache keys and receipt reproducibility. Upstream regression tests are useful integration evidence, but they do not qualify SZL's exact model/runtime pair or authorize a production route.

## Deduplication and ownership

Do not create a second DeepSeek model admission. Reuse the existing responsibilities:

1. **szl-frontier#134** remains canonical admission and evidence policy.
2. **szl-forge#310** owns deterministic source-owned protocol fixtures.
3. **szl-serve#9** owns engine compatibility, parser semantics, failure handling and rollback.
4. **szl-gpu-bridge#102** is needed only when accelerator-backed model execution is attempted; pure renderer fixtures should remain runnable without pretending unavailable hardware passed.
5. Existing Frontier #149 (vLLM adaptive acceptance) and #150 (SGLang native renderer) remain independent successor lanes. Their evidence does not qualify this exact vLLM source.

## Codex execution contract

### 1. Freeze identities before execution

Record:

- vLLM source `142020c6c2c0d4fec4d36df28290e3d9b654a385`;
- exact vLLM wheel/container/build digest actually exercised;
- model source `df42c109f1defefcbfcedbe7d905718a12266e40` when V4.1 fixtures consume model-owned protocol bytes;
- exact source-owned DeepSeek encoding/reference files and their hashes;
- Python/Rust frontend/runtime dependency identities relevant to the renderer.

Moving upstream `main`, another vLLM release, or another DeepSeek Hub revision inherits nothing automatically.

### 2. Build byte-exact fixture pairs

For each fixture, render once with `add_generation_prompt=true` and once with `false`, compare to the source-owned oracle, and retain the exact input/output bytes and hashes.

Minimum fixtures:

- terminal user turn;
- user followed by an existing assistant turn;
- trailing system message;
- trailing developer message;
- merged tool-result tail;
- multi-turn reasoning-effort input;
- tool-call and tool-result conversation;
- non-thinking and thinking variants where supported;
- `continue_final_message` interaction.

The negative assertion is as important as the positive one: when generation prompt is disabled, no synthetic terminal assistant or thinking opener may appear merely because the conversation ended. When enabled, the source-owned transition must appear exactly once at the correct rendered boundary.

### 3. Cross-check parser and serving behavior

In `szl-serve#9`, run the protocol fixtures through the exact successor engine path and verify:

- no Rust/Python/frontend path disagreement for the same request contract;
- no generic Jinja substitution;
- malformed/unsupported request options fail explicitly rather than silently changing prompt bytes;
- cancellation and parser errors do not leave a partial prompt/result classified as success;
- rollback to the incumbent serving path remains available;
- prompt/output receipt hashes bind to the exact source and build identity.

### 4. Model execution is a separate gate

Do not infer model correctness from renderer tests. If the runtime/hardware lane is actually available, use the existing Forge/Serve/GPU Bridge gates to run bounded text/tool fixtures before any performance work. Missing hardware or engine support is `UNAVAILABLE`, not simulated PASS.

No latency, throughput, speculative-decoding or compressed-KV result is required to establish this renderer contract. Those remain separately governed by #134 and other admitted successor waves.

## Required receipt fields

Emit at minimum:

- upstream engine source revision;
- exact engine artifact/container digest;
- DeepSeek source revision/reference-byte digests used by the fixture;
- request options including `add_generation_prompt`, `continue_final_message`, reasoning mode/effort and relevant template kwargs;
- rendered prompt bytes or canonical byte hash;
- expected oracle bytes/hash;
- fixture PASS/FAIL/UNAVAILABLE;
- parser/result disposition where applicable;
- rollback identity;
- zero production authority and zero Hugging Face mutation authority.

## Non-negotiable bounds

- no production route/default or provider change;
- no weight rehosting merely for inventory;
- no model admission change from this successor;
- no branch-protection, test, provenance, licensing, receipt or rollback weakening;
- no unsupported claim that vLLM mainline support equals production qualification;
- no inheritance from SGLang, another vLLM successor or prior DeepSeek evaluation;
- no product/Hugging Face/proof projection until exact-source normal gates pass;
- automatic production promotion remains `false`.
