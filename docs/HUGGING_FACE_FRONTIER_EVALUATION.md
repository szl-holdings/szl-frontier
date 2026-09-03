# Hugging Face Frontier Evaluation Plane

**Status:** operational intake and notification controls; no upstream artifact is production-promoted.

## Contract

The evaluation plane implements the sequence:

1. Observe only primary Hugging Face sources.
2. Reject releases older than the admitted cursor, non-Hugging Face sources, untrusted publishers, private or gated repositories, irrelevant task families, and low-signal editorial/event content.
3. Compute a transparent materiality score from impact, SZL estate fit, evidence quality, integration readiness, and risk penalty.
4. Admit candidates at **70/100** for evaluation.
5. Deduplicate each candidate with a SHA-256 fingerprint.
6. Open a GitHub issue only for a new material fingerprint.
7. Keep production at **HOLD** until license, correctness, performance, reliability, cost, rollback, and receipt gates pass.

Discovery never installs, downloads, executes, routes, or deploys upstream code or weights.

## Admitted September 2026 candidates

| Candidate | Evaluation posture | First operational gate | Production |
|---|---|---|---|
| `@huggingface/kernels` and WebGPU kernels | Evaluate now | Browser/device preflight, then operator correctness and end-to-end workload benchmarks | Hold |
| Qdrant FineWeb-10B and Supernova | Benchmark first | Checksum-pinned bounded shard with retrieval ground truth | Hold |
| Puffin-World | Sandbox only | Reproduce one static-scene task in an isolated CUDA environment | Hold |
| IBM Granite time series in Confluent | Evaluate now | Local TTM baseline before early-access streaming integration | Hold |

The canonical catalog is `src/lib/frontier/release-catalog.js`. Its deterministic public projection is `public/frontier/release-evaluation-manifest.v1.json`.

## Live surface

The `/frontier` route provides:

- materiality score and evaluation decision;
- production disposition;
- maturity, resource, and license posture;
- target SZL organs;
- evaluation and production gates;
- primary release and artifact sources;
- a browser WebGPU adapter preflight;
- downloadable release witness JSON.

The WebGPU preflight proves only that a browser can obtain an adapter. It does not load a Hugging Face kernel and does not prove correctness, performance, license admission, or production readiness.

## Automated watch

`.github/workflows/frontier-watch.yml` runs daily and can also be dispatched manually.

The watcher covers:

- official Hugging Face blog releases through the RSS feed;
- newly created model repositories from a bounded trusted-publisher allowlist;
- newly created dataset repositories from a bounded trusted-publisher allowlist;
- expansion of the `webgpu-kernels` Hub inventory beyond the admitted baseline.

The scheduled job may create issues labeled `frontier-release`. Manual runs are dry by default; the `notify` input must be enabled to open issues.

Each issue contains a fingerprint marker. Open and closed issues are searched before creation, so the same upstream evidence does not notify twice.

## Verification

```bash
npm ci
npm run typecheck
npm test
node scripts/generate-frontier-release-manifest.mjs --check
npm run build
node scripts/frontier-proof.mjs
```

The proof witness includes hashes for the release catalog, WebGPU probe, watcher, alert emitter, scheduled workflow, and generated public manifest.

## Promotion rule

A release may be promoted only when all of the following are evidenced:

- exact upstream artifact and source revision;
- admitted license and downstream terms;
- reproducible correctness and domain benchmark results;
- latency, throughput, memory, storage, network, and cost evidence;
- degraded-mode, abstention, rollback, and recovery behavior;
- security and data-governance review;
- target-organ integration test;
- sealed SZL receipt tied to the exact source and deployment revision.

Until then, the default effect remains **HOLD**.
