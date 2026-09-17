# Codex handoff — 2026-09-17 integrity successors

Canonical governance: `szl-holdings/szl-frontier#175`  
Branch source boundary: `szl-holdings/szl-frontier@f2a4dc5d68159ba05444c8e3e48d592c54f3817b`  
Disposition: **EVALUATION / HOLD**. No automatic production promotion.

## Exact upstream candidates

| Candidate | Exact source | Upstream | Initial owner |
|---|---|---|---|
| SGLang SafeUnpickler exact allowlists | `sgl-project/sglang@882577451e764a515df2a386a055012e8f075a16` | #39858 | Serve + Forge |
| SGLang FlashInfer TRT-LLM SwiGLU clamp | `sgl-project/sglang@aebae58b8c7894287a9ea8b5d844c65bbb58c9b2` | #39920 | Forge + GPU Bridge, then Serve |
| SGLang Mooncake SSD rank isolation | `sgl-project/sglang@329ffc89b9129be3ef9135108cd74f7a699e819b` | #31926 | Forge + Serve |
| vLLM supplemental BF16 autotune isolation | `vllm-project/vllm@4e5ffda19d897f3c34455167dc0503620f1b3e2a` | #57285 | Forge + GPU Bridge |
| Transformers MiniMax-M2 partial RoPE parity | `huggingface/transformers@da9d2c460c24cd9b1ee215d6e824601b48fbf9d4` | #48486 | Forge |
| TRL wrapped-packing sliced-table integrity | `huggingface/trl@f78d649ebf12dc13aa88b2d9a1c0800564d654ed` | #6670 | Forge training/evidence lane |

The machine-readable requirements are authoritative in `frontier/waves/2026-09-17-integrity-successors.json`. Do not replace exact revisions with moving branches or tags.

## Execution contract

1. **Preflight every owning repository.** Read protected `main`, required checks/rules, existing issues/PRs and current implementation paths. Reuse an active owner when scope is already covered; otherwise create the smallest child issue. Never bypass branch protection or required checks.
2. **Prove reachability before porting.** Search SZL runtime/training code and lockfiles for the affected SGLang, vLLM, Transformers, TRL, FlashInfer/TRT-LLM, Mooncake and Datasets/PyArrow paths. If an upstream boundary is not reachable by an admitted SZL path, record `NOT_REACHABLE_AT_CURRENT_SOURCE` and do not create dead code.
3. **Build deterministic fixtures before promotion logic.** Each candidate requires a known-bad or equivalent negative control where executable. A candidate test that cannot detect its predecessor failure is insufficient evidence.
4. **Bind receipts to exact bytes.** Record source revision, dependency lock, built wheel/image/module digest, model/checkpoint/config/tokenizer bytes, compiler/runtime/driver/device identity and test-vector/input hashes. Do not infer executed bytes from a repository branch name.
5. **Keep missing lanes explicit.** Hardware or runtime that is not available is `UNAVAILABLE`; an unexercised path is `UNQUALIFIED`. Neither is PASS.
6. **Preserve rollback.** Candidate routes/configurations remain opt-in and reversible until the owning repository's normal qualification gates are green. No product/HF/proof projection follows from source support alone.

## Candidate-specific minimum fixtures

### SafeUnpickler
- enumerate SZL deserialization entry points and prove which loader each reaches;
- allowed payload round trips plus rejected stdlib/multiprocessing/gadget-like globals;
- malformed/truncated/nested payloads;
- explicit assertion that no fallback reaches unrestricted `pickle.loads`/equivalent;
- distributed tensor-transfer and model-server regressions when reachable.

### FlashInfer TRT-LLM SwiGLU
- reference implementation of the clamped SwiGLU formula;
- predecessor control where `swiglu_limit` is dropped;
- explicit `gemm1_clamp_limit` precedence fixture;
- fixed-seed logits/output comparison against a separately correct backend;
- exact quantization/backend/device receipt.

### Mooncake SSD
- same-second/restart multi-rank collision control on the predecessor;
- unique DP/TP/PP/attention-CP storage paths on the candidate;
- byte identity after put/get/evict/reload under concurrency;
- old root-level cache must miss/recompute unless independently migrated and verified.

### vLLM BF16 autotune isolation
- show the supplemental BF16 tuning bucket context cannot leak to MXFP8 or another non-BF16 op;
- predecessor control that demonstrates the invalid bucket/tactic association;
- cache persistence/reload and representative shapes;
- end-to-end serving/model evidence only after unit/numerical closure.

### MiniMax-M2 partial RoPE
- assert `rotary_dim=64`, `head_dim=128` maps to `partial_rotary_factor=0.5` and the expected frequency width;
- explicit partial factor wins; no legacy field remains unchanged;
- independent frequency and rotate-half reference plus predecessor divergence;
- checkpoint-level fixed-seed logits/output parity.

### TRL wrapped packing
- inventory every historical SZL recipe using `strategy="wrapped"` and batched mapping;
- exact TRL/Datasets/PyArrow/data/recipe binding;
- multi-batch sliced offsets, ragged/empty rows, multiple columns, list/large-list and multi-process cases;
- content hashes and row-order receipts, not just counts;
- if an existing training receipt used the affected path, mark it `NEEDS_REVALIDATION` and rebuild/replay before using that receipt for downstream claims.

## Authority-chain gate

Fresh observation in this wave:
- protected GitHub `szl-holdings/a11oy@main` = `43058398fb8ea346a7bd977f1a35391aeec1bf1a`;
- `a-11-oy.com/api/a11oy/v1/honest` reports the same source revision;
- connected Hugging Face metadata confirms `SZLHOLDINGS/a11oy` exists, but metadata alone does **not** prove the currently executing container's exact source revision;
- `a11oy.net/models.json` remains a measured record captured `2026-09-12T01:25:04Z` with 46 models / 35 datasets / 21 Spaces and `operational=false`, `trained_all=false`, `benched_all=false`.

Therefore `szl-holdings/szl-frontier#159` remains the residual alignment owner. Do not close whole-chain alignment or publish a new proof-success claim from this wave.

## Verification before marking this governance PR ready

```bash
node scripts/frontier-integrity-successors-2026-09-17.test.mjs
```

Then run the repository's normal required `verify` and `witness` checks. If any invariant, source witness, branch protection, review requirement, or owning-repository evidence is not green, remain HOLD.
