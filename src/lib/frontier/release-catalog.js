// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
/**
 * Canonical, deterministic intake record for material Hugging Face releases.
 *
 * This catalog is evidence, not promotion. Every candidate starts fail-closed and
 * remains outside production until every production gate is explicitly passed.
 */

/** @typedef {"kernels-runtime" | "retrieval-benchmark" | "multimodal-world-model" | "streaming-time-series"} FrontierReleaseCategory */
/** @typedef {"EVALUATE_NOW" | "BENCHMARK_FIRST" | "SANDBOX_ONLY" | "ARCHITECTURE_WATCH"} EvaluationPosture */
/** @typedef {"preview" | "released" | "research" | "early-access-integration"} ReleaseMaturity */
/** @typedef {"clear" | "mixed" | "per-artifact-review" | "review-required"} LicensePosture */
/** @typedef {"pass" | "pending" | "hold"} GateState */
/** @typedef {"evaluation" | "production"} GateScope */
/** @typedef {"model" | "dataset" | "model-inventory" | "blog"} WatchKind */

/**
 * @typedef {object} ReleaseSignals
 * @property {number} impact
 * @property {number} estateFit
 * @property {number} evidenceQuality
 * @property {number} integrationReadiness
 * @property {number} riskPenalty
 */

/**
 * @typedef {object} ReleaseGate
 * @property {string} id
 * @property {string} title
 * @property {GateScope} scope
 * @property {GateState} state
 * @property {string} evidence
 */

/**
 * @typedef {object} ReleaseWatch
 * @property {WatchKind} kind
 * @property {string=} repoId
 * @property {string=} author
 * @property {number=} baselineCount
 */

/**
 * @typedef {object} FrontierRelease
 * @property {string} id
 * @property {string} title
 * @property {string} publisher
 * @property {string} releasedAt
 * @property {FrontierReleaseCategory} category
 * @property {string} primarySource
 * @property {string} artifactSource
 * @property {string[]} targetOrgans
 * @property {string} whyItMatters
 * @property {string} operationalTarget
 * @property {ReleaseMaturity} maturity
 * @property {string} license
 * @property {LicensePosture} licensePosture
 * @property {string} resourceClass
 * @property {EvaluationPosture} posture
 * @property {ReleaseSignals} signals
 * @property {string[]} sourceClaims
 * @property {ReleaseGate[]} gates
 * @property {ReleaseWatch} watch
 */

export const FRONTIER_CATALOG_EVALUATED_AT = "2026-09-03T14:12:00Z";
export const FRONTIER_MATERIALITY_THRESHOLD = 70;

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
    targetOrgans: ["szl-kernels", "szl-serve", "a11oy"],
    whyItMatters:
      "Creates a versioned Hub contract for browser GPU operators, including correctness cases, benchmark cases, provenance, and reusable WGSL templates.",
    operationalTarget:
      "Run a browser hardware preflight, then benchmark selected transformer operators against the current WebGPU baseline before any routing decision.",
    maturity: "preview",
    license: "Artifact-specific; capture every kernel license before promotion",
    licensePosture: "per-artifact-review",
    resourceClass: "browser GPU",
    posture: "EVALUATE_NOW",
    signals: {
      impact: 25,
      estateFit: 25,
      evidenceQuality: 23,
      integrationReadiness: 21,
      riskPenalty: 6,
    },
    sourceClaims: [
      "Initial collection announced with 207 versioned WebGPU kernels.",
      "Kernel packages include interface, correctness, benchmark, provenance, and WGSL artifacts.",
      "Published operator timings are not end-to-end model benchmarks and must be reproduced on SZL hardware.",
    ],
    gates: [
      {
        id: "webgpu-source",
        title: "Primary source and artifact namespace recorded",
        scope: "evaluation",
        state: "pass",
        evidence: "Official Hugging Face release article and Hub organization are pinned in this catalog.",
      },
      {
        id: "webgpu-preflight",
        title: "Supported browser obtains a WebGPU adapter",
        scope: "evaluation",
        state: "pending",
        evidence: "Run the built-in Frontier browser probe on the target device matrix.",
      },
      {
        id: "webgpu-correctness",
        title: "Selected operators match reference outputs",
        scope: "production",
        state: "pending",
        evidence: "Require deterministic parity across supported browsers, devices, dtypes, shapes, and edge cases.",
      },
      {
        id: "webgpu-performance",
        title: "Measured workload gain clears the SZL threshold",
        scope: "production",
        state: "pending",
        evidence: "Require end-to-end p50/p95 improvement without accuracy, memory, or thermal regression.",
      },
      {
        id: "webgpu-license",
        title: "Every promoted kernel has an admitted license receipt",
        scope: "production",
        state: "hold",
        evidence: "The collection is heterogeneous; production use remains held until each selected artifact is reviewed.",
      },
    ],
    watch: { kind: "model-inventory", author: "webgpu-kernels", baselineCount: 207 },
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
    whyItMatters:
      "Provides internet-scale dense, sparse, filtered, and hybrid retrieval evidence with exact top-1000 ground truth rather than relying on toy RAG tests.",
    operationalTarget:
      "Start with a bounded shard and reproducible query pack; record recall, p50/p95/p99 latency, ingestion cost, memory, and failure behavior before scaling.",
    maturity: "released",
    license: "ODC-BY-1.0 corpus; MS MARCO query terms require separate review",
    licensePosture: "mixed",
    resourceClass: "multi-terabyte distributed benchmark",
    posture: "BENCHMARK_FIRST",
    signals: {
      impact: 25,
      estateFit: 24,
      evidenceQuality: 24,
      integrationReadiness: 17,
      riskPenalty: 8,
    },
    sourceClaims: [
      "Corpus contains roughly 10.07 billion dense and sparse vector records.",
      "Exact top-1000 ground truth is supplied for dense, sparse, and filtered retrieval workloads.",
      "Full-corpus execution is intentionally not the first SZL step because storage and compute requirements are substantial.",
    ],
    gates: [
      {
        id: "fineweb-source",
        title: "Dataset card, article, and licensing notes recorded",
        scope: "evaluation",
        state: "pass",
        evidence: "Primary Qdrant and Hugging Face sources are pinned in this catalog.",
      },
      {
        id: "fineweb-bounded-shard",
        title: "Bounded smoke shard is reproducible",
        scope: "evaluation",
        state: "pending",
        evidence: "Create a checksum-pinned shard with query, embedding, and ground-truth lineage.",
      },
      {
        id: "fineweb-retrieval-slo",
        title: "Hybrid recall and latency SLOs are met",
        scope: "production",
        state: "pending",
        evidence: "Measure recall@10/@100, p50/p95/p99, throughput, filtering, and degraded-node behavior.",
      },
      {
        id: "fineweb-cost",
        title: "Scale economics are approved",
        scope: "production",
        state: "pending",
        evidence: "Require an explicit storage, network, build-time, and serving-cost receipt before larger ingestion.",
      },
      {
        id: "fineweb-query-rights",
        title: "Query-pack usage is cleared for the intended environment",
        scope: "production",
        state: "hold",
        evidence: "MS MARCO-derived query assets carry separate non-commercial research terms and are not assumed production-cleared.",
      },
    ],
    watch: { kind: "dataset", repoId: "Qdrant/FineWeb-10B" },
  },
  {
    id: "puffin-world-2026-09-02",
    title: "Puffin-World native 3D multimodal world model",
    publisher: "ACE Robotics / NTU S-Lab",
    releasedAt: "2026-09-02",
    category: "multimodal-world-model",
    primarySource: "https://huggingface.co/blog/KangLiao/puffin-world",
    artifactSource: "https://huggingface.co/ACERobotics/Puffin-World",
    targetOrgans: ["killinchu", "aegis", "khipu", "szl-command-lab"],
    whyItMatters:
      "Unifies camera-aware understanding, controlled generation, multi-view RGB-D synthesis, and 3D reconstruction in one research system.",
    operationalTarget:
      "Keep isolated in the research plane; reproduce one static-scene camera and depth task with sealed inputs, outputs, environment, and license evidence.",
    maturity: "research",
    license: "NTU S-Lab License 1.0",
    licensePosture: "review-required",
    resourceClass: "large CUDA research stack",
    posture: "SANDBOX_ONLY",
    signals: {
      impact: 25,
      estateFit: 22,
      evidenceQuality: 21,
      integrationReadiness: 14,
      riskPenalty: 10,
    },
    sourceClaims: [
      "The released system combines autoregressive understanding and diffusion-based multi-view RGB-D generation.",
      "The reference environment calls for a CUDA/PyTorch research stack and downloadable checkpoints.",
      "The model card describes static-scene and limited-physics constraints, and no Hugging Face Inference Provider deployment is available.",
    ],
    gates: [
      {
        id: "puffin-source",
        title: "Canonical model card and release article recorded",
        scope: "evaluation",
        state: "pass",
        evidence: "The current ACE Robotics model namespace and official Hugging Face article are pinned.",
      },
      {
        id: "puffin-isolation",
        title: "No production connector or action surface",
        scope: "evaluation",
        state: "pass",
        evidence: "Catalog posture is sandbox-only and the production disposition is fail-closed.",
      },
      {
        id: "puffin-repro",
        title: "One published task reproduces with sealed evidence",
        scope: "evaluation",
        state: "pending",
        evidence: "Pin checkpoint digest, code revision, CUDA image, prompt/input asset, output asset, and measured result.",
      },
      {
        id: "puffin-license",
        title: "License and downstream checkpoint rights are cleared",
        scope: "production",
        state: "hold",
        evidence: "No commercial or production assumption is made from the custom research license.",
      },
      {
        id: "puffin-safety",
        title: "Domain safety and known physical limitations are bounded",
        scope: "production",
        state: "hold",
        evidence: "Dynamic scenes, long temporal horizons, and richer interactions remain outside the proven envelope.",
      },
    ],
    watch: { kind: "model", repoId: "ACERobotics/Puffin-World" },
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
    whyItMatters:
      "Moves forecasting and anomaly signals into the governed event stream so predictions can be replayed, approved, observed, and linked to downstream outcomes.",
    operationalTarget:
      "Benchmark the Apache-2.0 TTM model locally against a naive baseline, then model the Flink-to-Kafka integration as an early-access architecture gate.",
    maturity: "early-access-integration",
    license: "Apache-2.0 model; Confluent service terms apply to managed deployment",
    licensePosture: "clear",
    resourceClass: "local CPU/GPU model plus managed streaming integration",
    posture: "EVALUATE_NOW",
    signals: {
      impact: 24,
      estateFit: 25,
      evidenceQuality: 22,
      integrationReadiness: 20,
      riskPenalty: 5,
    },
    sourceClaims: [
      "The referenced Granite TTM model is Apache-2.0 and designed for compact time-series forecasting.",
      "The new architecture places model inference in the Flink stream and writes results to Kafka topics.",
      "The managed Confluent path is early access and is not represented as generally available production infrastructure.",
    ],
    gates: [
      {
        id: "granite-source",
        title: "Model and deployment architecture sources recorded",
        scope: "evaluation",
        state: "pass",
        evidence: "Official IBM/Hugging Face model and release article are pinned.",
      },
      {
        id: "granite-local-baseline",
        title: "Local TTM forecast clears a naive baseline",
        scope: "evaluation",
        state: "pending",
        evidence: "Measure MAE/MSE, inference latency, memory, and missing-data behavior on Lyte-shaped telemetry.",
      },
      {
        id: "granite-stream-replay",
        title: "Prediction events are replayable and receipt-linked",
        scope: "production",
        state: "pending",
        evidence: "Require immutable input offsets, model revision, output topic, policy decision, and downstream outcome linkage.",
      },
      {
        id: "granite-drift",
        title: "Forecast and anomaly drift are monitored",
        scope: "production",
        state: "pending",
        evidence: "Define backtest windows, drift thresholds, abstention, rollback, and human escalation.",
      },
      {
        id: "granite-early-access",
        title: "Managed integration access and service controls are verified",
        scope: "production",
        state: "pending",
        evidence: "Do not claim the Confluent integration live until entitlement, region, limits, and failure modes are witnessed.",
      },
    ],
    watch: { kind: "model", repoId: "ibm-granite/granite-timeseries-ttm-r2" },
  },
]);

/**
 * Compute a transparent 0–100 materiality score.
 * @param {FrontierRelease} release
 */
export function materialityScore(release) {
  const { impact, estateFit, evidenceQuality, integrationReadiness, riskPenalty } = release.signals;
  return Math.max(
    0,
    Math.min(100, impact + estateFit + evidenceQuality + integrationReadiness - riskPenalty),
  );
}

/** @param {FrontierRelease} release */
export function isMaterialRelease(release) {
  return materialityScore(release) >= FRONTIER_MATERIALITY_THRESHOLD;
}

/** @param {FrontierRelease} release */
export function evaluationDecision(release) {
  if (!isMaterialRelease(release)) return "IGNORE";
  switch (release.posture) {
    case "EVALUATE_NOW":
      return "EVALUATE";
    case "BENCHMARK_FIRST":
      return "BENCHMARK";
    case "SANDBOX_ONLY":
      return "SANDBOX";
    case "ARCHITECTURE_WATCH":
      return "WATCH";
    default:
      return "IGNORE";
  }
}

/** @param {FrontierRelease} release */
export function productionDisposition(release) {
  const productionGates = release.gates.filter((gate) => gate.scope === "production");
  const allProductionGatesPass =
    productionGates.length > 0 && productionGates.every((gate) => gate.state === "pass");
  const licenseAdmitted = release.licensePosture === "clear";
  const maturityAdmitted = release.maturity === "released";
  return allProductionGatesPass && licenseAdmitted && maturityAdmitted ? "PROMOTE" : "HOLD";
}

export function buildFrontierReleaseManifest() {
  const releases = FRONTIER_RELEASES.map((release) => ({
    ...release,
    materialityScore: materialityScore(release),
    material: isMaterialRelease(release),
    evaluationDecision: evaluationDecision(release),
    productionDisposition: productionDisposition(release),
  }));
  return {
    schema: "szl.frontier.hugging-face-release-intake.v1",
    evaluatedAt: FRONTIER_CATALOG_EVALUATED_AT,
    policy: {
      defaultEffect: "hold",
      materialityThreshold: FRONTIER_MATERIALITY_THRESHOLD,
      notificationRule: "notify only for a deduplicated candidate at or above the materiality threshold",
      promotionRule: "all production gates pass, license is admitted, maturity is released, and a receipt is sealed",
    },
    releaseCount: releases.length,
    materialReleaseCount: releases.filter((release) => release.material).length,
    productionPromotionCount: releases.filter(
      (release) => release.productionDisposition === "PROMOTE",
    ).length,
    releases,
  };
}
