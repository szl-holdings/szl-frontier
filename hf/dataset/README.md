---
license: apache-2.0
pretty_name: SZL Frontier Memory Covenant v0.3
task_categories:
  - text-classification
tags:
  - governance
  - receipts
  - doctrine-v11
  - a11oy
  - memory-covenant
  - frontier-evaluation
szl:
  source_repo: szl-holdings/szl-frontier
  proof_url: https://github.com/szl-holdings/szl-frontier
---

# SZL Frontier — Memory Covenant v0.3

Software release artifacts for the SZL Frontier orchestrator: policy formulas, software gates, honest posture labels, and governed frontier-evaluation intake records.

This is **not** a training corpus of classified or operational intelligence. Intel observations in the companion app are **simulated** and public-style only. The frontier intake file stores metadata, source revisions/fingerprints, evaluation lanes, and promotion posture; it does **not** mirror upstream model weights or gated dataset payloads.

## Files

| File | What |
|---|---|
| `formulas.jsonl` | Nine deny-by-default formulas (F1–F9) |
| `gates.jsonl` | Software release gates for the Memory Covenant |
| `posture.json` | Honest claim table |
| `frontier-top-choices.v1.jsonl` | Five primary-source frontier integration records: K2-Horizon, NeoMME, Funes, WebGPU kernels, and Vaani |
| `brain-neomme-1.4.1.json` | `szl.brain.neomme-execution-observation/v1` record ([docs/BRAIN_NEOMME_1_4_1.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/BRAIN_NEOMME_1_4_1.md)) |
| `frontier-edge-agent.v1.json` | `szl.frontier.edge-lane-plan.v1` record ([docs/CODEX_MINICPM5_EDGE_LANE.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/CODEX_MINICPM5_EDGE_LANE.md)) |
| `kimi-hy4-spark-intake.v1.json` | `szl.frontier.integration-wave.v1` intake record |
| `minicpm5-matched-evidence.v1.json` | `szl.frontier.measured-followup.v1` record |
| `neomme-smoke.v1.json` | `szl.forge.neomme-smoke/v1` record ([docs/NEOMME_MEASURED_SMOKE.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/NEOMME_MEASURED_SMOKE.md)) |

## Frontier intake contract

Each frontier record preserves the upstream identity and license while naming the SZL-owned primitive and target organs used for evaluation. `production: HOLD` is deliberate: an upstream release, benchmark claim, public license, or successful sandbox run is never sufficient production authority by itself.

K2 and Vaani include exact Hub revision plus normalized artifact-inventory fingerprints. Vaani remains gated; only public metadata is represented here and no dataset content is copied or accessed by this artifact.

## Honesty

- Gates are software tests, not Lean locked-8.
- Λ = Conjecture 1.
- Upstream artifacts keep their upstream authorship, licenses, and provenance.
- Source: [szl-holdings/szl-frontier](https://github.com/szl-holdings/szl-frontier)
