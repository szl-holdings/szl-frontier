# Codex handoff — vLLM KVCR secondary-tier KV offload

Canonical issue: `szl-holdings/szl-frontier#157`  
Execution issue: `szl-holdings/szl-forge#329`  
Governed wave: `frontier/waves/2026-09-15-vllm-kvcr-secondary-tier.json`  
vLLM feature source: `000c7df9ffd3e470980fd4cd6b8ec1b0585500ff`  
KVCR release: `ai-dynamo/kvcr` tag `v0.1.0`, annotated tag `5db29e54f05be36d2afd691ba93878a99658bfe6`, peeled commit `1b790eff53edcdc6398121b6e6ee48ba43cf2579`  
Disposition: **EVALUATION / HOLD**

## Why this is material

The observed vLLM source adds `KVCRSecondaryTierManager` as a first-class optional secondary tier in the V1 KV-offload path. Its CI installs KVCR from the exact `v0.1.0` git tag and selects the NIXL wheel matching the CUDA family. This extends the serving correctness envelope beyond local cache management into an external P2P/cache-tier subsystem with router hints, remote memory lifecycle, timeouts, cancellation, failure recovery, eviction and cleanup.

Treat this as infrastructure qualification, not a model admission. It does not inherit qualification from vLLM 0.29, DeepSeek V4.1, earlier KV/cache work, NIXL availability, or an upstream test pass.

## Execution order

### 1. `szl-forge#329` — correctness and failure semantics first

Build an exact-source lane for vLLM `000c7df9ffd3e470980fd4cd6b8ec1b0585500ff` plus KVCR `v0.1.0` / `1b790eff53edcdc6398121b6e6ee48ba43cf2579`.

Record the exact vLLM source/container, KVCR source/tag, NIXL package/version, CUDA runtime, driver, PyTorch, accelerator, transport/backend settings and fixture identity in every receipt. Do not float either upstream.

Required deterministic fixtures:

1. KVCR absent -> selecting `kvcr` is explicitly unavailable while incumbent non-KVCR behavior is unchanged.
2. Exact-key hit and miss, partial remote hit, repeated miss, mixed local/remote availability and stable block ordering.
3. Byte-for-byte put/offload/fetch validation before any model-level benchmark.
4. Fixed prompt/model-byte output equivalence against the same exact runtime with KVCR disabled.
5. Local DRAM and configured secondary-tier allocation, pin/release, eviction pressure, saturation/backpressure and resource cleanup.
6. Supported multi-block and multi-pool layouts, with explicit `UNAVAILABLE` when the exact stack cannot exercise a path.
7. Timeout before transport submission, timeout after native submission, cancellation, late completion, remote source/target loss and remote-write uncertainty.
8. Guard-confirmed source death, quarantine/tombstone cleanup, worker restart and shutdown.
9. Concurrent request/session isolation plus key-collision negative controls. No stale or cross-request KV may become readable.
10. Performance measurements only after correctness passes: transfer/cache latency, hit behavior, TTFT, ITL, throughput and memory under fixed loads.

Successful import, upstream unit tests, or a throughput improvement alone is not qualification.

### 2. `szl-gpu-bridge` — NIXL/CUDA/transport closure

Bind the exact accelerator SKU/count, driver, CUDA, NIXL wheel/version, network/interconnect and any GDR/RDMA or host-memory assumptions actually exercised. Validate resource ownership and cleanup under cancellation, source/target loss, timeout, restart and shutdown. Missing hardware or transport prerequisites are `UNAVAILABLE`, never simulated PASS.

The vLLM integration's CUDA-family NIXL wheel selection is integration evidence, not proof that the estate's runner has a qualified transport stack.

### 3. `szl-serve` — router hints, isolation, fallback and rollback

Router hints are cache-location evidence only. They must never authorize a model, provider, tenant, policy, tool or paid route.

Prove:

- malformed/unsupported hints fail safely;
- cache lookup cannot cross request/session/tenant boundaries;
- cancellation or a late completion cannot repopulate stale KV into a new request;
- disabling KVCR returns to the incumbent exact model/runtime/protocol path;
- if a fallback would alter model bytes, tokenizer/protocol, provider authority, quantization or policy, fail closed instead of silently substituting;
- exact source/runtime/dependency identity is present in the serving receipt.

### 4. Provenance and license boundary

Record the upstream and transitive license/provenance obligations for KVCR, NIXL and the complete evaluated runtime before promotion. Do not infer transitive compatibility from vLLM's source license or from a successful installation.

No upstream weights are required or authorized to be rehosted merely for this integration inventory.

### 5. Authority-chain projection boundary

Until exact-source evaluation passes the repository's normal controls:

- no new SZL Hugging Face artifact/runtime projection;
- no `a-11-oy.com` KVCR capability, default or production claim;
- no `a11oy.net` PASS/success claim beyond exact measured receipts and known bounds;
- no production cache/default/provider change;
- no policy, provenance, receipt, rollback or branch-protection weakening.

## Exit criteria

Remain **HOLD** unless the exact source/dependency closure proves byte correctness, model-output equivalence against the same exact runtime without KVCR, deterministic hit/miss behavior, isolation, timeout/cancellation/failure/restart/shutdown semantics, cleanup/resource safety, fail-closed fallback, exact hardware/runtime identity and measured benefit under the same workload.

Any later vLLM or KVCR source revision is a new evidence boundary and inherits no qualification automatically.
