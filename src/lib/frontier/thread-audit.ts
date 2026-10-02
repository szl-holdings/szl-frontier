/** Encoded thread-audit contract. Network stays out. Optional evaluation does not lift HOLD. */

export const THREAD_AUDIT_SCHEMA = "szl.frontier.thread-audit-payload/v1";
export const THREAD_AUDIT_ISSUED_AT = "2026-10-02T16:20:00Z";

export class ThreadAuditError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "ThreadAuditError";
    this.code = code;
  }
}

export const THREAD_AUDIT_HOLD = {
  productionAuthorization: false as const,
  promotionEffect: "NONE" as const,
  lambda: "CONJECTURE_1" as const,
  trainingAdmission: false as const,
  paidWorkloadBudgetUsd: 0 as const,
  fileAuditComplete: false as const,
  sourceContentFilesRead: 0 as const,
  semanticReviewComplete: false as const,
  runtimeVerified: false as const,
  envelopeAuthority: "NONE" as const,
  mergeProtectedMain: false as const,
  recreateFlagship: false as const,
  optionalEvaluation: true as const,
  optionalEvaluationLiftsHold: false as const,
};

export const THIS_ORGAN_LANES = [
  "FE-03",
  "FE-06",
  "DR-01",
  "DR-03",
  "DR-05",
  "DR-06",
  "DR-07",
  "DR-08",
  "DR-10",
] as const;

export const THREAD_AUDIT_APIS = [
  "/api/health",
  "/api/ready",
  "/api/source",
  "/api/triad",
  "/api/pin",
  "/api/codex",
  "/api/estate",
  "/api/cycle",
  "/api/workstreams",
  "/api/agent-state",
  "/api/kernels",
  "/api/leases",
  "/api/thread-audit",
] as const;

export const MODELED_TABS = [
  "workstreams",
  "cycle",
  "estate",
  "triad",
  "pin",
  "kernels",
  "leases",
  "codex",
  "journeys",
  "lab",
] as const;

export const WIRED_TABS = [...MODELED_TABS, "optional", "audit"] as const;

export const MODELED_CENSUS = {
  schema: "szl.frontier.estate-observation/v1",
  observedAt: "2026-09-20",
  kind: "PUBLIC_MEMBERSHIP_SNAPSHOT",
  githubRepos: 117,
  hfModels: 47,
  hfDatasets: 35,
  hfSpaces: 21,
  hfKernels: 14,
  filesRead: 0,
  fileAuditComplete: false,
  qualification: "HOLD",
} as const;

export const THREAD_TURNS = [
  "T01",
  "T02",
  "T03",
  "T04",
  "T05",
  "T06",
  "T07",
  "T08",
  "T09",
  "T10",
] as const;

export const THREAD_GAPS = [
  { id: "G01", item: "frontier.tsx 10-tab optional-eval wiring", encoded: "OPEN" },
  { id: "G02", item: "merge #196 to protected main", encoded: "REFUSED" },
  { id: "G03", item: "file-by-file GitHub org audit", encoded: "OPEN" },
  { id: "G04", item: "HF content audit of models/datasets/spaces/kernels", encoded: "OPEN" },
  { id: "G05", item: "HANDOFF lane execution", encoded: "NAMED_ONLY" },
  { id: "G06", item: "live triad probe of 21 Spaces", encoded: "CONTRACT_ONLY" },
  { id: "G07", item: "training / second flagship / production promotion", encoded: "FORBIDDEN" },
  { id: "G08", item: "current main SHA", encoded: "UNKNOWN" },
] as const;

export function assertThreadAuditHold(): void {
  if (THREAD_AUDIT_HOLD.productionAuthorization !== false) {
    throw new ThreadAuditError("HOLD_AUTH");
  }
  if (THREAD_AUDIT_HOLD.optionalEvaluationLiftsHold !== false) {
    throw new ThreadAuditError("HOLD_OPTIONAL_LIFT");
  }
  if (THREAD_AUDIT_HOLD.fileAuditComplete !== false) {
    throw new ThreadAuditError("HOLD_FILE_AUDIT");
  }
  if (THREAD_AUDIT_HOLD.sourceContentFilesRead !== 0) {
    throw new ThreadAuditError("HOLD_FILES_READ");
  }
  if (THREAD_AUDIT_HOLD.envelopeAuthority !== "NONE") {
    throw new ThreadAuditError("HOLD_ENVELOPE");
  }
  if (THREAD_AUDIT_HOLD.mergeProtectedMain !== false) {
    throw new ThreadAuditError("HOLD_MERGE");
  }
  const kernelCount: number = MODELED_CENSUS.hfKernels;
  const modelCount: number = MODELED_CENSUS.hfModels;
  if (Number(kernelCount) === Number(modelCount)) {
    throw new ThreadAuditError("KERNELS_EQ_MODELS");
  }
  if (THIS_ORGAN_LANES.length !== 9) throw new ThreadAuditError("THIS_ORGAN_COUNT");
  if (THREAD_TURNS.length !== 10) throw new ThreadAuditError("TURN_COUNT");
  if (THREAD_GAPS.length !== 8) throw new ThreadAuditError("GAP_COUNT");
  if (MODELED_TABS.length !== 10) throw new ThreadAuditError("TAB_COUNT");
}

export function threadAuditContract() {
  assertThreadAuditHold();
  return {
    schema: THREAD_AUDIT_SCHEMA,
    issuedAt: THREAD_AUDIT_ISSUED_AT,
    organ: "szl-holdings/szl-frontier",
    hold: THREAD_AUDIT_HOLD,
    thisOrganLanes: [...THIS_ORGAN_LANES],
    handoffLaneCount: 17,
    workstreamCount: 34,
    modeledTabs: [...MODELED_TABS],
    wiredTabs: [...WIRED_TABS],
    apis: [...THREAD_AUDIT_APIS],
    census: MODELED_CENSUS,
    turns: [...THREAD_TURNS],
    gaps: THREAD_GAPS.map((row) => ({ ...row })),
    execution: {
      isolatedWorktrees: true,
      draftPrsOnly: true,
      mergeProtectedMain: false,
      recreateFlagship: false,
      forcePush: false,
      training: false,
      networkInThisPayload: false,
    },
    liveGitHubHead: null as string | null,
    liveGitHubHeadClass: "UNAVAILABLE" as const,
    note: "Encoded thread. Live GitHub/HF re-probe is a separate observation. HTTP 200 is REACHABLE. Optional evaluation does not lift HOLD.",
  };
}
