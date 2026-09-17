# Codex handoff — SGLang Rust native renderer for DeepSeek V4 no-template models

Canonical issue: `szl-holdings/szl-frontier#134`  
Canonical companion wave: `frontier/waves/2026-09-14-sglang-deepseek-v4-native-renderer.json`  
Upstream SGLang source: `07e1918924b11223c185544507669f9eb02c9b65`  
Disposition: **EVALUATION / HOLD**

## Material boundary

SGLang's Rust OpenAI frontend previously disabled `/v1/chat/completions` when a model shipped no `chat_template`. The exact upstream source above now falls back to `dynamo_renderer::native_formatter_for` when no explicit `--chat-template` is supplied and the tokenizer configuration has no template. The Python side passes the Hugging Face `model_type` into the Rust server for selection. The change bumps `dynamo-renderer` to 5.1.2.

The upstream PR explicitly names DeepSeek V4 as the motivating no-template model family. This aligns directly with Frontier #134, which already requires DeepSeek-V4.1's source-owned encoding reference to remain the prompt/protocol authority. The SGLang native renderer is therefore an implementation candidate, never a new semantic authority.

## Execution order

### 1. `szl-serve#9` — byte-level protocol parity

Add an evaluation-only SGLang Rust profile pinned to `sgl-project/sglang@07e1918924b11223c185544507669f9eb02c9b65` and receipt the exact Rust dependency lock, including the Dynamo renderer/protocol/tokenizer versions actually built.

For the exact DeepSeek-V4.1 model/tokenizer revision governed by Frontier #134, construct deterministic fixtures from the source-owned encoding reference and compare the complete rendered bytes/tokens produced by the SGLang native renderer for:

1. single-turn text;
2. multi-turn messages;
3. numeric reasoning-effort state;
4. tool definitions and tool-call encode/decode;
5. image-bearing messages where the exact model protocol supports them;
6. stop/termination behavior;
7. streamed response parsing;
8. Chat Completions framing;
9. Responses framing only if the bound serving path explicitly claims it.

Any byte/token mismatch is a protocol failure until understood and governed. Do not normalize a mismatch away merely to obtain parity.

### 2. Prove formatter precedence and refusal

The serving test matrix must demonstrate the actual precedence contract:

- explicit `--chat-template` -> explicit template path;
- supported legacy inference -> legacy path where upstream selects it;
- valid tokenizer `chat_template` -> Hugging Face template path;
- no template + recognized native model -> Dynamo native formatter;
- no template + no native formatter -> refusal.

Never invent a generic Jinja fallback for DeepSeek-V4.1. A missing or unsupported renderer is `UNAVAILABLE`/refusal, not a best-effort prompt rewrite.

### 3. Dependency and configuration integrity

Receipt and verify:

- SGLang exact commit;
- `dynamo-renderer` exact package/source identity (the admitted source declares 5.1.2);
- related `dynamo-protocols` and `dynamo-tokenizers` lock identities from the evaluated build;
- model/tokenizer immutable revisions and digests;
- `model_type` value presented to the Rust server;
- container/build digest.

Exercise wrong `model_type`, missing tokenizer config, malformed template config, dependency mismatch and deliberately unsupported models. Each must fail predictably without silently selecting a semantically different formatter.

### 4. `szl-forge#310` — protocol oracle

Forge retains the exact source-owned DeepSeek encoding fixtures used as the semantic oracle. Serve consumes those fixtures; it must not regenerate the expected answer from the same SGLang/Dynamo implementation under test.

### 5. Failure and rollback

Exercise cancellation, malformed tool/image inputs, renderer initialization failure, process restart and rollback to the incumbent serving path. A native-renderer success cannot independently qualify the DeepSeek model, compressed-KV path, speculative decoder or product route.

### 6. Projection boundary

Until parity and failure gates pass under normal controls:

- no new SZL Hugging Face runtime projection;
- no `a-11-oy.com` serving/capability/default claim;
- no `a11oy.net` success claim beyond exact-source measured receipts and known bounds.

## Exit criteria

Remain **HOLD** unless the exact SGLang/Dynamo build produces source-oracle-equivalent protocol bytes/tokens on the governed fixture set, fails closed on unsupported/malformed states, proves restart/rollback, and passes repository protections. Later SGLang or Dynamo revisions inherit no qualification automatically.
