# Codex handoff — Sentence Transformers approximate FAISS metric correctness

Canonical issue: `szl-holdings/szl-frontier#170`  
Retrieval owner: `szl-holdings/szl-second-brain#21`  
Shared evaluation support: `szl-holdings/szl-forge#331`  
Exact upstream: `huggingface/sentence-transformers@7ae9079733b4e7e997f0011a3fef67f73a65aeaa` / PR `#4022`  
Disposition: **EVALUATION / HOLD**

## Why this is material

The exact and approximate non-binary FAISS search paths were not using the same objective. Exact search uses inner product, while the approximate `IndexHNSWFlat` path previously relied on FAISS's constructor default squared-L2 metric. For non-normalized embeddings this can reorder results and changes score meaning. Upstream added a fixture that deliberately separates the two objectives and demonstrates the pre-fix approximate ranking error.

This is therefore a retrieval correctness boundary, not a routine dependency update.

## First gate: prove exposure

Before changing any dependency, search the active SZL retrieval code and lockfiles for the exact API and execution mode:

- `sentence_transformers.util.semantic_search_faiss` or re-exported equivalent;
- `exact=False` or configuration that resolves to approximate search;
- `float32` or `uint8` corpus precision;
- direct or transitive wrappers around that call.

If no active path can reach the affected behavior, emit an exact-source `NOT_EXPOSED` receipt with repository revision, search predicates and inspected dependency graph. Do **not** bump a production dependency merely because upstream fixed a defect.

## If exposed: deterministic correctness fixtures

Use frozen non-sensitive synthetic embeddings that cause L2 and inner-product orderings to differ. At minimum retain:

- query and corpus bytes/arrays;
- exact and approximate index types;
- FAISS version and metric enum;
- scalar precision;
- `rescore` setting;
- top-k;
- returned corpus IDs and scores.

Assert the intended inner-product ordering and score semantics. Keep approximate-recall variance separate from the metric-selection assertion; a larger HNSW index may legitimately differ from exact search because of approximation, but it must not silently optimize a different metric.

Exercise every affected precision/mode actually used by SZL. Do not broaden claimed support to unused modes solely because upstream tests them.

## Frozen retrieval evaluation

After the synthetic boundary passes, execute the existing SZL frozen retrieval slice under an exact before/after dependency pair. Record:

- Sentence Transformers and FAISS exact versions/build identities;
- corpus/eval manifest digest;
- retrieval configuration;
- changed top-k document IDs by query;
- MRR/Recall/nDCG/MAP metrics already used by the estate where applicable;
- latency/memory only as secondary measurements;
- explicit PASS/FAIL/NOT_EXPOSED/HOLD state.

Do not use live tenant content and do not contaminate sealed or refused benchmark sets.

## Rollback and projection

Retain the incumbent dependency/runtime identity and a deterministic rollback path. If compatibility breaks elsewhere, fail closed rather than changing score semantics, reranker behavior or route policy to force green.

GitHub remains the authority. Discovery creates no new Hugging Face SZL artifact, no product-route/default change at `a-11-oy.com`, and no `a11oy.net` quality claim. Downstream projection requires the normal admitted exact-source receipts.

## Non-negotiable bounds

- no production dependency bump from discovery alone;
- no live tenant corpus;
- no benchmark leakage;
- no weakened tests, policy, provenance, licensing, receipts or rollback;
- no retriever/reranker default change until qualification;
- no inference that dependency presence equals affected-path exposure;
- automatic production promotion remains `false`.
