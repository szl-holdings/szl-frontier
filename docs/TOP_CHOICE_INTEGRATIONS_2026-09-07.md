# SZL Frontier Top-Choice Integration Contract — 2026-09-07

Status: **evaluation authority only**. Production promotion remains deny-by-default.

## Design rule

SZL does not relabel upstream work as proprietary invention. We absorb useful primitives the way a design house studies construction: preserve the upstream identity, license, and provenance, then make the surrounding system distinctly SZL through contracts, orchestration, evaluation, evidence, routing, receipts, rollback, and interaction design.

The canonical intake stays `szl-holdings/szl-frontier`; creating another frontier repository would add estate sprawl without adding authority. The Hugging Face mirrors are `SZLHOLDINGS/szl-frontier` (runtime Space) and `SZLHOLDINGS/szl-frontier-covenant` (governance/evidence dataset).

## Promotion topology

```text
primary Hugging Face source
        |
        v
szl-frontier source pin + license posture + materiality
        |
        v
category-specific shadow evaluation
        |
        +--> K2 ------> szl-nemo -> szl-serve -> szl-router -> A11oy
        +--> NeoMME --> szl-second-brain / szl-lake -------> A11oy
        +--> Funes ----> Memory Covenant interchange ------> A11oy
        +--> WebGPU ---> szl-kernels / browser runtime ----> A11oy
        +--> Vaani ----> gated speech-data sandbox --------> szl-nemo
        |
        v
sealed evidence receipt + explicit production authorization
```

No model, dataset, kernel, retriever, memory index, or upstream benchmark can bypass A11oy policy/approval authority.

## 1. K2-Horizon-MoVA-36B-A4B — P0

Primary source: `IFM/K2-Horizon-MoVA-36B-A4B`.

Pinned baseline:
- revision `05cab0a4d7150c1c460a000b37ff40cc1af2feaa`
- normalized artifact fingerprint `259e31e5a7143d4f6cca70ed238296e9374b0a51aa497563f62e10af990ec9e2`
- 63 tracked artifacts at admission
- Apache-2.0, public, ungated at admission

SZL primitive: **Governed Agent Model Contract**.

Target organs:
- `szl-nemo`: model qualification and task/tool benchmark owner
- `szl-serve`: pinned serving adapter, runtime/quantization evidence, SLOs
- `szl-router`: bounded capability/cost/fallback routing only after qualification
- `a11oy-factory`: schema/tool-use/post-training comparison fixtures
- `a11oy`: final policy, approval, execution, verification, receipt authority

Required proof before promotion:
- custom/remote model code inspection and exact runtime pin
- agent task success and exact tool-call arguments on held-out workflows
- governed JSON/receipt schema exactness
- 32K -> 128K -> 256K -> 512K long-context grounded-recall ladder with distractors and tenant/domain canaries
- unsupported-claim rate and citation/provenance fidelity
- TTFT, tokens/sec, p50/p95 latency, peak GPU memory, concurrency and rollback
- explicit confirmation that model output never receives direct action authority

## 2. NeoMME Retriever — P0

Canonical evaluated artifact: `Hcompany/NeoMME-260M-Retriever`.

SZL primitive: **Evidence-Native Multimodal Retriever**.

Target organs:
- `szl-second-brain`: multimodal page/image memory retrieval
- `szl-lake`: checksum-pinned document/page-image corpus and derived indexes
- `a11oy`: evidence references and approval context
- `lyte-services` / PRISM surfaces: domain-specific document retrieval once the shared benchmark passes

Required proof:
- identical qrels against current SZL retrievers
- nDCG@10, Recall@100, encode throughput, p95 query latency, index bytes/document
- document screenshots and text inputs tested separately and together
- exact source/page provenance survives late-interaction compression
- safe text-only fallback for unsupported inputs

## 3. Funes — P0 architecture adoption

Primary source: Hugging Face Funes release article.

SZL primitive: **Memory Covenant Interchange**.

We adopt the pattern, not an unreviewed memory authority. Raw traces remain evidence; embeddings/vector/BM25 indexes are derived and disposable.

Target organs:
- `szl-frontier`: covenant/policy owner
- `szl-second-brain`: recall and derived-index implementation
- `a11oy`: tenant/domain/purpose/approval boundary

Required proof:
- relevant-memory recall@10
- exact provenance from every returned chunk to the raw trace/span
- secret exposure rate = 0
- cross-tenant leakage rate = 0
- deleted/tombstoned memory return rate = 0
- portable-sync divergence bounded and measured
- derived index can be rebuilt from admitted raw evidence

## 4. Hugging Face WebGPU kernels — P1

Primary source: `@huggingface/kernels` / `webgpu-kernels`.

Admission baseline: 207 published WebGPU kernel packages.

SZL primitive: **Browser Kernel Plane**.

Target organs:
- `szl-kernels`: selected operator qualification and provenance
- `szl-serve`: browser/server placement decisions and fallback
- `a11oy`: policy-bound client inference operations
- `szl-frontier`: upstream inventory watch

Required proof:
- reference-output parity by browser/device/dtype/shape
- p50/p95 latency and peak memory against the current WebGPU path
- device-loss and unsupported-operator fallback
- reduced-motion/accessibility behavior remains unaffected by compute placement
- selected kernel license/provenance rechecked individually before reuse

## 5. Vaani Noise Event Dataset — P1 gated

Primary source: `ARTPARK-IISc/Vaani-Noise-Event-Dataset`.

Pinned public-metadata baseline:
- revision `be488e2ac12fd62bef46b9f83e3a5feded575333`
- normalized artifact fingerprint `eaaee5703e5288affd9447ffb29feca84df66f0b70eef152a1f8913e8db7d4da`
- 184 tracked artifacts in public metadata at admission
- card license CC-BY-4.0
- **gated content access**

SZL primitive: **Acoustic Robustness Lane**.

Target organs:
- `szl-nemo`: noise-aware speech/ASR evaluation after authorized access
- `szl-serve`: streaming acoustic preprocessing measurements
- `szl-lake`: only admitted, checksum-pinned samples after access approval
- `a11oy`: provenance, retention, purpose and deletion policy

Do not bypass the Hub gate. Public metadata is sufficient for source monitoring; data download, training, or redistribution remains blocked until an authorized operator accepts the access conditions and the intended use is admitted.

## Estate contract

The five choices are machine-readable at:
- `public/frontier/top-choice-integration-matrix.v1.json` — public Space/runtime integration matrix
- `hf/dataset/frontier-top-choices.v1.jsonl` — Hugging Face covenant dataset records
- `python/szl_frontier/admissions.py` — Python-only source admissions for K2 and Vaani; NeoMME, Funes and WebGPU remain in the JS catalog
- `python/szl_frontier/evaluation.py` — category-specific evaluation plans

The existing `hf-sync.yml` publisher remains the deployment authority: a protected `main` revision is published to `SZLHOLDINGS/szl-frontier`, the `hf/dataset` directory is published to `SZLHOLDINGS/szl-frontier-covenant`, and live Space `deployment.json` must read back the exact GitHub SHA.

## Zero-bandaid exit criteria

A candidate is not “wired” merely because code imports or a demo answers a prompt. The integration is complete only when:
1. exact upstream source/revision/license is pinned;
2. the target organ consumes the normalized contract rather than hard-coding an upstream implementation detail;
3. held-out evaluation beats or justifies replacing the current baseline;
4. failure, fallback, rollback, privacy and provenance are witnessed;
5. outputs stay behind A11oy policy/approval boundaries;
6. a sealed evidence receipt exists; and
7. production promotion is separately authorized.
