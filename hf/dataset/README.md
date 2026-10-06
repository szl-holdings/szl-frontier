---
license: apache-2.0
pretty_name: SZL Frontier Memory Covenant v0.4
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
configs:
  - config_name: covenant-rules
    data_files:
      - split: train
        path: covenant-rules.jsonl
    default: true
  - config_name: software-gates
    data_files:
      - split: train
        path: gates.jsonl
  - config_name: frontier-choices
    data_files:
      - split: train
        path: frontier-top-choices.v1.jsonl
---

<p><a href="https://huggingface.co/spaces/SZLHOLDINGS/szl-command-lab"><img src="https://raw.githubusercontent.com/szl-holdings/.github/main/profile/assets/szl/logos/szl_mark_holographic.svg" alt="SZL Holdings" width="112" /></a></p>

# Frontier Memory Covenant

Inspect memory-policy artifacts, software gates and review records for frontier evaluation intake.

**Artifact:** Software release and intake metadata · **Stage:** Production HOLD

[Explore in Command Lab](https://huggingface.co/spaces/SZLHOLDINGS/szl-command-lab) · [Build](https://github.com/szl-holdings/szl-frontier) · [Source card](https://github.com/szl-holdings/szl-frontier/blob/main/hf/dataset/README.md)

## Before you use it

- Intel examples are simulated; this is not classified or operational training data.
- Upstream releases and sandbox results confer no production authority, and gated payloads are not mirrored.

<details>
<summary>Technical details and original evidence</summary>

The retained source below is exact and may contain historical observations. Its dates, use restrictions, licenses and evidence boundaries continue to apply.

<!-- SZL-PRESERVED-TECHNICAL-BODY:START -->

# SZL Frontier — Memory Covenant v0.4

Software release artifacts for the SZL Frontier orchestrator: Memory Covenant software rules, software gates, honest posture labels, and governed frontier-evaluation intake records.

This is **not** a training corpus of classified or operational intelligence. Intel observations in the companion app are **simulated** and public-style only. The frontier intake file stores metadata, source revisions/fingerprints, evaluation lanes, and promotion posture; it does **not** mirror upstream model weights or gated dataset payloads.

## Files

| File | What |
|---|---|
| `covenant-rules.jsonl` | Nine deny-by-default Memory Covenant software rules (MC-R1–MC-R9) |
| `formulas.jsonl` | Deprecated path-compatible alias of the same DECLARED MC-R rows; excluded from Viewer configs |
| `gates.jsonl` | Software release gates for the Memory Covenant |
| `posture.json` | Honest claim table |
| `frontier-top-choices.v1.jsonl` | Five primary-source frontier integration records: K2-Horizon, NeoMME, Funes, WebGPU kernels, and Vaani |
| `brain-neomme-1.4.1.json` | `szl.brain.neomme-execution-observation/v1` record ([docs/BRAIN_NEOMME_1_4_1.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/BRAIN_NEOMME_1_4_1.md)) |
| `frontier-edge-agent.v1.json` | `szl.frontier.edge-lane-plan.v1` record ([docs/CODEX_MINICPM5_EDGE_LANE.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/CODEX_MINICPM5_EDGE_LANE.md)) |
| `kimi-hy4-spark-intake.v1.json` | `szl.frontier.integration-wave.v1` intake record |
| `minicpm5-matched-evidence.v1.json` | `szl.frontier.measured-followup.v1` record |
| `neomme-smoke.v1.json` | `szl.forge.neomme-smoke/v1` record ([docs/NEOMME_MEASURED_SMOKE.md](https://github.com/szl-holdings/szl-frontier/blob/main/docs/NEOMME_MEASURED_SMOKE.md)) |

### Rule namespace repair

`covenant-rules.jsonl` replaces the former `formulas.jsonl` as the canonical path. The former F1–F9 labels were ambiguous because Doctrine v11 already owns the F namespace. Consumers should use MC-R1–MC-R9; every row carries `evidence_class: DECLARED`. The deprecated `formulas.jsonl` path remains as a byte-identical transition alias but is not a Dataset Viewer config. This is a naming and evidence-class correction, not a proof, production authorization, or change to the locked formula set.

## Frontier intake contract

Each frontier record preserves the upstream identity and license while naming the SZL-owned primitive and target organs used for evaluation. `production: HOLD` is deliberate: an upstream release, benchmark claim, public license, or successful sandbox run is never sufficient production authority by itself.

K2 and Vaani include exact Hub revision plus normalized artifact-inventory fingerprints. Vaani remains gated; only public metadata is represented here and no dataset content is copied or accessed by this artifact.

## Honesty

- Memory Covenant rules are **DECLARED** software policy rules, not Doctrine v11 formulas or the Lean locked-8.
- Doctrine v11's locked formula IDs remain exactly F1, F4, F7, F11, F12, F18, F19, and F22.
- Λ = Conjecture 1.
- Upstream artifacts keep their upstream authorship, licenses, and provenance.
- Source: [szl-holdings/szl-frontier](https://github.com/szl-holdings/szl-frontier)

<!-- SZL-PRESERVED-TECHNICAL-BODY:END -->

</details>
