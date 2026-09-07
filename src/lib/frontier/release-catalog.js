// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
/** Canonical fail-closed intake for material Hugging Face frontier releases. */

/** @typedef {{id:string,title:string,scope:"evaluation"|"production",state:"pass"|"pending"|"hold",evidence:string}} ReleaseGate */
/** @typedef {{impact:number,estateFit:number,evidenceQuality:number,integrationReadiness:number,riskPenalty:number}} ReleaseSignals */
/** @typedef {{role:string,repoId:string,revision:string,license:string}} ArtifactPin */
/** @typedef {{id:string,title:string,publisher:string,releasedAt:string,category:string,primarySource:string,artifactSource:string,artifactRevision?:string,artifactPins?:ArtifactPin[],targetOrgans:string[],whyItMatters:string,operationalTarget:string,maturity:string,license:string,licensePosture:string,resourceClass:string,posture:string,signals:ReleaseSignals,sourceClaims:string[],gates:ReleaseGate[],watch:{kind:string,repoId?:string,author?:string,baselineCount?:number,baselineFingerprint?:string},productionReceipt?:{sealed?:boolean,subject?:string,digest?:string}}} FrontierRelease */

export const FRONTIER_CATALOG_EVALUATED_AT = "2026-09-07T23:26:13Z";
export const FRONTIER_MATERIALITY_THRESHOLD = 70;

/**
 * @param {string} id
 * @param {string} title
 * @param {"evaluation"|"production"} scope
 * @param {"pass"|"pending"|"hold"} state
 * @param {string} evidence
 * @returns {ReleaseGate}
 */
const gate = (id, title, scope, state, evidence) => ({ id, title, scope, state, evidence });

/** @type {readonly FrontierRelease[]} */
export const FRONTIER_RELEASES = Object.freeze([
  {
    id: "hf-webgpu-kernels-2026-09-01",
    title: "@huggingface/kernels + WebGPU kernel collection",
    publisher: "Hugging Face WebAI",
    releasedAt: "2026-09-01",
    category: "kernels-runtime",
    primarySource: "https://huggingface.co/blog/webgpu-kernels",
    artifactSource: "https://huggingface.co/webgpu-kernels",
    targetOrgans: ["szl-kernels", "szl-serve", "a11oy", "szl-frontier"],
    whyItMatters: "Versioned browser GPU operators with correctness cases, benchmark cases, provenance, and WGSL templates create a credible local inference lane.",
    operationalTarget: "Benchmark selected operators against SZL reference paths on real browser/device classes before routing any workload.",
    maturity: "released",
    license: "Apache-2.0 collection; verify selected artifact metadata",
    licensePosture: "clear",
    resourceClass: "browser GPU",
    posture: "EVALUATE_NOW",
    signals: { impact: 25, estateFit: 25, evidenceQuality: 24, integrationReadiness: 23, riskPenalty: 4 },
    sourceClaims: [
      "Hugging Face announced 207 versioned WebGPU kernels.",
      "Packages carry interfaces, correctness cases, benchmark cases, provenance, and WGSL templates.",
      "Published operator speedups remain upstream evidence until reproduced on SZL hardware."
    ],
    gates: [
      gate("webgpu-source", "Primary sources pinned", "evaluation", "pass", "Official Hugging Face release and kernel namespace recorded."),
      gate("webgpu-preflight", "Browser/device preflight", "evaluation", "pending", "Run adapter, dtype, shape, and fallback checks across the supported matrix."),
      gate("webgpu-correctness", "Reference-output parity", "production", "pending", "Require deterministic parity across supported browsers, devices, dtypes, and edge cases."),
      gate("webgpu-performance", "Measured end-to-end gain", "production", "pending", "Require repeated p50/p95 improvement without memory or thermal regression."),
      gate("webgpu-rollback", "Fallback path verified", "production", "pending", "Fallback runtime and device-loss recovery must be exercised before promotion.")
    ],
    watch: { kind: "model-inventory", author: "webgpu-kernels", baselineCount: 207 }
  },
  {
    id: "neomme-2026-09-03",
    title: "NeoMME multimodal-native multilingual encoders",
    publisher: "Hcompany",
    releasedAt: "2026-09-03",
    category: "multimodal-retrieval",
    primarySource: "https://huggingface.co/blog/Hcompany/neomme",
    artifactSource: "https://huggingface.co/Hcompany/NeoMME-260M-Retriever",
    targetOrgans: ["szl-second-brain", "szl-lake", "a11oy", "lyte-services", "prism"],
    whyItMatters: "A single bidirectional multimodal encoder can emit dense and late-interaction representations for page-image retrieval, reducing separate vision/text towers and improving visual RAG economics.",
    operationalTarget: "Shadow-evaluate 260M Retriever on SZL document/page-image corpora against the current text-only and multimodal baselines.",
    maturity: "released",
    license: "Apache-2.0",
    licensePosture: "clear",
    resourceClass: "GPU retrieval encoder",
    posture: "EVALUATE_NOW",
    signals: { impact: 25, estateFit: 25, evidenceQuality: 23, integrationReadiness: 22, riskPenalty: 4 },
    sourceClaims: [
      "NeoMME ships 260M and 800M multilingual multimodal encoders.",
      "Retriever variants emit dense and late-interaction embeddings in one forward pass.",
      "Upstream throughput and compression claims require SZL reproduction on pinned corpora and hardware."
    ],
    gates: [
      gate("neomme-source", "Model and article pinned", "evaluation", "pass", "Official model and release article recorded."),
      gate("neomme-corpus", "Pinned document benchmark", "evaluation", "pending", "Build a checksum-pinned multilingual page-image query set with qrels."),
      gate("neomme-quality", "Retrieval quality improvement", "production", "pending", "Require nDCG/Recall gain against current SZL retrieval baselines."),
      gate("neomme-latency", "Latency and index economics", "production", "pending", "Measure encode throughput, index bytes, p50/p95 search latency, and cost."),
      gate("neomme-fallback", "Text-only fallback verified", "production", "pending", "Failure and unsupported-input paths must degrade safely to the current retriever.")
    ],
    watch: { kind: "model", repoId: "Hcompany/NeoMME-260M-Retriever" }
  },
  {
    id: "funes-agent-memory-2026-09-03",
    title: "Funes user-owned coding-agent memory",
    publisher: "Hugging Face community",
    releasedAt: "2026-09-03",
    category: "agent-memory",
    primarySource: "https://huggingface.co/blog/funes",
    artifactSource: "https://huggingface.co/blog/funes",
    targetOrgans: ["szl-frontier", "szl-second-brain", "a11oy"],
    whyItMatters: "Treating agent memory as a portable dataset aligns with Yachay/Second Brain goals: owned traces, queryable history, agent portability, and no mandatory hosted memory service.",
    operationalTarget: "Adopt the dataset-as-memory interchange pattern, not an unreviewed service dependency; export/import bounded sanitized traces behind the Memory Covenant.",
    maturity: "released",
    license: "Review implementation components before reuse",
    licensePosture: "review-required",
    resourceClass: "dataset-backed agent memory",
    posture: "ARCHITECTURE_WATCH",
    signals: { impact: 21, estateFit: 25, evidenceQuality: 18, integrationReadiness: 22, riskPenalty: 7 },
    sourceClaims: [
      "The design stores coding-agent memory as a dataset rather than a hosted service.",
      "The pattern targets continuity across machines and coding agents.",
      "SZL should absorb the interchange idea while preserving Memory Covenant identity, purpose, lifecycle, provenance, and receipts."
    ],
    gates: [
      gate("funes-source", "Primary article pinned", "evaluation", "pass", "Hugging Face article recorded."),
      gate("funes-schema", "Portable trace schema", "evaluation", "pending", "Define a bounded SZL trace interchange schema with source handles and tombstones."),
      gate("funes-redaction", "Secret and PII redaction", "production", "pending", "No raw secrets, credentials, or private memory may enter a public dataset."),
      gate("funes-isolation", "Tenant/domain isolation", "production", "pending", "Cross-tenant recall and mixed security domains remain fail-closed."),
      gate("funes-delete", "Deletion/tombstone semantics", "production", "pending", "Derived indexes must stop returning deleted memory immediately.")
    ],
    watch: {
      kind: "blog",
      repoId: "funes",
      baselineFingerprint: "d58ba8294c5fa0cca506bfe5804f95007050a0326b1faa008aa8f881c0ba3a2e"
    }
  },
  {
    id: "vibevoice-streaming-asr-2026-09-03",
    title: "Microsoft VibeVoice-ASR-Streaming 1.5B / 7B",
    publisher: "Microsoft",
    releasedAt: "2026-09-03",
    category: "speech-asr",
    primarySource: "https://huggingface.co/microsoft/VibeVoice-ASR-Streaming-1.5B",
    artifactSource: "https://huggingface.co/microsoft/VibeVoice-ASR-Streaming-1.5B",
    targetOrgans: ["a11oy", "lyte-services", "szl-command-lab", "szl-serve"],
    whyItMatters: "Streaming speaker-attributed ASR with hotwords creates a practical voice/operator ingestion path for command rooms, meetings, and real-time agent interfaces.",
    operationalTarget: "Start with the 1.5B model in a no-action transcription sandbox; seal audio hash, diarization output, timestamps, confidence, model revision, and latency.",
    maturity: "released",
    license: "MIT",
    licensePosture: "clear",
    resourceClass: "streaming GPU ASR",
    posture: "EVALUATE_NOW",
    signals: { impact: 23, estateFit: 22, evidenceQuality: 22, integrationReadiness: 22, riskPenalty: 5 },
    sourceClaims: [
      "The streaming release transcribes speaker identity and content jointly.",
      "It supports custom hotwords and ten languages.",
      "Transcription must remain evidence input, never action authority."
    ],
    gates: [
      gate("vibevoice-source", "Model card pinned", "evaluation", "pass", "Microsoft Hugging Face model source recorded."),
      gate("vibevoice-wer", "Pinned ASR benchmark", "evaluation", "pending", "Measure WER/CER, diarization error, hotword recall, and latency on SZL-shaped audio."),
      gate("vibevoice-stream", "Streaming stability", "production", "pending", "Test long sessions, speaker churn, dropouts, silence, and backpressure."),
      gate("vibevoice-privacy", "Audio retention policy", "production", "pending", "Audio and transcripts require explicit sensitivity, retention, and deletion controls."),
      gate("vibevoice-authority", "No speech-to-action bypass", "production", "pending", "Voice output remains proposal/evidence input behind A11oy policy and approval.")
    ],
    watch: { kind: "model", repoId: "microsoft/VibeVoice-ASR-Streaming-1.5B" }
  },
  {
    id: "qdrant-fineweb-10b-2026-09-01",
    title: "Qdrant FineWeb-10B + Supernova retrieval benchmark",
    publisher: "Qdrant",
    releasedAt: "2026-09-01",
    category: "retrieval-benchmark",
    primarySource: "https://huggingface.co/blog/Qdrant/fineweb-10b-release",
    artifactSource: "https://huggingface.co/datasets/Qdrant/FineWeb-10B",
    targetOrgans: ["szl-frontier", "szl-second-brain", "szl-lake", "lyte-services"],
    whyItMatters: "Internet-scale dense/sparse/hybrid retrieval with exact ground truth is a serious benchmark substrate beyond toy RAG tests.",
    operationalTarget: "Run bounded checksum-pinned shards first; capture recall, p50/p95/p99, ingestion cost, memory, and failure behavior before scale-up.",
    maturity: "released",
    license: "ODC-BY-1.0 corpus; query assets require separate review",
    licensePosture: "mixed",
    resourceClass: "multi-terabyte distributed benchmark",
    posture: "BENCHMARK_FIRST",
    signals: { impact: 25, estateFit: 24, evidenceQuality: 24, integrationReadiness: 17, riskPenalty: 8 },
    sourceClaims: [
      "FineWeb-10B provides roughly 10.07B dense and sparse vector records.",
      "Exact top-1000 ground truth supports reproducible recall/latency evaluation.",
      "Full-corpus execution is intentionally not an initial CI workload."
    ],
    gates: [
      gate("fineweb-source", "Dataset and article pinned", "evaluation", "pass", "Qdrant/Hugging Face sources recorded."),
      gate("fineweb-shard", "Bounded reproducible shard", "evaluation", "pending", "Create checksum-pinned data/query/qrels shards."),
      gate("fineweb-slo", "Hybrid retrieval SLO", "production", "pending", "Measure recall@10/@100, tail latency, throughput, filters, and degraded-node behavior."),
      gate("fineweb-cost", "Scale economics", "production", "pending", "Storage, network, build-time, and serving cost receipt required."),
      gate("fineweb-rights", "Query rights cleared", "production", "hold", "Do not assume every benchmark query asset is production-cleared.")
    ],
    watch: { kind: "dataset", repoId: "Qdrant/FineWeb-10B" }
  },
  {
    id: "puffin-world-2026-09-02",
    title: "Puffin-World native 3D multimodal world model",
    publisher: "ACE Robotics / NTU S-Lab",
    releasedAt: "2026-09-02",
    category: "multimodal-world-model",
    primarySource: "https://huggingface.co/blog/KangLiao/puffin-world",
    artifactSource: "https://huggingface.co/ACERobotics/Puffin-World",
    targetOrgans: ["killinchu", "aegis", "szl-khipu", "szl-command-lab"],
    whyItMatters: "Camera-aware understanding, RGB-D generation, multi-view synthesis, and 3D reconstruction can extend SZL spatial/digital-twin research.",
    operationalTarget: "Keep isolated; reproduce one static-scene camera/depth task with sealed checkpoint, environment, inputs, outputs, and license evidence.",
    maturity: "research",
    license: "Custom/research license; review required",
    licensePosture: "review-required",
    resourceClass: "large CUDA research stack",
    posture: "SANDBOX_ONLY",
    signals: { impact: 25, estateFit: 22, evidenceQuality: 21, integrationReadiness: 14, riskPenalty: 10 },
    sourceClaims: [
      "Puffin-World unifies native 3D world states and multimodal generation/understanding.",
      "The published stack requires substantial GPU research resources.",
      "No production authority is inferred from research-model outputs."
    ],
    gates: [
      gate("puffin-source", "Canonical sources pinned", "evaluation", "pass", "ACE Robotics model and Hugging Face article recorded."),
      gate("puffin-isolation", "Research-plane isolation", "evaluation", "pass", "No production connector or action authority."),
      gate("puffin-repro", "Published task reproduced", "evaluation", "pending", "Seal code, checkpoint, CUDA image, inputs, outputs, and measured result."),
      gate("puffin-license", "License cleared", "production", "hold", "No commercial/production assumption from custom license."),
      gate("puffin-safety", "Physical limitations bounded", "production", "hold", "Dynamic scenes and long-horizon physics remain outside proven envelope.")
    ],
    watch: { kind: "model", repoId: "ACERobotics/Puffin-World" }
  },
  {
    id: "granite-confluent-2026-09-02",
    title: "IBM Granite time-series models in Confluent Cloud",
    publisher: "IBM Research / Confluent",
    releasedAt: "2026-09-02",
    category: "streaming-time-series",
    primarySource: "https://huggingface.co/blog/ibm-research/real-time-intelligence",
    artifactSource: "https://huggingface.co/ibm-granite/granite-timeseries-ttm-r2",
    targetOrgans: ["lyte-services", "lyte-lattice", "szl-telemetry", "a11oy"],
    whyItMatters: "Forecasting/anomaly inference inside the event stream maps directly to Lyte's ingest-to-outcome architecture.",
    operationalTarget: "Benchmark TTM locally against naive baselines, then replay prediction events through the A11oy evidence/approval path before managed streaming adoption.",
    maturity: "early-access-integration",
    license: "Apache-2.0 model; managed service terms separate",
    licensePosture: "clear",
    resourceClass: "local model plus managed streaming integration",
    posture: "EVALUATE_NOW",
    signals: { impact: 24, estateFit: 25, evidenceQuality: 22, integrationReadiness: 20, riskPenalty: 5 },
    sourceClaims: [
      "Granite TTM is a compact Apache-2.0 time-series model family.",
      "The architecture places inference into stream processing and writes predictions back to event topics.",
      "Managed early-access deployment is not treated as generally available production infrastructure."
    ],
    gates: [
      gate("granite-source", "Sources pinned", "evaluation", "pass", "IBM/Hugging Face sources recorded."),
      gate("granite-baseline", "Local baseline cleared", "evaluation", "pending", "Measure MASE/MAE, latency, memory, missing data, and drift."),
      gate("granite-replay", "Prediction replay linked", "production", "pending", "Input offset, model revision, output topic, decision, and outcome must be receipt-linked."),
      gate("granite-drift", "Drift and abstention", "production", "pending", "Define backtest windows, thresholds, abstention, rollback, and escalation."),
      gate("granite-managed", "Managed integration verified", "production", "pending", "Entitlement, regions, limits, SLA, and failure modes must be witnessed.")
    ],
    watch: { kind: "model", repoId: "ibm-granite/granite-timeseries-ttm-r2" }
  },
  {
    id: "glm-5-3-family-2026-09-07",
    title: "GLM-5.3 Flash multimodal agent route with GLM-5.3 reference",
    publisher: "zai-org",
    releasedAt: "2026-09-07",
    category: "multimodal-agent-model",
    primarySource: "https://huggingface.co/zai-org/GLM-5.3-Flash/tree/eb9eb208eb0d988989d07a6a12d0fdeb5f52574a",
    artifactSource: "https://huggingface.co/zai-org/GLM-5.3-Flash",
    artifactRevision: "eb9eb208eb0d988989d07a6a12d0fdeb5f52574a",
    artifactPins: [
      { role: "primary", repoId: "zai-org/GLM-5.3-Flash", revision: "eb9eb208eb0d988989d07a6a12d0fdeb5f52574a", license: "mit" },
      { role: "reference", repoId: "zai-org/GLM-5.3", revision: "aca966e4e02791568aa6a4ced368624b3d897f42", license: "other" }
    ],
    targetOrgans: ["szl-frontier", "szl-nemo", "szl-forge", "szl-serve", "a11oy"],
    whyItMatters: "A source-pinned multimodal Flash route and larger reasoning/coding reference create a serious provider and self-hosted evaluation lane without treating upstream benchmark claims as SZL measurements.",
    operationalTarget: "Evaluate coding, tool use, long context, multimodal reasoning, refusal behavior, latency, memory, cost, and tested fallback behind existing A11oy policy and routing abstractions.",
    maturity: "released",
    license: "MIT primary Flash artifact; GLM-5.3 reference metadata reports other",
    licensePosture: "mixed",
    resourceClass: "large multimodal MoE provider or GPU-serving route",
    posture: "EVALUATE_NOW",
    signals: { impact: 25, estateFit: 25, evidenceQuality: 24, integrationReadiness: 21, riskPenalty: 7 },
    sourceClaims: [
      "Hugging Face metadata observed GLM-5.3-Flash at exact revision eb9eb208eb0d988989d07a6a12d0fdeb5f52574a with MIT license metadata and image-text-to-text task metadata.",
      "The larger GLM-5.3 reference is pinned separately at aca966e4e02791568aa6a4ced368624b3d897f42 and reports license metadata other.",
      "No serving compatibility, quality, latency, memory, or cost result is claimed until reproduced by SZL evaluation receipts."
    ],
    gates: [
      gate("glm53-source", "Exact upstream revisions pinned", "evaluation", "pass", "frontier/evidence/2026-09-07-upstream-model-pins.json records both exact revisions and collector identity."),
      gate("glm53-license", "Mixed license posture reviewed", "evaluation", "pending", "MIT applies to the primary Flash metadata; the larger reference remains review-required."),
      gate("glm53-evals", "Reproducible capability evaluation", "evaluation", "pending", "Seal prompts, fixtures, outputs, runtime identity, metrics, and incumbent comparisons."),
      gate("glm53-serving", "Serving profile exercised", "production", "pending", "Provider and self-hosted compatibility may be claimed only for exact exercised revisions and runtimes."),
      gate("glm53-fallback", "Incumbent fallback verified", "production", "pending", "Timeout, provider failure, unsupported input, and model error must fail safely to a tested incumbent route."),
      gate("glm53-authority", "No model-to-action bypass", "production", "hold", "Every consequential transition remains behind provenance, policy, approval, execution, verification, and receipt controls.")
    ],
    watch: { kind: "model", repoId: "zai-org/GLM-5.3-Flash" }
  },
  {
    id: "deepseek-v4-flash-vision-exp-2026-09-01",
    title: "DeepSeek V4 Flash Vision experimental multimodal route",
    publisher: "deepseek-ai",
    releasedAt: "2026-09-01",
    category: "multimodal-agent-model",
    primarySource: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp/tree/6821d6ad3681a4b137b066b76094fa82ebd0a380",
    artifactSource: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
    artifactRevision: "6821d6ad3681a4b137b066b76094fa82ebd0a380",
    artifactPins: [
      { role: "primary", repoId: "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp", revision: "6821d6ad3681a4b137b066b76094fa82ebd0a380", license: "mit" }
    ],
    targetOrgans: ["szl-frontier", "szl-nemo", "szl-forge", "szl-serve", "szl-command-lab", "szl-second-brain", "a11oy"],
    whyItMatters: "A source-pinned image-text reasoning candidate can improve document, interface, and visual-evidence workflows while remaining proposal-only and evidence-bound.",
    operationalTarget: "Run checksum-pinned image, document, and interface fixtures; compare reasoning, tool correctness, refusal, latency, memory, and fallback against incumbent multimodal routes.",
    maturity: "released",
    license: "MIT",
    licensePosture: "clear",
    resourceClass: "large experimental multimodal provider or GPU-serving route",
    posture: "EVALUATE_NOW",
    signals: { impact: 25, estateFit: 25, evidenceQuality: 23, integrationReadiness: 20, riskPenalty: 6 },
    sourceClaims: [
      "Hugging Face metadata observed exact revision 6821d6ad3681a4b137b066b76094fa82ebd0a380 with MIT license metadata and image-text-to-text task metadata.",
      "The upstream identifier contains Exp and remains an evaluation candidate rather than an admitted production default.",
      "No upstream benchmark is relabeled as an SZL measurement."
    ],
    gates: [
      gate("deepseek-v4-source", "Exact upstream revision pinned", "evaluation", "pass", "frontier/evidence/2026-09-07-upstream-model-pins.json records the exact model revision and collector identity."),
      gate("deepseek-v4-fixtures", "Visual fixtures sealed", "evaluation", "pending", "Checksum image, document, and interface inputs with expected evidence and refusal behavior."),
      gate("deepseek-v4-quality", "Measured multimodal and tool quality", "evaluation", "pending", "Compare tool correctness, hallucination, refusal, and task quality against incumbents."),
      gate("deepseek-v4-serving", "Serving route exercised", "production", "pending", "Record exact runtime image, model revision, configuration, latency, memory, and failure behavior."),
      gate("deepseek-v4-fallback", "Text and multimodal fallback verified", "production", "pending", "Unsupported inputs and runtime failures must route safely to tested incumbents."),
      gate("deepseek-v4-authority", "Visual output remains proposal-only", "production", "hold", "No visual inference may bypass A11oy provenance, policy, approval, or receipt generation.")
    ],
    watch: { kind: "model", repoId: "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp" }
  },
  {
    id: "nvidia-qwen3-8-flash-next-nvfp4-2026-09-05",
    title: "NVIDIA Qwen3.8 Flash Next NVFP4 deployment candidate",
    publisher: "NVIDIA",
    releasedAt: "2026-09-05",
    category: "quantized-multimodal-inference",
    primarySource: "https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/tree/fc694b54fb0174e0913e6adf86691ef85a4ead47",
    artifactSource: "https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4",
    artifactRevision: "fc694b54fb0174e0913e6adf86691ef85a4ead47",
    artifactPins: [
      { role: "primary-quantized", repoId: "nvidia/Qwen3.8-Flash-Next-NVFP4", revision: "fc694b54fb0174e0913e6adf86691ef85a4ead47", license: "other" },
      { role: "base-model", repoId: "Qwen/Qwen3.8-Flash-Next", revision: "de4b8e4d43b917e7706784d8bb445c9af86a3540", license: "other" }
    ],
    targetOrgans: ["szl-frontier", "szl-gpu-bridge", "szl-serve", "szl-khipu", "szl-nemo", "szl-forge", "a11oy"],
    whyItMatters: "A source-pinned NVFP4 candidate can test quality retention and own-metal economics on qualified NVIDIA hardware without implying that upstream Qwen weights are SZL-trained KHIPU assets.",
    operationalTarget: "Run a fail-closed hardware preflight and benchmark cold start, TTFT, decode throughput, p50/p95 latency, VRAM, cost, quality delta, and tested fallback against FP8 and incumbent routes.",
    maturity: "released",
    license: "NVIDIA quantized artifact and Qwen base-model metadata both report other; legal and redistribution review required",
    licensePosture: "review-required",
    resourceClass: "NVIDIA ModelOpt NVFP4 multimodal inference",
    posture: "BENCHMARK_FIRST",
    signals: { impact: 23, estateFit: 23, evidenceQuality: 21, integrationReadiness: 18, riskPenalty: 9 },
    sourceClaims: [
      "The NVIDIA quantized artifact is pinned at fc694b54fb0174e0913e6adf86691ef85a4ead47 and declares Qwen/Qwen3.8-Flash-Next as its base model.",
      "The base model is pinned separately at de4b8e4d43b917e7706784d8bb445c9af86a3540.",
      "Neither license clearance nor performance benefit is inferred from public metadata."
    ],
    gates: [
      gate("qwen38-nvfp4-source", "Quantized and base revisions pinned", "evaluation", "pass", "frontier/evidence/2026-09-07-upstream-model-pins.json records both exact revisions and their relationship."),
      gate("qwen38-nvfp4-license", "NVIDIA and base terms reviewed", "evaluation", "hold", "Do not redistribute or promote while both observed licenses remain other and intended-use clearance is absent."),
      gate("qwen38-nvfp4-hardware", "Fail-closed device preflight", "evaluation", "pending", "Pin hardware capability, driver, CUDA, ModelOpt, serving runtime, and container digest."),
      gate("qwen38-nvfp4-quality", "Quality retention measured", "evaluation", "pending", "Compare exact fixtures and metrics against the pinned base and incumbent FP8 route."),
      gate("qwen38-nvfp4-runtime", "Operational benefit measured", "production", "pending", "Require positive, repeated latency, throughput, memory, and cost evidence on supported hardware."),
      gate("qwen38-nvfp4-fallback", "FP8 or incumbent fallback verified", "production", "pending", "Unsupported devices, load failure, and runtime errors must fail safely without silent degradation.")
    ],
    watch: { kind: "model", repoId: "nvidia/Qwen3.8-Flash-Next-NVFP4" }
  }
]);

/** @param {FrontierRelease} release */
export function materialityScore(release) {
  const { impact, estateFit, evidenceQuality, integrationReadiness, riskPenalty } = release.signals;
  return Math.max(0, Math.min(100, impact + estateFit + evidenceQuality + integrationReadiness - riskPenalty));
}

/** @param {FrontierRelease} release */
export function isMaterialRelease(release) {
  return materialityScore(release) >= FRONTIER_MATERIALITY_THRESHOLD;
}

/** @param {FrontierRelease} release */
export function evaluationDecision(release) {
  if (!isMaterialRelease(release)) return "IGNORE";
  if (release.posture === "EVALUATE_NOW") return "EVALUATE";
  if (release.posture === "BENCHMARK_FIRST") return "BENCHMARK";
  if (release.posture === "SANDBOX_ONLY") return "SANDBOX";
  if (release.posture === "ARCHITECTURE_WATCH") return "WATCH";
  return "IGNORE";
}

/** @param {FrontierRelease} release */
export function productionDisposition(release) {
  const productionGates = release.gates.filter((item) => item.scope === "production");
  const allPass = productionGates.length > 0 && productionGates.every((item) => item.state === "pass");
  const licenseAdmitted = release.licensePosture === "clear";
  const maturityAdmitted = release.maturity === "released";
  const receiptSealed =
    release.productionReceipt?.sealed === true &&
    release.productionReceipt?.subject === "hugging-face-frontier-production-authorization" &&
    /^[a-f0-9]{64}$/.test(release.productionReceipt?.digest ?? "");
  return allPass && licenseAdmitted && maturityAdmitted && receiptSealed ? "PROMOTE" : "HOLD";
}

export function buildFrontierReleaseManifest() {
  const releases = FRONTIER_RELEASES.map((release) => ({
    ...release,
    materialityScore: materialityScore(release),
    material: isMaterialRelease(release),
    evaluationDecision: evaluationDecision(release),
    productionDisposition: productionDisposition(release)
  }));
  return {
    schema: "szl.frontier.hugging-face-release-intake.v1",
    evaluatedAt: FRONTIER_CATALOG_EVALUATED_AT,
    policy: {
      defaultEffect: "hold",
      materialityThreshold: FRONTIER_MATERIALITY_THRESHOLD,
      notificationRule: "notify only for a deduplicated candidate at or above the materiality threshold",
      promotionRule: "all production gates pass, license is admitted, maturity is released, and a receipt is sealed"
    },
    releaseCount: releases.length,
    materialReleaseCount: releases.filter((release) => release.material).length,
    productionPromotionCount: releases.filter((release) => release.productionDisposition === "PROMOTE").length,
    releases
  };
}
