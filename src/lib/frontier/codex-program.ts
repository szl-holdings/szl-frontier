/** Upgrade program ledger. This organ executes only its own lanes. */

export const PROGRAM_SCHEMA = "szl.frontier.codex-upgrade-program/v1";

export type ExecutionScope = "THIS_ORGAN" | "HANDOFF";
export type Plane = "frontend" | "backend" | "dream";

export type UpgradeLane = {
  id: string;
  plane: Plane;
  title: string;
  owners: string[];
  intent: string;
  forbidden: string;
  scope: ExecutionScope;
  dream: boolean;
  productionAuthorization: false;
  status: "ADMITTED_EVALUATION" | "HOLD";
};

export const UPGRADE_LANES: UpgradeLane[] = [
  { id: "FE-01", plane: "frontend", title: "a11oy product UI inside flagship", owners: ["szl-holdings/a11oy"], intent: "Upgrade the product surface in-place.", forbidden: "Do not clone a11oy or mint a second flagship.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "FE-02", plane: "frontend", title: "a11oy-net proof origin", owners: ["szl-holdings/a11oy-net"], intent: "Static proof, theme registry, honesty cards.", forbidden: "Do not turn proof into runtime authority.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "FE-03", plane: "frontend", title: "szl-frontier operator plane", owners: ["szl-holdings/szl-frontier"], intent: "Honesty surface, estate observation, Codex tab, triad display.", forbidden: "Do not promote HOLD. Do not recreate a11oy.", scope: "THIS_ORGAN", dream: false, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "FE-04", plane: "frontend", title: "szl-brand token river", owners: ["szl-holdings/szl-brand"], intent: "One token source consumed by product and holograms.", forbidden: "Do not stand up a new site.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "FE-05", plane: "frontend", title: "Hologram TS surfaces", owners: ["szl-holdings/holographic-unify", "szl-holdings/immune", "szl-holdings/lyte-lattice", "szl-holdings/szl-command-lab"], intent: "Bind as an a11oy package.", forbidden: "Not a flagship. Not a product certificate.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "FE-06", plane: "frontend", title: "HF Spaces frontends", owners: ["szl-holdings/szl-frontier"], intent: "Observe Spaces. Demand /health /ready /source on each owner.", forbidden: "RUNNING ≠ runtime-verified. Do not mutate Space repos from this organ.", scope: "THIS_ORGAN", dream: false, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "FE-07", plane: "frontend", title: "Exhibit surfaces", owners: ["szl-holdings/anatomy", "szl-holdings/the-grid", "szl-holdings/sda"], intent: "Keep exhibits labeled as exhibits.", forbidden: "Not product certificates.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "FE-08", plane: "frontend", title: "Archived docs holograms", owners: ["szl-holdings/docs-site", "szl-holdings/developers"], intent: "Leave archived. Bind remaining docs through a11oy-net.", forbidden: "Do not resurrect holograms as products.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-01", plane: "backend", title: "a11oy product backend", owners: ["szl-holdings/a11oy"], intent: "Deny by default. Signed receipts.", forbidden: "Do not rewrite from this organ.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-02", plane: "backend", title: "szl-serve profiles", owners: ["szl-holdings/szl-serve"], intent: "Serving profiles. Energy MEASURED or UNAVAILABLE.", forbidden: "Configured endpoints are not qualified workers.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-03", plane: "backend", title: "szl-router receipts", owners: ["szl-holdings/szl-router"], intent: "Per-answer DSSE envelopes on the gateway.", forbidden: "Do not edit router main from this organ.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-04", plane: "backend", title: "szl-forge eval only", owners: ["szl-holdings/szl-forge"], intent: "Evaluation recipes.", forbidden: "No training. Budget $0.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-05", plane: "backend", title: "Shared substrate", owners: ["szl-holdings/szl-substrate", "szl-holdings/platform"], intent: "Eliminate duplication.", forbidden: "Do not fork a second substrate.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-06", plane: "backend", title: "MCP + governance", owners: ["szl-holdings/hatun-mcp", "szl-holdings/szl-gov"], intent: "Doctrine-aware tools under PURIQ.", forbidden: "Tools are not action authority.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-07", plane: "backend", title: "Vertical FastAPI", owners: ["szl-holdings/vertical-services", "szl-holdings/lyte-services"], intent: "Bind as an a11oy package.", forbidden: "Do not mint a new flagship vertical.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "BE-08", plane: "backend", title: "Receipt primitives", owners: ["szl-holdings/szl-receipt", "szl-holdings/khipu-consensus"], intent: "DSSE + BFT primitives stay shared.", forbidden: "Do not invent a second signing stack.", scope: "HANDOFF", dream: false, productionAuthorization: false, status: "HOLD" },
  { id: "DR-01", plane: "dream", title: "Receipt-carrying UI schema", owners: ["szl-holdings/szl-frontier", "szl-holdings/a11oy-net"], intent: "Every surface renders a receipt envelope as chrome.", forbidden: "Envelope cannot grant authority.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-02", plane: "dream", title: "Cross-organ design tokens", owners: ["szl-holdings/szl-brand"], intent: "One token river.", forbidden: "Do not unify all frontends into one app.", scope: "HANDOFF", dream: true, productionAuthorization: false, status: "HOLD" },
  { id: "DR-03", plane: "dream", title: "Space triad on every Space", owners: ["szl-holdings/szl-frontier"], intent: "Contract + operator display of /health ≠ /ready ≠ /source.", forbidden: "Do not mutate Space repos from this seat.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-04", plane: "dream", title: "Governed inference receipts", owners: ["szl-holdings/szl-router", "szl-holdings/szl-serve"], intent: "Every completion carries a DSSE envelope.", forbidden: "Cannot authorize from this organ.", scope: "HANDOFF", dream: true, productionAuthorization: false, status: "HOLD" },
  { id: "DR-05", plane: "dream", title: "Memory covenant only memory plane", owners: ["szl-holdings/szl-frontier"], intent: "Extend covenant. Do not replace.", forbidden: "Private graph unpublished. 0 admitted to gradients.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-06", plane: "dream", title: "Kernel family live membership", owners: ["szl-holdings/szl-frontier", "szl-holdings/szl-kernels"], intent: "Measure kernels as their own family.", forbidden: "Do not collapse overlapping ids into models.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-07", plane: "dream", title: "Estate pin heartbeat", owners: ["szl-holdings/szl-frontier", "szl-holdings/szl-pin"], intent: "Membership identity pin of public heads.", forbidden: "Pin is not a file audit.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-08", plane: "dream", title: "Four-layer honesty surface", owners: ["szl-holdings/szl-frontier"], intent: "Membership ≠ tree ≠ content ≠ qualification.", forbidden: "Do not display UNKNOWN as 0.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
  { id: "DR-09", plane: "dream", title: "Verticals cannot mint flagships", owners: ["szl-holdings/a11oy", "szl-holdings/szl-frontier"], intent: "Journeys stay owned by product repos.", forbidden: "Do not unify all frontends into one app.", scope: "HANDOFF", dream: true, productionAuthorization: false, status: "HOLD" },
  { id: "DR-10", plane: "dream", title: "Λ remains Conjecture 1", owners: ["szl-holdings/lutar-lean", "szl-holdings/szl-frontier"], intent: "Geometric mean 0.97 is shadow only.", forbidden: "Promotion cannot lift HOLD.", scope: "THIS_ORGAN", dream: true, productionAuthorization: false, status: "ADMITTED_EVALUATION" },
];

export function laneScope(id: string): ExecutionScope {
  return UPGRADE_LANES.find((lane) => lane.id === id)?.scope ?? "HANDOFF";
}

export function thisOrganLanes(): UpgradeLane[] {
  return UPGRADE_LANES.filter((lane) => lane.scope === "THIS_ORGAN");
}

export function programSummary() {
  const thisOrgan = thisOrganLanes();
  return {
    schema: PROGRAM_SCHEMA,
    issuedAt: "2026-09-20T19:30:00Z",
    productionAuthorization: false as const,
    trainingAdmission: false as const,
    paidWorkloadBudgetUsd: 0 as const,
    lambda: "CONJECTURE_1" as const,
    fileAuditComplete: false as const,
    sourceContentFilesRead: 0 as const,
    semanticReviewComplete: false as const,
    runtimeVerified: false as const,
    promotionEffect: "NONE" as const,
    execution: {
      isolatedWorktrees: true,
      draftPrsOnly: true,
      mergeProtectedMain: false,
      recreateFlagship: false,
      resetOwnerDirs: false,
      forcePush: false,
      privateNamesPublished: false,
    },
    total: UPGRADE_LANES.length,
    thisOrgan: thisOrgan.length,
    handoff: UPGRADE_LANES.filter((lane) => lane.scope === "HANDOFF").length,
    thisOrganLanes: thisOrgan.map((lane) => lane.id),
    lanes: UPGRADE_LANES,
    note: "This organ executes THIS_ORGAN only. HANDOFF lanes name existing owners. Promotion cannot lift HOLD.",
  };
}
