# Second Brain 1.4.1: full public-corpus execution record

This continues the earlier six-document NeoMME smoke. The existing Brain package
now has native neural retrieval over its actual 575-row public corpus, strict
whole-corpus admission, immutable request generations, a larger internal sparse
candidate pool and a bounded body-embedding cache. No second public service is
created here. Hcompany retains NeoMME authorship; SZL owns this integration.

## Actual source and execution

- Core integration: https://github.com/szl-holdings/szl-second-brain/pull/18
- Performance repair: https://github.com/szl-holdings/szl-second-brain/pull/19
- Merged 1.4.1: `74aea2a4103fcf9cd6d013b69fbe51e5472f4bb6`
- Executed head: `76e1eb42a115b41724fa469ba238f1d81bd13583`
- Native run: https://huggingface.co/jobs/SZLHOLDINGS/6a9ff8ff8e5f7b7fd14cbbe3
- Job inspection: COMPLETED, finished 2026-09-08T12:11:43.128Z.
- 69 repository tests passed; isolated wheel installation and native model
  execution happened outside the source checkout.

The original uncached job hit its time limit after its first complete corpus run.
Its timeout is preserved in the record, not called a completed restart check.
The new completed job built all 575 vectors, restored their exact file in a fresh
Python process, and ran the same eight diagnostic queries through real hybrid
retrieval, 24-candidate body reranking and authorized hydration in both processes.
All recorded rankings and hydration digests matched. Dense index bytes also
matched the earlier uncached observation.

## Warm is not cold

Observed warm query latency: 0.3028 to 0.4216 seconds, median 0.328638 seconds.
Earlier uncached median: 42.876987 seconds. These are recorded separate runs, not
a randomized same-worker causal ablation or an SLA. Cold lazy body-cache queries
after restore took 12.5270 to 44.7306 seconds; do not hide that distinction.

The persisted dense index has 575 x 1024-dimensional vectors, 12,480,582 JSON
bytes. Its fresh-process restore took 0.297642 seconds excluding model loading
and lazy body-cache warming. Cache payload was 63,686,144 bytes for all 575 public
bodies with 192 hits and no evictions in the warm run; this is not total process
memory. Observed first-process peak RSS including dependencies was 3,639,939,072
bytes. The record retains all timing observations and both process cache states.

## Publication and verification

`public/frontier/brain-neomme-1.4.1.json` and
`hf/dataset/brain-neomme-1.4.1.json` are byte-identical projections. File SHA-256:
`4d304899485766fd5b5201a719be7baffce0be3d4f08df7ca2f2e29e5c4d9286`.
The existing canonical publisher projects these to the Frontier Space and
`SZLHOLDINGS/szl-frontier-covenant` after normal source admission.

This is explicitly a captured job SUMMARY, not the full execution receipt. The
full build/restore records and their original hashes remain in the job logs; the
job's final step rehashed both before reporting PASS. A hash in this summary is
not an independently verified digital signature or independent reexecution.

```bash
python -m unittest discover -s python/tests -p test_brain_neomme_execution.py -v
```

Five offline archive checks verify identical bytes, exact identities, complete
warm/cold observations, recomputed medians, cache bounds and no inferred private,
quality or deployment authority. They do not rerun the neural model.

## Still not complete

This is 575 indexed documents and EIGHT diagnostic queries, not 575 independently
labelled relevance cases. Native encoder/query/persistence execution is verified;
independent qrels quality, a private graph, private-session persistence, revocation
and cross-container durability are not. Current Forge runtime dependency pins
were not changed by these Brain or Frontier PRs. The product and proof domains
must not inherit a live neural capability merely from this evidence publication.

Next work is the existing Forge's qualified worker/index admission and controlled
runtime integration, independent Brain qrels, cold-cache lifecycle improvement,
and separately authorized private-source/access lifecycle. The authority chain
remains GitHub -> Hugging Face -> a-11-oy.com -> a11oy.net.
