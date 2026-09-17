# Codex handoff — 2026-09-17 runtime correctness successors

## Authority and disposition

Canonical governance is `szl-holdings/szl-frontier#168`. This handoff is an evaluation contract only. All three candidates remain `EVALUATION / HOLD`, inherit no prior qualification, and do not authorize production route/default changes, provider writes, Hugging Face projection, public capability claims, proof-success claims, weight rehosting, or policy/protection weakening.

Pin and record the exact source and built artifact for every executable run. A moving upstream branch never inherits PASS. Hardware not available is `UNAVAILABLE`; source paths not exercised are `UNQUALIFIED`.

## Candidate A — vLLM ROCm AITER unquantized KV descales

Exact upstream: `vllm-project/vllm@19b6ff62f24d477a2760602b9e94eb6e4dd7dcdd` / PR #56726.

Build a deterministic independent oracle around the bug boundary. Seed deliberately non-neutral K/V scale tensors, run an unquantized sliding-window cache, and prove the candidate ignores those scale tensors while an FP8 cache continues to consume the intended descales. When feasible, execute a known-bad predecessor as a negative control. Bind vLLM, AITER, ROCm, driver/compiler, accelerator, model/tokenizer/processor, KV dtype and every attention flag in the receipt. Cover initial load, dummy initialization, real-weight reload, graph recapture, eager execution and representative concurrency before any aggregate quality result is interpreted.

Upstream reported MI300X InfoVQA dropping to `0.000` before the repair and returning to `0.952` after it. Treat that only as the reason for admission; reproduce an SZL-owned correctness sentinel before promotion.

## Candidate B — SGLang KDA prefill async-proxy fence

Exact upstream: `sgl-project/sglang@0443e3179fa9feada0b90e03be8567218fedad47` / PR #39124.

First prove structurally that the built kernel contains `fence.proxy.async.shared::cta` immediately after the widened shared-memory write and before the tcgen05 async read path. Then run bounded repeated B300/SM103 stress with fixed inputs against a separately computed reference. Build an intentionally fence-removed negative control from the same source boundary so the evidence demonstrates sensitivity to the missing ordering primitive. Record mismatch distribution and device faults; absence of a probabilistic race in a finite run is not sufficient by itself. CPU-only tests cannot qualify this boundary.

## Candidate C — SGLang HiCache MXFP8 scale round trip

Exact upstream: `sgl-project/sglang@4c85172f3a05d7959a69f8179587b6ac92494d06` / PR #39089.

Use payload-and-scale round-trip fixtures with destination scale rows pre-poisoned to values that would force visible corruption if the scale restore is skipped. Independently verify host-pool byte accounting. Test the supported page-first/kernel/interleaved layout and prove unsupported layout, I/O backend, scale layout and L3 flat-page combinations fail explicitly. On real hardware compare fixed-seed device-hit and host-restore logits/tokens through eviction, repeated restore, mixed batches, cancellation and worker restart. Preserve non-MXFP8 HiCache behavior as a regression lane.

## Owner routing

Prepare deterministic fixtures and offline/reference oracles in `szl-holdings/szl-forge#331`. Put hardware-bound qualification and exact accelerator/runtime receipts in `szl-holdings/szl-gpu-bridge#105`. Touch `szl-holdings/szl-serve` only after prerequisite correctness evidence exists and only through its normal route/rollback controls. Do not create a second publisher. Project into `szl-holdings/a11oy`, Hugging Face, `a-11-oy.com`, or `a11oy.net` only after the corresponding normal gates produce exact-source measured receipts.

## Alignment dependency

During this observation window, protected `szl-holdings/a11oy` main, the canonical `SZLHOLDINGS/a11oy` Space runtime honesty endpoint, and `a-11-oy.com/api/a11oy/v1/honest` all reported exact source `43058398fb8ea346a7bd977f1a35391aeec1bf1a`. That repairs the previously stale runtime/product source legs for the new source. Whole-chain closure is still forbidden because `a11oy.net/models.json` remains a dated 2026-09-12 record (46 models / 35 datasets / 21 Spaces) and the named current public-membership/proof predicates remain open under Frontier #159.

## Exit criteria

A candidate can leave HOLD only when its owning repositories' existing checks and review controls are green at the exact evaluated revision and the required correctness, negative-control, provenance, hardware, failure-mode and rollback receipts are present. No upstream benchmark, source merge, reachability check, or successful build alone is sufficient.
