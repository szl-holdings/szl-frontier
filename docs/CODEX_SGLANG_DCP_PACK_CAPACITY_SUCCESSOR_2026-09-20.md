# Codex handoff — SGLang cached-prefix DCP pack-capacity successor

Status: **EVALUATION / HOLD**. Automatic production promotion: **false**. New paid spend: **zero**.

## Exact upstream

- Repository: `sgl-project/sglang`
- Merged PR: `#40376`
- Exact merge source: `b3e4d198af5e74e5070e541475fd767302342be9`
- Merge time observed: `2026-09-20T17:17:16Z`
- GitHub signature: verified / valid
- License observed: Apache-2.0
- Primary source: https://github.com/sgl-project/sglang/pull/40376

Do not substitute upstream `main`, a later nightly image, or a different DCP/NIXL/Mooncake revision and call it equivalent.

## Why this is material

A warm prefill radix hit can leave little compute while decode still requires a long cached KV prefix. DCP pack buffers are allocated from the compute-chunk bound, so a cached-prefix transfer can exceed one pack allocation. The successor splits these sends at the published page-aligned capacity and adds a per-DCP-rank NIXL region-capacity check so a gather cannot overwrite an adjacent packed region.

This is a transfer-integrity boundary, not a benchmark-only upgrade.

## Disconfirming evidence that must remain visible

Upstream reports useful CPU, NIXL and Mooncake-TCP evidence, but the latest peer-scoping/test edits were not followed by a rerun of the GPU matrix. Mooncake RDMA was interrupted after transport retry-counter failures. Reported performance is on Kimi Linear 48B-A3B and 8x B200 and is not an SZL measurement.

Therefore:

- no GPU/backend/model qualification transfers from upstream;
- NIXL, Mooncake TCP and Mooncake RDMA are separate evidence lanes;
- Mooncake RDMA stays `UNQUALIFIED` until a complete run exists;
- performance is evaluated only after transfer correctness and output parity.

## Owner routing

1. `szl-holdings/szl-frontier#180` — canonical exact-source governance only.
2. `szl-holdings/szl-forge` — deterministic/adversarial no-weight scheduler, segmentation, accounting and region-isolation fixtures.
3. `szl-holdings/szl-gpu-bridge` — only if already-available accelerator/transport hardware is needed for closure.
4. Existing active importing/serving owner — integration only after prerequisite qualification; do not create another serving stack.
5. `szl-holdings/a11oy` — Hugging Face/product projection only after protected admission.
6. `szl-holdings/a11oy-net` — proof only from exact measured receipts.
7. `szl-holdings/szl-frontier#151` — whole-chain reconciliation remains independent.

## Bounded Forge implementation

Start without model weights.

Create an isolated exact-source fixture that models:

- a DCP pack capacity smaller than the cached-prefix send;
- page-aligned segmentation;
- one-token/page-over-capacity cases;
- partial final pages;
- DCP rank-local packed regions surrounded by sentinels;
- ordinary TP and DCP peers sharing a prefill sender;
- cancellation, timeout and worker-restart cleanup;
- final-segment-only state/metadata delivery.

The predecessor control must demonstrate the defect or an equivalent unsafe boundary. The candidate must prove:

- no segment exceeds advertised capacity;
- no adjacent DCP rank region changes;
- total token/page accounting is conserved;
- offsets are monotonic and exact;
- KV pages are neither dropped, duplicated, reordered nor stale;
- ordinary TP traffic is not segmented solely because a DCP peer exists.

Do not weaken tests if a predecessor control cannot be reproduced. Record the limitation and retain HOLD.

## Optional accelerator closure

Only when already-available infrastructure permits it, bind all of:

- exact SGLang source/build/container;
- transfer backend and revision;
- CUDA/driver/device/topology;
- model/checkpoint/tokenizer/config when used;
- page size, chunk size, TP/EP/DCP dimensions;
- backend transport mode.

For a real-model lane, compare generated tokens and logprobs against a monolithic or otherwise independent reference before throughput claims. Keep NIXL, Mooncake TCP and Mooncake RDMA receipts separate.

No new paid job, hardware rental, checkpoint acquisition, weight mirror, or production route change is authorized.

## Acceptance

Candidate remains HOLD until the applicable owner has exact evidence for:

1. predecessor negative control;
2. bounded segmentation;
3. per-rank region isolation;
4. page/token accounting;
5. cleanup/restart behavior;
6. mixed-peer behavior;
7. backend-specific correctness;
8. model/output parity when a model lane is claimed;
9. explicit rollback.

If a backend or hardware path is unavailable, record `UNAVAILABLE`; do not infer PASS.

## Rollback

Retain the incumbent qualified topology/backend. Disable DCP relayout or the candidate packed path if segmentation, region isolation, cleanup, or output parity fails. No discovery or source-level green check authorizes production promotion.
