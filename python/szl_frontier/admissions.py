"""Curated Hugging Face frontier admissions that are not in the JS manifest.

The JavaScript catalog remains authoritative for releases already admitted there.
This module contains only additional primary-source-verified releases. Every
entry is evaluation authority only: production stays fail-closed until the
shared policy gates and a separately sealed production authorization receipt
are satisfied.
"""

from __future__ import annotations

from typing import Any, Mapping


def _gate(
    gate_id: str,
    title: str,
    scope: str,
    state: str,
    evidence: str,
) -> dict[str, str]:
    return {
        "id": gate_id,
        "title": title,
        "scope": scope,
        "state": state,
        "evidence": evidence,
    }


PYTHON_ADMISSIONS: tuple[Mapping[str, Any], ...] = (
    {
        "id": "open-yap-1k-2026-09-03",
        "title": "Open Yap 1K full-duplex conversational speech corpus",
        "publisher": "The Agentic Data Company",
        "releasedAt": "2026-09-03",
        "category": "speech-training-data",
        "primarySource": "https://huggingface.co/blog/TheAgenticDataCompany/open-yap-1k",
        "artifactSource": "https://huggingface.co/datasets/TheAgenticDataCompany/open-yap-1k",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "szl-second-brain",
            "a11oy",
            "szl-serve",
        ],
        "whyItMatters": (
            "Natural dual-channel speech with overlap, interruption, backchannels, "
            "and 48 kHz audio is a materially better substrate for evaluating or "
            "post-training full-duplex voice systems than scripted turn-taking data."
        ),
        "operationalTarget": (
            "Start with the 8.9-hour Hub sample, benchmark turn-taking and streaming "
            "behavior, and require legal review of the full-corpus data-use agreement "
            "before any 1,000-hour ingestion."
        ),
        "maturity": "released",
        "license": (
            "Hub sample CC-BY-4.0; full 1,000-hour corpus governed by a separate data-use agreement"
        ),
        "licensePosture": "mixed",
        "resourceClass": "large dual-channel audio corpus",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 23,
            "estateFit": 22,
            "evidenceQuality": 24,
            "integrationReadiness": 19,
            "riskPenalty": 7,
        },
        "sourceClaims": [
            "The Hub sample contains 8.9 hours across 16 conversations.",
            "The announced full corpus contains 1,000 hours of dual-channel English conversation recorded at 48 kHz.",
            "The full corpus has a separate data-use agreement and must not be treated as equivalent to the Hub sample license.",
        ],
        "gates": [
            _gate(
                "open-yap-source",
                "Primary article and sample dataset pinned",
                "evaluation",
                "pass",
                "Official Hugging Face article and dataset card recorded.",
            ),
            _gate(
                "open-yap-sample",
                "Sample-only benchmark first",
                "evaluation",
                "pending",
                "Run bounded tests on the Hub sample before requesting or ingesting the full corpus.",
            ),
            _gate(
                "open-yap-rights",
                "Full-corpus rights admitted",
                "production",
                "hold",
                "The full-corpus data-use agreement requires separate review and explicit admission.",
            ),
            _gate(
                "open-yap-privacy",
                "Speaker privacy constraints enforced",
                "production",
                "pending",
                "No identity inference, voice cloning, or prohibited redistribution paths may be enabled.",
            ),
            _gate(
                "open-yap-quality",
                "Full-duplex quality improvement reproduced",
                "production",
                "pending",
                "Require measured gains on overlap handling, barge-in, latency, and turn-taking against the current baseline.",
            ),
        ],
        "watch": {
            "kind": "dataset",
            "repoId": "TheAgenticDataCompany/open-yap-1k",
            "baselineRevision": "3eb0aaa5bcfb8a0f92fc383df1cb1d9a40fc6f2f",
            "baselineFingerprint": "8349606e7a5744f28355005fa2f19c73a7158917feec5be2a22a6888e2ba5991",
        },
    },
    {
        "id": "vlm-run-gateway-2026-09-04",
        "title": "VLM Run Gateway unified OCR/VLM evaluation API",
        "publisher": "VLM Run",
        "releasedAt": "2026-09-04",
        "category": "multimodal-deployment-evaluation",
        "primarySource": "https://huggingface.co/blog/vlm-run/introducing-gateway",
        "artifactSource": "https://huggingface.co/blog/vlm-run/introducing-gateway",
        "targetOrgans": [
            "szl-frontier",
            "a11oy",
            "szl-command-lab",
            "szl-serve",
            "szl-lake",
        ],
        "whyItMatters": (
            "A unified API across OCR, VLM, ViT, document, image, and video workloads "
            "can accelerate reproducible model bake-offs while exposing serving details "
            "such as quantization, FPS, and model/runtime variance that affect visual quality."
        ),
        "operationalTarget": (
            "Use only as an external evaluation adapter in an isolated lane; compare exact "
            "model revisions and outputs against direct/self-hosted baselines before any dependency decision."
        ),
        "maturity": "alpha",
        "license": "Service and underlying model licenses vary; review per evaluated model",
        "licensePosture": "review-required",
        "resourceClass": "external multimodal inference gateway",
        "posture": "SANDBOX_ONLY",
        "signals": {
            "impact": 20,
            "estateFit": 22,
            "evidenceQuality": 19,
            "integrationReadiness": 21,
            "riskPenalty": 10,
        },
        "sourceClaims": [
            "The release exposes a unified API for OCR models, VLMs, and ViT-style vision models.",
            "The article describes document pipelines and video input with FPS control.",
            "The service is explicitly alpha and should not be treated as a production control-plane dependency.",
        ],
        "gates": [
            _gate(
                "vlm-run-source",
                "Primary Hugging Face article pinned",
                "evaluation",
                "pass",
                "Hugging Face community release article recorded.",
            ),
            _gate(
                "vlm-run-isolation",
                "External-service isolation",
                "evaluation",
                "pending",
                "Use non-sensitive benchmark fixtures only; no production documents or credentials.",
            ),
            _gate(
                "vlm-run-parity",
                "Direct-serving parity measured",
                "production",
                "pending",
                "Compare outputs and quality against exact self-hosted model revisions and serving parameters.",
            ),
            _gate(
                "vlm-run-terms",
                "Service and model terms admitted",
                "production",
                "hold",
                "Underlying model licenses and gateway terms must be reviewed per workload.",
            ),
            _gate(
                "vlm-run-slo",
                "Reliability and observability SLO proven",
                "production",
                "pending",
                "Require latency, retry, rate-limit, error-mode, and provenance receipts before dependency promotion.",
            ),
        ],
        "watch": {
            "kind": "blog",
            "repoId": "vlm-run/introducing-gateway",
            "baselineFingerprint": "d1aba0bd5a8ba2a352da10e6cdac807b8f37561f8d5a68ebe3145c222f54553c",
        },
    },
    {
        "id": "trl-grpo-ifstruct-2026-09-03",
        "title": "TRL GRPO structured-output post-training recipe",
        "publisher": "Hugging Face / Liquid AI contributors",
        "releasedAt": "2026-09-03",
        "category": "post-training-structured-output",
        "primarySource": "https://huggingface.co/blog/grpo-with-trl-ifstruct",
        "artifactSource": "https://huggingface.co/blog/grpo-with-trl-ifstruct",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "a11oy-factory",
            "szl-kernels",
            "a11oy",
        ],
        "whyItMatters": (
            "The recipe demonstrates a cheap, reproducible way to train small models for "
            "schema compliance using TRL/GRPO, which directly targets governed JSON, YAML, "
            "tool-call, and receipt contracts used by SZL kernels and agents."
        ),
        "operationalTarget": (
            "Reproduce the published structured-output lift on a tiny baseline, then swap in "
            "SZL schemas and reward functions while preserving held-out evaluation and rollback baselines."
        ),
        "maturity": "released-recipe",
        "license": "Review TRL, base-model, dataset, and generated-checkpoint licenses independently",
        "licensePosture": "review-required",
        "resourceClass": "low-cost GPU post-training",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 22,
            "estateFit": 25,
            "evidenceQuality": 24,
            "integrationReadiness": 23,
            "riskPenalty": 4,
        },
        "sourceClaims": [
            "The published run uses roughly 500 samples and 100 GRPO training steps.",
            "The article reports IFStruct compliance improving from 22.6% to 29.7% on the demonstrated 350M model.",
            "The recipe uses TRL and is small enough to reproduce before applying SZL-specific rewards or schemas.",
        ],
        "gates": [
            _gate(
                "trl-source",
                "Primary recipe pinned",
                "evaluation",
                "pass",
                "Official Hugging Face article recorded.",
            ),
            _gate(
                "trl-reproduce",
                "Published baseline reproduced",
                "evaluation",
                "pending",
                "Re-run the small published experiment with pinned model, data, package, and seed metadata.",
            ),
            _gate(
                "trl-heldout",
                "Held-out SZL schema benchmark",
                "production",
                "pending",
                "Require improvement on unseen schemas rather than reward-hacked training examples.",
            ),
            _gate(
                "trl-regression",
                "General capability regression bounded",
                "production",
                "pending",
                "Track syntax validity, semantic accuracy, latency, refusal behavior, and non-structured task regressions.",
            ),
            _gate(
                "trl-license",
                "Component licenses admitted",
                "production",
                "hold",
                "Base model, training data, TRL version, and produced checkpoint must each be cleared.",
            ),
        ],
        "watch": {
            "kind": "blog",
            "repoId": "grpo-with-trl-ifstruct",
            "baselineFingerprint": "8705b36045879f9c57fac64f1fd7ef032ff9d861b248b5aab183fd09140d7f93",
        },
    },
    {
        "id": "k2-horizon-mova-36b-a4b-2026-09-03",
        "title": "K2-Horizon-MoVA-36B-A4B agentic reasoning model",
        "publisher": "Institute of Foundation Models (IFM)",
        "releasedAt": "2026-09-03",
        "category": "agent-model-runtime",
        "primarySource": "https://huggingface.co/IFM/K2-Horizon-MoVA-36B-A4B",
        "artifactSource": "https://huggingface.co/IFM/K2-Horizon-MoVA-36B-A4B",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "szl-serve",
            "szl-router",
            "a11oy-factory",
            "a11oy",
        ],
        "whyItMatters": (
            "A sparse 36B Mixture-of-Experts model that activates about 4B parameters per token, "
            "ships a native 512K context window, and publishes agentic/reasoning serving paths is "
            "a high-leverage candidate for SZL's governed inference and tool-use plane."
        ),
        "operationalTarget": (
            "Serve the exact pinned checkpoint only in an evaluation namespace through a normalized "
            "OpenAI-compatible adapter, then compare tool-use, structured output, long-context evidence "
            "retention, throughput, memory, and refusal/governance behavior against current SZL baselines."
        ),
        "maturity": "released",
        "license": "Apache-2.0",
        "licensePosture": "clear",
        "resourceClass": "36B MoE / approximately 4B active parameters per token",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 25,
            "estateFit": 25,
            "evidenceQuality": 24,
            "integrationReadiness": 24,
            "riskPenalty": 5,
        },
        "sourceClaims": [
            "The model card describes 36B stored parameters with about 4B active per token and native 524,288-token context.",
            "The Hugging Face repository is Apache-2.0 and exposes Transformers plus OpenAI-compatible serving guidance.",
            "Upstream agentic and reasoning benchmark claims remain hypotheses until reproduced on pinned SZL fixtures and serving parameters.",
        ],
        "gates": [
            _gate(
                "k2-source",
                "Exact model revision and artifact inventory pinned",
                "evaluation",
                "pass",
                "Hub revision 05cab0a4d7150c1c460a000b37ff40cc1af2feaa and normalized 63-artifact inventory fingerprint are sealed.",
            ),
            _gate(
                "k2-serving-preflight",
                "Serving and custom-code preflight",
                "evaluation",
                "pending",
                "Inspect remote model code and reproduce a pinned Transformers/SGLang or vLLM launch before benchmark authority is granted.",
            ),
            _gate(
                "k2-agentic",
                "Agent/tool-use improvement reproduced",
                "production",
                "pending",
                "Require higher bounded task success and tool-call exactness on held-out SZL workflows without action-authority bypass.",
            ),
            _gate(
                "k2-context",
                "Long-context evidence retention proven",
                "production",
                "pending",
                "Measure grounded recall, citation fidelity, distractor resistance, and cross-tenant canary leakage across increasing context lengths.",
            ),
            _gate(
                "k2-runtime",
                "Serving SLO and economics proven",
                "production",
                "pending",
                "Seal hardware, runtime, quantization, TTFT, p50/p95 latency, tokens/sec, memory, concurrency, and rollback evidence.",
            ),
            _gate(
                "k2-governance",
                "A11oy governance boundary verified",
                "production",
                "pending",
                "Model output remains proposal/evidence only; policy, approval, execution, verification, and receipt authority stay outside model weights.",
            ),
        ],
        "watch": {
            "kind": "model",
            "repoId": "IFM/K2-Horizon-MoVA-36B-A4B",
            "baselineRevision": "05cab0a4d7150c1c460a000b37ff40cc1af2feaa",
            "baselineFingerprint": "259e31e5a7143d4f6cca70ed238296e9374b0a51aa497563f62e10af990ec9e2",
        },
    },
    {
        "id": "vaani-noise-event-2026-08-07",
        "title": "Vaani Noise Event Dataset",
        "publisher": "ARTPARK-IISc",
        "releasedAt": "2026-08-07",
        "category": "speech-training-data",
        "primarySource": "https://huggingface.co/datasets/ARTPARK-IISc/Vaani-Noise-Event-Dataset",
        "artifactSource": "https://huggingface.co/datasets/ARTPARK-IISc/Vaani-Noise-Event-Dataset",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "szl-serve",
            "szl-lake",
            "a11oy",
        ],
        "whyItMatters": (
            "Timestamped real-world noise events across an audio-plus-text corpus can strengthen "
            "noise-aware speech ingestion, robust ASR evaluation, and acoustic event filtering for "
            "field and command-room interfaces."
        ),
        "operationalTarget": (
            "Keep this metadata-only while the Hub repository is gated. After an authorized operator "
            "accepts the dataset access conditions, start with a bounded checksum-pinned sample and "
            "measure noise-event detection plus downstream ASR robustness before any larger ingestion."
        ),
        "maturity": "released",
        "license": "CC-BY-4.0; repository access is gated and requires accepting Hub access conditions",
        "licensePosture": "review-required",
        "resourceClass": "gated audio/text parquet dataset",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 20,
            "estateFit": 20,
            "evidenceQuality": 23,
            "integrationReadiness": 16,
            "riskPenalty": 7,
        },
        "sourceClaims": [
            "The Hub card identifies audio classification with audio and text modalities and CC-BY-4.0 licensing.",
            "The current repository exposes 184 tracked artifacts in metadata and is gated for content access.",
            "No dataset payload is admitted, copied, or trained on until the access conditions are explicitly accepted by an authorized operator.",
        ],
        "gates": [
            _gate(
                "vaani-source",
                "Exact dataset revision and artifact inventory pinned",
                "evaluation",
                "pass",
                "Hub revision be488e2ac12fd62bef46b9f83e3a5feded575333 and normalized 184-artifact inventory fingerprint are sealed.",
            ),
            _gate(
                "vaani-access",
                "Dataset access conditions accepted",
                "evaluation",
                "hold",
                "The public metadata is readable but file/content access is gated; do not bypass or automate acceptance.",
            ),
            _gate(
                "vaani-bounded-sample",
                "Bounded sample benchmark reproduced",
                "production",
                "pending",
                "After authorized access, pin a small sample and measure event-detection quality and downstream noise-robust ASR delta.",
            ),
            _gate(
                "vaani-rights",
                "License, attribution, and access terms admitted",
                "production",
                "hold",
                "CC-BY-4.0 attribution and the repository's access conditions must both be satisfied for the intended use.",
            ),
            _gate(
                "vaani-privacy",
                "Audio privacy and retention controls verified",
                "production",
                "pending",
                "No identity inference or unnecessary retention; derived artifacts must preserve source attribution and deletion semantics.",
            ),
        ],
        "watch": {
            "kind": "dataset",
            "repoId": "ARTPARK-IISc/Vaani-Noise-Event-Dataset",
            "baselineRevision": "be488e2ac12fd62bef46b9f83e3a5feded575333",
            "baselineFingerprint": "eaaee5703e5288affd9447ffb29feca84df66f0b70eef152a1f8913e8db7d4da",
        },
    },
)
