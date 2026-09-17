# Codex handoff — Transformers Qwen3.5-MoE GGUF exact-source watch

Canonical issue: `szl-holdings/szl-frontier#164`  
Governed wave: `frontier/waves/2026-09-15-transformers-qwen35-moe-gguf.json`  
Exact upstream source: `huggingface/transformers@26d8e7164fb94b5f5b004c03d6c405ab083a56c7`  
Upstream PR: `huggingface/transformers#48529`  
Disposition: **WATCH / EVALUATION / HOLD**

## Why this is material

The upstream change extends GGUF integration into Qwen3.5-MoE rather than merely adding another model-name alias. It adds expert-bank loading plus router and zero-centered normalization semantics. The upstream implementation explicitly calls out two numerical hazards: a superficially similar router can reorder softmax and top-k, and ordinary RMSNorm would multiply by `w` where the zero-centered form requires `1 + w`.

A loader that opens the file but maps either boundary incorrectly can generate plausible yet wrong outputs. Qualification therefore requires structural and numerical evidence, not a load-only smoke test.

## Deduplication boundary

SZL already has Qwen3.5/dense GGUF work in `szl-forge`, including Chaski and A11OY-MINI paths. Those receipts do not transfer to a Qwen3.5-MoE GGUF architecture. Do not create a second Chaski/A11OY-MINI model admission and do not rewrite dense-model evidence as MoE evidence.

## Exact-source freeze

Before any execution record:

- Transformers source `26d8e7164fb94b5f5b004c03d6c405ab083a56c7`;
- exact built wheel/container digest;
- exact Qwen3.5-MoE source-model repository/revision;
- exact GGUF repository/revision and file SHA-256;
- quantization type and conversion provenance;
- tokenizer/config file digests;
- host/accelerator/runtime identity;
- incumbent rollback route/build identity.

Moving upstream `main`, another Transformers release, another GGUF conversion, or another model revision inherits no PASS.

## Structural fixtures

Compare the GGUF-loaded graph with the canonical non-GGUF source and retain machine-readable receipts for:

1. architecture/config identity;
2. tokenizer mapping identity;
3. layer count;
4. expert count per MoE layer;
5. expert tensor names, shapes and deterministic ordering;
6. router tensor names/shapes and top-k configuration;
7. shared-expert or routed-expert topology when present;
8. zero-centered norm parameter values and locations;
9. generation/config defaults that affect deterministic comparison.

Any unmapped, duplicated, dropped or shape-incompatible expert tensor is FAIL, not a warning.

## Numerical kernel fixtures

Create synthetic deterministic tensors small enough to calculate an independent oracle.

### Router oracle

Use logits where `topk(softmax(x))` and `softmax(topk(x))` produce distinguishable weights. Assert the exact expected selected experts and routing weights from the model's specified `SoftmaxTopKRouter` semantics. Do not validate the candidate against itself.

### Zero-centered RMSNorm oracle

Use a tensor/weight pair where `x * w` and `x * (1 + w)` are observably different after normalization. Assert the source-owned `RMSNormZeroCentered` equation with predeclared tolerance.

The test receipt must name the oracle equation and exact source revision. A generic kernel name is insufficient.

## End-to-end equivalence

For a pinned legally usable Qwen3.5-MoE model pair:

- fixed prompt bytes;
- deterministic decoding or direct logits comparison;
- canonical non-GGUF output/logits;
- GGUF output/logits;
- quantization type;
- tolerance declared before execution;
- measured delta distribution;
- PASS/FAIL based on that declaration.

Keep quantization error separate from loader/kernel error. Do not increase tolerance after seeing a failure without opening a new governed evaluation revision.

## Negative cases

Exercise at least:

- missing expert tensor;
- inconsistent expert count;
- malformed expert tensor shape;
- unsupported GGUF architecture identifier;
- incompatible tokenizer/config metadata;
- truncated/corrupt GGUF fixture where safely constructible.

All must fail explicitly without partial-ready classification.

## Ownership

- `szl-frontier#164`: canonical policy and evidence gate.
- `szl-forge`: model conversion/structure/numerical equivalence fixtures when exercised.
- `szl-kernels`: only if SZL adopts/replaces router or norm execution kernels.
- active serving owner: serving compatibility/rollback if this candidate reaches serving evaluation.
- `a11oy`: product projection only after admission.
- `a11oy-net`: measured proof projection only after qualification.

## Non-negotiable bounds

- no production route or default change;
- no weight rehosting merely for inventory;
- no dense-model receipt inheritance;
- no model-family claim from load-only success;
- no hardware claim from an unavailable lane;
- no weakening tests, policy, provenance, licensing, receipts, rollback or branch protection;
- no Hugging Face/product/proof projection until normal exact-source gates pass;
- automatic production promotion remains `false`.
