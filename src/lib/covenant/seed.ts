import type { AgentProfile, ProjectProfile, TenantProfile } from "./types";

export const TENANTS: TenantProfile[] = [
  { id: "szl-core", name: "SZL Core", domain: "memory-plane" },
  { id: "szl-research", name: "SZL Research", domain: "research" },
  { id: "adversary-sim", name: "Adversary Sim", domain: "testnet" },
];

export const AGENTS: AgentProfile[] = [
  {
    id: "alloy-planner",
    name: "Alloy Planner",
    mandate: "Plan and retrieve governed context for SZL agents",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    clearance: "secret",
    status: "idle",
    lastAction: "plane ready",
  },
  {
    id: "covenant-auditor",
    name: "Covenant Auditor",
    mandate: "Policy memory, lifecycle, and receipt integrity",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    clearance: "secret",
    status: "idle",
    lastAction: "watching",
  },
  {
    id: "aegis-watch",
    name: "Aegis Watch",
    mandate: "Quarantine and threat classification",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    clearance: "secret",
    status: "idle",
    lastAction: "idle",
  },
  {
    id: "lyte-ops",
    name: "Lyte Ops",
    mandate: "Research ingestion and evaluation notes",
    tenantId: "szl-research",
    securityDomain: "research",
    clearance: "confidential",
    status: "idle",
    lastAction: "idle",
  },
  {
    id: "prism-eval",
    name: "PRISM Eval",
    mandate: "Model-routing evaluation plane",
    tenantId: "szl-research",
    securityDomain: "research",
    clearance: "confidential",
    status: "idle",
    lastAction: "idle",
  },
  {
    id: "red-team-sim",
    name: "Red Team Sim",
    mandate: "Synthetic governance pen-tests — no production action",
    tenantId: "adversary-sim",
    securityDomain: "testnet",
    clearance: "internal",
    status: "idle",
    lastAction: "sandboxed",
  },
  {
    id: "shadow-reader",
    name: "Shadow Reader",
    mandate: "Read-only governed intel connector — no mutation, no active recon",
    tenantId: "szl-research",
    securityDomain: "research",
    clearance: "confidential",
    status: "idle",
    lastAction: "connector idle",
  },
  {
    id: "yachay-navigator",
    name: "Yachay Navigator",
    mandate: "SOFTWARE second brain — handles only, NAVIGATE or ABSTAIN, never invent a nodeId",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    clearance: "secret",
    status: "idle",
    lastAction: "waiting corpus",
  },
];

export const PROJECTS: ProjectProfile[] = [
  {
    id: "vxdb",
    name: "vxdb",
    kind: "project",
    repoUrl: "https://github.com/getmykhan/vxdb",
    techStack: ["rust", "python", "vector-db", "docker"],
    domainTags: ["ai-infra", "retrieval", "indexing"],
    designPrinciples: ["modular crates", "language bindings", "container deployment"],
    notes: "Embedded persistent vector index. Retrieval accelerator only — never the system of record.",
    roleInSzl: "Disposable derived index behind the A11oy Memory Gateway. Pinned 0.5.1.",
  },
  {
    id: "shadowbroker",
    name: "Shadowbroker",
    kind: "project",
    repoUrl: "https://github.com/BigBodyCobain/Shadowbroker",
    techStack: ["next.js", "maplibre", "fastapi", "python"],
    domainTags: [
      "osint",
      "geospatial-intelligence",
      "telemetry-fusion",
      "agent-command-channel",
      "experimental-mesh-governance",
    ],
    designPrinciples: ["self-hosted intel mesh", "read-before-write", "human approval for action"],
    notes: "Geospatial OSINT aggregation. SZL target is a read-only governed intelligence connector first.",
    roleInSzl: "Later: read-only connector. No mutation or active recon in this plane.",
  },
  {
    id: "nvidia-open-models",
    name: "NVIDIA open models",
    kind: "reference",
    repoUrl: "https://www.nvidia.com/en-us/ai/",
    techStack: ["gpu", "llm", "open-weights"],
    domainTags: ["model-lifecycle", "evaluation", "routing"],
    designPrinciples: ["specialized systems of models", "inspectability", "domain evaluation"],
    notes: "Reference profile, not a software repository. Belongs on the model-routing plane.",
    roleInSzl: "Feeds the later evaluation plane — not the v0.1 memory covenant.",
  },
];

export const SEED_MEMORIES: {
  agentId: string;
  tenantId: string;
  securityDomain: string;
  memoryClass: MemoryRecordClass;
  sensitivity: "internal" | "confidential" | "secret";
  content: string;
  sourceRefs: string[];
}[] = [
  {
    agentId: "covenant-auditor",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    memoryClass: "policy_memory",
    sensitivity: "secret",
    content:
      "Covenant v0.1 governing rule: no memory enters or leaves an agent context without identity, purpose, policy evaluation, provenance, lifecycle state, and a verifiable receipt. Default effect is deny. vxdb is a retrieval accelerator, not the system of record. PostgreSQL remains authoritative for identity, ownership, hashes, retention, tombstones, and receipts.",
    sourceRefs: ["covenant://v0.1/invariants"],
  },
  {
    agentId: "alloy-planner",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    memoryClass: "evidence_memory",
    sensitivity: "confidential",
    content:
      "vxdb 0.5.1 (released 2026-07-12) provides embedded persistent storage via mmap, SQLite, and a write-ahead log, with flat and HNSW indexes plus hybrid vector-plus-BM25 retrieval. Standalone server mode is memory-only. SZL must run embedded vxdb behind the Memory Gateway and pin artifact hash. Direct application access is forbidden.",
    sourceRefs: ["https://github.com/getmykhan/vxdb", "pypi:vxdb==0.5.1"],
  },
  {
    agentId: "alloy-planner",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    memoryClass: "decision_memory",
    sensitivity: "confidential",
    content:
      "Decision: target vxdb first as substrate for the A11oy Governed Memory Plane. Do not start with Shadowbroker action surface. Sequence after v0.1: repository ingestion, model registry, Shadowbroker read-only connector, then controlled action with human approval, then continuous adversarial governance testing.",
    sourceRefs: ["szl://frontier/decision/memory-first"],
  },
  {
    agentId: "lyte-ops",
    tenantId: "szl-research",
    securityDomain: "research",
    memoryClass: "evidence_memory",
    sensitivity: "confidential",
    content:
      "NVIDIA open-model posture emphasizes specialized systems of models, domain evaluation, and inspectability. Represent as a ReferenceProfile, not a ProjectProfile. Route into the later model-evaluation plane; do not mix embedding spaces across revisions.",
    sourceRefs: ["ref:nvidia-open-models"],
  },
  {
    agentId: "alloy-planner",
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    memoryClass: "outcome_memory",
    sensitivity: "internal",
    content:
      "Release gate set for Memory Covenant v0.1: cross-tenant isolation, denied writes leave no vector, tombstones immediately non-returnable, every return carries provenance, crash-safe state machine, idempotent duplicates, injection cannot change policy, embedding generation isolation, reconstruct index from authority, no direct vxdb access.",
    sourceRefs: ["szl://gates/memory-covenant-v0.1"],
  },
];

type MemoryRecordClass =
  | "working_memory"
  | "evidence_memory"
  | "policy_memory"
  | "decision_memory"
  | "outcome_memory"
  | "quarantine_memory";
