export const MEMORY_CLASSES = [
  "working_memory",
  "evidence_memory",
  "policy_memory",
  "decision_memory",
  "outcome_memory",
  "quarantine_memory",
] as const;

export type MemoryClass = (typeof MEMORY_CLASSES)[number];

export const SENSITIVITIES = ["public", "internal", "confidential", "secret"] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];

export const WRITE_STATES = [
  "RECEIVED",
  "VALIDATED",
  "POLICY_ALLOWED",
  "POLICY_DENIED",
  "CONTENT_CLASSIFIED",
  "CANONICALIZED_AND_HASHED",
  "RECORD_COMMITTED",
  "INDEX_PENDING",
  "INDEXED",
  "RECEIPT_SEALED",
] as const;
export type WriteState = (typeof WRITE_STATES)[number];

export type Lifecycle = "active" | "tombstoned" | "expired" | "quarantined";

export type ReceiptKind =
  | "policy-decision"
  | "write-effect"
  | "retrieval-result"
  | "deletion-effect"
  | "index-reconciliation"
  | "mesh-dispatch"
  | "ingest-effect"
  | "model-route"
  | "intel-tasking"
  | "action-effect"
  | "adversary-run";

export type Purpose =
  | "governed-recall"
  | "evidence-write"
  | "policy-review"
  | "evaluation"
  | "mesh-dispatch"
  | "adversarial-test"
  | "ingest"
  | "intel-read"
  | "action-execute";

export interface Identity {
  tenantId: string;
  securityDomain: string;
  subjectId: string;
  agentId: string;
  runId: string;
  purpose: Purpose;
}

export interface MemoryEnvelope {
  schemaVersion: string;
  requestId: string;
  tenantId: string;
  securityDomain: string;
  subjectId: string;
  agentId: string;
  runId: string;
  purpose: Purpose;
  memoryClass: MemoryClass;
  sensitivity: Sensitivity;
  retentionPolicy: string;
  content: string;
  contentSha256: string;
  sourceRefs: string[];
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
  embeddingRevision: string;
  policyBundleId: string;
  policyBundleSha256: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface MemoryRecord {
  id: string;
  envelope: MemoryEnvelope;
  lifecycle: Lifecycle;
  indexed: boolean;
  vector: number[];
  tokens: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  seq: number;
  prevHash: string;
  hash: string;
  kind: ReceiptKind;
  operation: string;
  effect: string;
  allowed: boolean;
  identity: Identity;
  memoryIds: string[];
  rejectedIds: string[];
  reason: string;
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  mandate: string;
  tenantId: string;
  securityDomain: string;
  clearance: Sensitivity;
  status: "idle" | "running" | "denied";
  lastAction: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  domain: string;
}

export interface SearchHit {
  memory: MemoryRecord;
  score: number;
}

export interface SearchResult {
  allowed: boolean;
  hits: SearchHit[];
  rejected: { id: string; reason: string }[];
  receipt: Receipt;
}

export interface WriteResult {
  allowed: boolean;
  memory?: MemoryRecord;
  receipt: Receipt;
  trace: WriteState[];
  reason: string;
}

export interface MeshEvent {
  id: string;
  at: string;
  agentId: string;
  operation: string;
  allowed: boolean;
  summary: string;
}

export interface FrontierIdea {
  id: string;
  project: string;
  theme: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  feasibilityHorizon: "near" | "mid" | "far";
  governanceHooks: string[];
  orchestrationHooks: string[];
  createdAt: string;
  expansion?: string;
}

export interface ProjectProfile {
  id: string;
  name: string;
  kind: "project" | "reference";
  repoUrl: string;
  techStack: string[];
  domainTags: string[];
  designPrinciples: string[];
  notes: string;
  roleInSzl: string;
}

export interface GateResult {
  id: string;
  title: string;
  passed: boolean;
  evidence: string;
  round?: 1 | 2 | 3;
}

export interface IngestJob {
  id: string;
  title: string;
  sourceUri: string;
  excerpt: string;
  status: "received" | "classified" | "committed" | "denied" | "quarantined";
  memoryId?: string;
  receiptId?: string;
  reason: string;
  createdAt: string;
}

export interface ModelDef {
  id: string;
  name: string;
  kind: "reasoner" | "embedder" | "specialist";
  revision: string;
  status: "active" | "shadow" | "retired";
  mandate: string;
}

export interface ModelRoute {
  id: string;
  at: string;
  task: "recall" | "expand" | "classify" | "evaluate";
  requestedModel: string;
  selectedModel: string;
  allowed: boolean;
  reason: string;
}

export interface IntelObservation {
  id: string;
  title: string;
  region: string;
  kind: "geospatial" | "open-source" | "telemetry";
  summary: string;
  confidence: "low" | "medium" | "high";
  collectedAt: string;
  source: string;
}

export interface IntelTasking {
  id: string;
  observationId: string;
  requestedBy: string;
  status: "pending" | "approved" | "denied" | "ingested";
  reason: string;
  memoryId?: string;
  createdAt: string;
}

export interface OutcomeNode {
  id: string;
  title: string;
  status: "open" | "reconciled" | "blocked";
  linkedMemoryIds: string[];
  note: string;
  at: string;
}

export type ActionKind =
  | "collect-observation"
  | "rebuild-index"
  | "mesh-probe"
  | "active-recon"
  | "foreign-write"
  | "weaponize";

export interface ActionDef {
  id: ActionKind;
  name: string;
  class: "bounded" | "hard-deny";
  requiresApproval: boolean;
  summary: string;
}

export interface ActionRequest {
  id: string;
  kind: ActionKind;
  requestedBy: string;
  status: "pending" | "approved" | "denied" | "executed";
  reason: string;
  hard: boolean;
  memoryId?: string;
  createdAt: string;
}

export interface AdversaryRun {
  id: string;
  scenarioId: string;
  title: string;
  passed: boolean;
  evidence: string;
  at: string;
}

export interface PolicyFormula {
  id: string;
  name: string;
  rule: string;
}

export interface EngineSnapshot {
  memories: MemoryRecord[];
  receipts: Receipt[];
  mesh: MeshEvent[];
  ideas: FrontierIdea[];
  genesisHash: string;
  policyBundleId: string;
  policyBundleSha256: string;
  embeddingRevision: string;
}
