# Codex handoff — vLLM reasoning/tool boundary parser correctness

Canonical issue: `szl-holdings/szl-frontier#168`  
Governed wave: `frontier/waves/2026-09-16-vllm-reasoning-boundary-parser.json`  
Disposition: **EVALUATION / HOLD**

## Exact source

`vllm-project/vllm@8be5205abbabf4c377c603d6c4180a99373f6415` (`#56635`, merged 2026-09-16T08:17:23Z).

The upstream correction addresses two parser-frontend faults: mixed streaming deltas containing tool calls plus reasoning-end tokens could lose content, and a new turn could be incorrectly reported as already reasoning-ended without the correct turn-boundary guard. The fix centralizes the scan and removes model-specific overrides from `Qwen3Parser` and `Glm47MoeParser`.

## Exposure gate first

Before changing any dependency, prove whether an admitted SZL serving route actually reaches this vLLM parser frontend. Search the active route/config/runtime evidence, not only source text. If no route reaches it, emit `NOT_EXPOSED` with the evidence used and stop. Do not upgrade production just because the upstream bug is real.

## Deterministic fixtures

If exposed, bind the exact vLLM artifact, parser name/configuration, model revision, tokenizer files and protocol bytes. Then build byte-exact fixtures that cover:

- a delta containing ordinary content + reasoning-end + a tool-call boundary in one chunk;
- the same logical response with each boundary split at every possible token/chunk position;
- fresh turns with and without reasoning-end tokens and with valid/invalid turn-boundary tokens;
- repeated reasoning-end markers, empty content, empty arguments, malformed JSON tool arguments and multiple tool calls;
- Qwen3Parser and Glm47MoeParser separately using their actual tokenizer token IDs;
- cancellation immediately before/after each boundary, server restart, and interleaved concurrent streams.

For every case compare the complete reconstructed visible-content bytes, reasoning-content bytes, tool name/arguments, finish reason and parser state against a declared oracle. A response that merely avoids an exception is not a PASS.

## Differential check

Where practical, run the exact incumbent artifact and exact candidate artifact over the same frozen fixtures. The candidate must repair the targeted boundary cases while preserving unaffected cases. Any change outside the declared parser semantics is a review item, not automatically accepted behavior.

## Ownership and rollback

`szl-serve` owns route exposure, streaming/protocol lifecycle and rollback. `szl-forge` owns deterministic parser fixtures and receipts. Keep the incumbent artifact addressable. Rollback must not silently change model bytes, tokenizer/template, provider authority, policy, tool schema or sampling controls.

## Projection boundary

No production route/default, Hugging Face SZL projection, `a-11-oy.com` capability claim or `a11oy.net` proof update is authorized by source support alone. Exact-source measured receipts must pass through the normal repository controls first.
