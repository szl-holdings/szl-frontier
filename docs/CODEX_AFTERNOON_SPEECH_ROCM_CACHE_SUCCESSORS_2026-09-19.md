# Codex handoff — Sep 19 afternoon speech and ROCm cache successors

Canonical governance: `szl-holdings/szl-frontier#180`

Governed wave: `frontier/waves/2026-09-19-afternoon-speech-rocm-cache-successors.json`

Observed protected Frontier source: `10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e`

Disposition: **EVALUATION / HOLD**. This handoff authorizes deterministic preparation and bounded evaluation only. It does not authorize a dependency bump, provider write, model publication, weight mirror, product route/default change, paid job, production promotion, proof-success claim, branch-protection bypass, or weakening of licensing/provenance controls.

## Exact upstream pins

| Candidate | Exact source | Upstream PR | Primary owner after governance |
|---|---|---:|---|
| HiggsAudio v2 reference-audio cache salt | `vllm-project/vllm-omni@f9f53f2bd8ddf7c7990b167d448108daa50f992a` | #7826 | Forge; active serving owner only after qualification |
| DeepSeek-V4 ROCm draft compressed-KV metadata isolation | `sgl-project/sglang@2305242f514da95eba3c411de0517c4d79ffff94` | #40205 | Forge + GPU Bridge |

Exact-revision searches across the SZL estate found no existing governed record for either revision before this wave was added. Existing vLLM-Omni prefix-cache and SGLang DeepSeek-V4 waves transfer no qualification.

## 1. Preflight

1. Read protected `szl-frontier/main`, #180, the current integration PR, and the owning execution repositories before writing.
2. Re-deduplicate by exact upstream revision and evaluation predicate. Do not create another serving stack or model admission issue.
3. Put deterministic source/cache fixtures in `szl-holdings/szl-forge` unless an existing active runtime owner already contains the exact harness. Accelerator-specific closure belongs in `szl-holdings/szl-gpu-bridge`.
4. Every receipt must bind SZL source SHA, upstream SHA, executed package/image, test inputs, dependency lock, runtime/hardware where relevant, result, and known limits.
5. Missing model rights, accelerator access, runtime support or an unexecuted topology is `UNAVAILABLE`/`UNQUALIFIED`, never PASS.

## 2. HiggsAudio v2 reference-audio cache identity

Primary source fix: `vllm-project/vllm-omni@f9f53f2bd8ddf7c7990b167d448108daa50f992a`.

Observed Hugging Face model reference: `bosonai/higgs-tts-2-3b-base`; current Hub metadata reports license `other`. Therefore **real checkpoint execution and any projection are license-gated**. Do not download or mirror the model merely to evaluate this source fix.

### Source-only deterministic lane

Build a synthetic speech-adapter fixture that does not require model weights:

- two distinct synthetic reference-audio byte streams;
- equal sample rate, duration/frame count and placeholder token ids;
- deterministic distinct resolved reference-audio cache keys;
- a same-audio control that resolves to the same key;
- text-only control.

Run the immediate predecessor/equivalent known-bad path and preserve evidence that distinct same-shaped conditioning can collapse to one prefix-cache identity. Then run the candidate and require:

- distinct conditioning -> distinct `cache_salt`;
- identical admitted conditioning -> stable identical `cache_salt`;
- text-only behavior unchanged;
- no raw audio or transcript leakage into logs/receipts;
- malformed/missing reference-audio identity fails closed rather than falling back to an unsalted shared prefix.

Add concurrency, cancellation, restart and warm/cold cache controls. A passing synthetic lane qualifies only the cache-identity contract; it does not qualify HiggsAudio model quality, voice cloning, or production speech serving.

### Real-model lane

Run only after license/rights review explicitly allows it. Bind exact model revision/files and audio-tokenizer identity, then compare cache-enabled versus cache-disabled outputs for same/different reference audio. No provider upload of private audio. Prefix-cache-disable remains rollback.

## 3. DeepSeek-V4 ROCm draft compressed-KV metadata

Primary source fix: `sgl-project/sglang@2305242f514da95eba3c411de0517c4d79ffff94`.

The predecessor requests compressed/indexer metadata on speculative draft workers even though their compression ratios are zero and their draft pool has no compressed indexer. The unified-KV path can also dereference absent compressed page data. This is a startup/cache metadata correctness boundary on ROCm.

### Required controls

Bind:

- exact SGLang build;
- ROCm/HIP/Torch/AITER/backend revisions actually exercised;
- exact DeepSeek-V4 checkpoint/config/tokenizer identity;
- accelerator model and device count;
- TP/DP topology;
- speculative algorithm and parameters;
- `unified_kv_triton` or other exact attention backend state.

Preserve an immediate predecessor negative control showing the missing indexer/compressed metadata failure and, when reachable, the absent compressed-page dereference. Keep prerequisite fixes such as pool sizing and ROCm speculative tree device acceptance separately identified; do not attribute those effects to #40205.

Exercise DSpark and every actually supported EAGLE/MTP lane, graph capture/replay, unified-KV on/off, target versus draft workers, empty compressed tails, SWA verify-store writes, cancellation and worker restart. Qualification requires:

- no draft compressed-pool allocation where the model contract says none exists;
- no assertion, OOB, NaN, stale or foreign cache state;
- target-worker compressed behavior unchanged;
- deterministic accepted-token/output parity versus non-speculative or independently qualified reference serving.

CUDA-only results cannot close this ROCm lane. If affected MI3xx-class hardware or exact model access is unavailable, emit `UNAVAILABLE_HARDWARE` or `UNAVAILABLE_MODEL` and leave HOLD. Non-speculative serving remains rollback.

## 4. Common evidence and release requirements

For both candidates:

- exact predecessor and candidate identities;
- immutable input hashes and bounded test corpus;
- local/source tests before any hardware execution;
- no secrets or private user data in fixtures;
- no retry loops that turn deterministic failure into apparent success;
- no production route/default changes during evaluation;
- no weight rehosting for inventory;
- preserve all existing branch protection, signatures, provenance, licensing, scanners, rollback/fallback and human-authority boundaries.

Only after owner-level evaluation passes may the existing serving owner consider integration through its normal protected controls. Product/Hugging Face projection follows admitted GitHub source; `a11oy.net` may publish only exact measured receipts. Residual whole-chain alignment remains independently owned by `szl-holdings/szl-frontier#151`.
