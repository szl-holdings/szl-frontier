# Python Frontier Control Plane

The Python control plane is the evidence-first counterpart to SZL Frontier's existing JavaScript Hugging Face release watcher. It is intentionally **not** a second source of production authority. Its job is to turn frontier releases into reproducible evaluation contracts, bounded source observations, and tamper-evident receipts.

## Design contract

The implementation is split along four engineering responsibilities so each layer can be reasoned about independently:

1. **Domain + policy** — immutable dataclasses, schema validation, deterministic materiality scoring, fail-closed promotion gates.
2. **Hub evidence transport** — HTTPS-only `huggingface.co` probes with exact-origin redirect checks, timeouts, response-size bounds, and normalized model/dataset/blog snapshots.
3. **Experiment planning** — category-specific benchmark contracts for retrieval, speech, ASR, post-training, multimodal gateways, runtimes/kernels, and world models.
4. **Evidence + automation** — SHA-256 content addresses, optional HMAC-SHA256 receipts, hash chaining, atomic notification state, and a machine-readable CLI.

The package has **zero runtime third-party dependencies**. That is deliberate: scheduled source inspection and policy verification should not acquire a new dependency tree merely to decide whether another dependency is worth evaluating.

## Cross-runtime invariant

`public/frontier/release-evaluation-manifest.v1.json` remains the JavaScript-generated baseline. Python imports it and recomputes the following fields for every JS-admitted release:

- materiality score;
- evaluation decision; and
- production disposition.

If the Python result differs from the generated manifest, catalog loading fails. CI therefore catches policy drift between the JavaScript watcher and Python control plane before merge.

## New curated admissions

The Python layer adds three currently material releases that were not in the generated manifest when this control plane was authored:

| Release | Score | Evaluation lane | Production |
|---|---:|---|---|
| Open Yap 1K | 81 | `speech-data-sandbox` | HOLD |
| VLM Run Gateway | 72 | `external-vlm-bakeoff` | HOLD |
| TRL GRPO + IFStruct recipe | 90 | `post-training-lab` | HOLD |

These are **admissions to evaluation, not endorsements or deployment approvals**.

### Open Yap 1K

Use the Hugging Face sample first. The full 1,000-hour corpus has a separate data-use agreement and remains held until separately reviewed. Evaluation explicitly prohibits identity inference and voice-clone objectives.

### VLM Run Gateway

Treat the gateway as an alpha external evaluation adapter. Use synthetic/public fixtures until terms and privacy are admitted. Any result intended to influence deployment must be compared with a direct/self-hosted control using the exact model revision and serving parameters.

### TRL GRPO structured-output recipe

Reproduce the small published run before introducing SZL reward functions. SZL experiments require checksum-separated train/validation/held-out schemas and track semantic correctness as well as syntax validity so reward hacking cannot masquerade as contract compliance.

## Commands

Run from the repository root:

```bash
export PYTHONPATH=python

# Show all admitted material releases.
python3 -m szl_frontier list --min-score 70

# Produce the deterministic evaluation contract for one release.
python3 -m szl_frontier plan trl-grpo-ifstruct-2026-09-03

# Probe one primary Hugging Face source and attach its bounded snapshot.
python3 -m szl_frontier probe open-yap-1k-2026-09-03

# Create a content-addressed evidence receipt. This does not sign unless a
# caller explicitly supplies a key through the Python API.
python3 -m szl_frontier receipt trl-grpo-ifstruct-2026-09-03

# Live-scan only Python-curated admissions and write CI evidence.
python3 -m szl_frontier watch \
  --origin python-admission \
  --output python-frontier-watch-output.json \
  --require-complete

# Local deduplication. The ledger stores fingerprints only, never source data.
python3 -m szl_frontier watch \
  --state-file .local/frontier-ledger.json \
  --record
```

`watch` emits `szl.frontier.python-watch-output.v1` containing selected source count, successful probes, bounded errors, material candidates, and an explicit `productionPromotion: false` assertion.

## Receipt model

`ReceiptFactory` hashes canonical JSON with SHA-256. A receipt contains:

- release identity;
- subject;
- payload and payload digest;
- UTC observation time;
- optional previous-receipt digest; and
- optional HMAC-SHA256 authentication metadata.

The package **never reads a signing key from the environment or repository**. A trusted execution boundary must provide key bytes explicitly. Unsigned receipts are still content-addressed integrity records; HMAC receipts add authentication where a shared-secret trust model is appropriate.

## Fail-closed rules

A release cannot be production-promoted merely because its source is public or its score is high. Production remains HOLD when any of the following is true:

- score is below the admitted threshold;
- maturity is not an admitted released state;
- license posture is not `clear`;
- a production gate is `pending` or `hold`;
- a live source is private, gated, or disabled; or
- required evidence cannot be reproduced.

A network failure does not create a candidate. Scheduled live scans report incomplete source coverage and fail the workflow after preserving the machine-readable evidence file.

## Source boundary

Remote collection is intentionally narrow:

- scheme must be HTTPS;
- host must be exactly `huggingface.co`;
- redirected final URL is revalidated;
- default timeout is 20 seconds;
- maximum response body is 8 MiB;
- no cookies, credentials, shell calls, or arbitrary callback URLs are accepted.

Model and dataset snapshots store metadata and artifact fingerprints; they do not download model weights or dataset payloads.

## Test surface

The Python suite covers:

- malformed schemas and out-of-range scoring signals;
- non-Hugging-Face source rejection;
- JS/Python policy drift;
- curated admission scores and mandatory HOLDs;
- category-specific benchmark plans;
- bounded model/dataset/blog normalization;
- gated-source fail-closed behavior;
- ISO and HTTP-date cursor comparisons;
- evidence receipt verification and tamper detection;
- hash-chain continuity;
- atomic notification-ledger persistence; and
- machine-readable CLI output.

CI compiles the package, runs the unit suite, and loads the **real generated manifest** through the CLI so cross-runtime parity is checked against repository state, not only fixtures.

## File map

```text
python/szl_frontier/
├── domain.py       # immutable schema and shared types
├── catalog.py      # JS manifest import + curated admissions + parity check
├── policy.py       # deterministic materiality/promotion rules
├── evaluation.py   # benchmark/evaluation contract compiler
├── huggingface.py  # bounded primary-source transport and snapshots
├── receipts.py     # canonical hashing, HMAC receipts, hash chaining
├── state.py        # atomic fingerprint-only dedupe ledger
├── engine.py       # orchestration surface
└── cli.py          # list / plan / probe / receipt / watch
```

## Promotion path

The intended path for every frontier item remains:

**discover → admit → pin → benchmark → compare → review rights → seal receipt → satisfy production gates → separately authorize promotion**

There is no code path in this package that downloads weights, trains a model, deploys a service, changes credentials, or grants production action authority.
