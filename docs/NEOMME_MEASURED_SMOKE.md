# NeoMME: executed retrieval smoke evidence

This is an archived real CPU run, not a plan, model deployment, or independent
held-out quality claim. Hcompany owns NeoMME. SZL owns the original fixture,
execution harness, integrity checks and evidence viewer.

## Exact lineage

- Harness PR: https://github.com/szl-holdings/szl-forge/pull/172
- Merged Forge source: `2c68d3f960f506e810cec7bd52609b7b39239f68`
- Executed candidate source: `db1a868cad831c83dfd9e1fa4478985e8e634206`
- Harness path: `experiments/neomme_probe.py`
- Harness SHA-256: `c2baaebf25abada28df32d3af0f8038f4e6aead983c9d0e653bf5952f4db56a7`
- Completed clean replay: https://huggingface.co/jobs/SZLHOLDINGS/6a9f625d259f8e97255ed6ab
- Original smoke job: https://huggingface.co/jobs/SZLHOLDINGS/6a9f61b3259f8e97255ed688
- Model: `Hcompany/NeoMME-260M-Retriever@0dcb6c924435bd0bf5d504dba9ba2bb63acd8595`
- Transformers source: `cdfdcad31314fe4f23b40ab374e860a62403f72a`

The first job's connector output over-redacted nonsecret environment values.
The independently executed clean replay is therefore the complete archived
record. No redacted digest was reconstructed. Its canonical receipt digest was
recomputed after capture and matched the original job output.

## Explore and reproduce

The existing Space serves `/frontier/neomme.html`. Its browser verifies the raw
file SHA-256 before rendering any metrics. Changing the selected query or mode
explores recorded results; it never calls a model or executes a tool.

`public/frontier/neomme-smoke.v1.json` and
`hf/dataset/neomme-smoke.v1.json` are byte-identical. The existing single publisher
ships these to the Frontier Space and `SZLHOLDINGS/szl-frontier-covenant`.
No workflow permissions or publication credentials were changed.

File SHA-256: `532bd787585fcde19c3b4f90b62bcde7e584ec0ef71bc4b3e65733e158aad9f2`.
Receipt SHA-256: `e1584ec61cdaaa189891d3f0d5fcfb9d9c1803169a18bf0929daf5334754354d`.
The receipt hashes canonical sorted ASCII JSON, compact separators, before the
`receipt_sha256` member is added. It is UNSIGNED_HONEST, not a digital signature.

Run the archived-evidence regression checks with:

```bash
python3 -m unittest discover -s python/tests -p test_neomme_evidence.py -v
```

Full model execution instructions live with the Forge harness at
`experiments/NEOMME_PROBE.md`; Frontier remains a publication/control plane, not
a second model runtime. The 12 harness unit tests ran independently of model
inference. The 8 evidence checks recompute rankings and metrics and test digest,
mirror, source identity, authority, resource completeness and viewer boundaries.

## Measured scope

Six original synthetic documents; eight easy authored queries; text and rendered
384x512 RGB page images; dense cosine and masked MeanMaxSim. All four groups
returned the expected document first for all eight queries. This sample is too
small and too simple to establish superiority, generalization or production
reliability. There is no independent baseline comparison.

The clean replay used CPU float32 with two PyTorch threads. Per-item document
encoding measurements include processing plus forward execution. Peak RSS is the
Linux process high-water mark including dependencies, not model-only memory.
The report includes all scores/rankings, individual timings, dependencies, source
and fixture identities, image pixel hashes and measured resource values.

## Still unqualified

Production promotion, training, private Brain loading and route changes remain
false. Second Brain's existing live index is unchanged. Next qualification needs
a frozen independent qrels split, existing-baseline comparison, tenant and rights
admission, content-bound handles, fallback/rollback tests, an admitted runtime
image and the existing explicit release authorization. Transitive packages were
recorded, not released as a hash-locked production image.
