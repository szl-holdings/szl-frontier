# Codex handoff — Sep 20 early Diffusers varlen compile successor

Canonical governance: `szl-holdings/szl-frontier#180`

Governed wave: `frontier/waves/2026-09-20-early-diffusers-varlen-compile-successor.json`

Observed protected Frontier source: `4f40cdf2f0bb218f75f43e03e7246f67fb24583f`

Disposition: **EVALUATION / HOLD**. This handoff authorizes bounded deterministic preparation and owner-local evaluation only. It does not authorize a Diffusers dependency/default change, provider write, checkpoint download, paid accelerator job, production promotion, proof-success claim, credential mutation, branch-protection bypass, or weaker tests/licensing/provenance.

## Exact upstream pin

| Candidate | Exact source | Upstream PR | Existing owner after governance |
|---|---|---:|---|
| Flash/Sage varlen dynamic-shape compile integrity | `huggingface/diffusers@80c7ed262aeffbeb43ef13ae04baeb9b84515a69` | #14568 | Forge for deterministic fixtures; GPU Bridge only for an already-available consumed backend; actual importing owner after qualification |

Primary source: `https://github.com/huggingface/diffusers/pull/14568`

The merge commit was read directly from upstream GitHub and reports `verification.verified=true`, `reason=valid`. The public upstream repository currently reports Apache-2.0. Exact-SHA searches of the accessible SZL Frontier issue queue found no prior governed record for this revision before this wave. Existing Diffusers disk-offload and Qwen-Image waves transfer no qualification.

## Why this is material

The shared `_prepare_for_flash_attn_or_sage_varlen_*` helpers previously constructed uniform cumulative sequence lengths with a cumsum over a symbolic fill value. Under `torch.compile(dynamic=True, fullgraph=True)`, Inductor can rewrite that pattern into an unsupported FakeTensor/Node multiplication. The no-mask path also used `seqlens.max().item()` even though the uniform maximum was already known, forcing a graph break and GPU-to-CPU synchronization.

The successor uses `torch.arange` for uniform offsets, returns the known Python sequence length on the no-mask path, handles zero-length sequences explicitly, and adds a dynamic-compile regression. This is an execution-compatibility boundary shared by pipelines that select FlashAttention or SageAttention varlen dispatch.

## Upstream claims versus SZL measurements

Upstream reports that the new construction is bit-identical to the predecessor helper across tested shapes and that real `flash_attn_varlen_func` with flash-attn 2.8.3 on one H200 compiled dynamically and matched eager output with max diff 0.0. Treat those as **upstream measurements only**.

SZL has not reproduced those results in this handoff. The masked key-length path remains data-dependent and still requires `.item()`. Upstream's real-backend verification cited FlashAttention, not an independent SageAttention qualification. The self-review also notes that there is no direct CPU unit test for these helpers. Those limits must remain visible in every receipt.

## Bounded deterministic lane

Start without model weights.

1. Pin the exact Diffusers source/wheel plus Torch/Inductor and Python identities.
2. Reproduce the predecessor symbolic-cumsum compile failure or an equivalent known-bad fixture. Preserve the failure as evidence.
3. Build an independent oracle for cumulative offsets and maximum lengths across:
   - zero-length sequence;
   - batch size 1;
   - changing batch sizes;
   - changing uniform sequence lengths;
   - masked and unmasked inputs;
   - malformed or inconsistent masks that must fail explicitly.
4. Compare helper outputs byte/value-for-value against the oracle. Do not infer backend qualification from helper arithmetic alone.
5. If an SZL consumer actually uses FlashAttention or SageAttention, run eager versus compiled output parity on only the already-available backend/hardware. Bind exact backend/kernel, CUDA/driver/Torch and fixture identities.
6. FlashAttention evidence does not qualify SageAttention. An unavailable backend remains `UNAVAILABLE`/`UNQUALIFIED`.
7. Exercise compile cache warm/cold behavior, supported shape changes, error propagation, cancellation and restart where the owning runtime exposes those transitions. A graph break or backend fallback is not PASS unless the declared contract explicitly permits it and the receipt records the fallback.

## Resource and rollback boundary

- New paid spend: **zero**.
- No new checkpoint acquisition is needed for the source/helper lane.
- Do not mirror third-party weights for this evaluation.
- Use an already-admitted local fixture or a tiny synthetic attention harness unless an exact checkpoint is independently governed and already available.
- Keep eager/uncompiled attention or the previously qualified backend as rollback.
- Do not change a production compile/backend default until owner-level evidence is exact-head green and normal release gates pass.

## Release boundary

Promotion, if ever eligible, proceeds only through the actual importing repository and its existing protected controls. Hugging Face/product projection remains downstream of admitted GitHub source; `a11oy.net` may publish only exact measured receipts. Residual whole-chain alignment remains independently owned by `szl-holdings/szl-frontier#151`.
