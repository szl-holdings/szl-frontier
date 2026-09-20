/** Explicit pre-execution agent state. step() must be able to stop before tools. */

export const AGENT_STATE_SCHEMA = "szl.frontier.agent-state/v1";

export type AgentPhase =
  | "PLANNED"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "EXECUTING"
  | "VERIFIED"
  | "RECEIPTED"
  | "STOPPED";

export type AgentState = {
  schema: typeof AGENT_STATE_SCHEMA;
  productionAuthorization: false;
  phase: AgentPhase;
  context: string;
  includedEvidence: string[];
  excludedEvidence: string[];
  tools: string[];
  capabilities: string[];
  permissions: string[];
  costTokenBudget: number;
  plannedSideEffects: string[];
  approvalObligations: string[];
  toolsMayRun: boolean;
  note: string;
};

export class AgentStateError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "AgentStateError";
    this.code = code;
  }
}

const ORDER: AgentPhase[] = [
  "PLANNED",
  "READY_FOR_REVIEW",
  "APPROVED",
  "EXECUTING",
  "VERIFIED",
  "RECEIPTED",
];

export function planEvaluationTurn(): AgentState {
  return {
    schema: AGENT_STATE_SCHEMA,
    productionAuthorization: false,
    phase: "PLANNED",
    context: "szl-frontier operator EVALUATION turn",
    includedEvidence: ["wave-3 freeze", "a11oy#2213 MERGED", "healthz c7c0ba17"],
    excludedEvidence: ["org-card 16/45/34", "a11oy.net 44/30/48"],
    tools: ["observeEstate", "composeTriad", "kernelFamilyCatalog"],
    capabilities: ["estate.observe.public"],
    permissions: ["read-public"],
    costTokenBudget: 0,
    plannedSideEffects: [],
    approvalObligations: ["publisher #2189 remains owner-only"],
    toolsMayRun: false,
    note: "PLANNED cannot run tools. Promotion stays HOLD.",
  };
}

export function step(state: AgentState, next: AgentPhase): AgentState {
  if (next === "STOPPED") {
    return { ...state, phase: "STOPPED", toolsMayRun: false, note: "Stopped before tools." };
  }
  const from = ORDER.indexOf(state.phase);
  const to = ORDER.indexOf(next);
  if (from < 0 || to < 0) throw new AgentStateError("PHASE");
  if (to !== from + 1) throw new AgentStateError("PHASE_SKIP");
  if (state.productionAuthorization !== false) throw new AgentStateError("PRODUCTION_FORBIDDEN");
  const toolsMayRun = next === "EXECUTING";
  if (toolsMayRun && state.plannedSideEffects.some((s) => s.includes("publish") || s.includes("deploy"))) {
    throw new AgentStateError("SIDE_EFFECT_BLOCKED");
  }
  return {
    ...state,
    phase: next,
    toolsMayRun,
    note: toolsMayRun ? "Tools may run under EVALUATION only." : `${next} does not grant production.`,
  };
}
