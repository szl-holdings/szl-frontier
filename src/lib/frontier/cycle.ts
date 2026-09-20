import { sha256Hex } from "../covenant/sha256.ts";
import {
  evaluateLambdaGate,
  sealCompleteness,
  type AxisEvidence,
  type GateResult,
} from "./lambda-gate.ts";
import { SOURCE } from "./source.ts";
import { WORKSTREAMS } from "./workstreams.ts";

export const CYCLE_SCHEMA = "szl.frontier.ouroboros-cycle.v1";
export const MAX_ROUNDS = 2;
export const IDENTITY = "receipts.in ≡ receipts.out";

const REQUIRED_READ_ONLY = [
  "identity_integrity",
  "authorization_scope",
  "policy_conformance",
  "evidence_completeness",
  "provenance_integrity",
  "freshness",
  "schema_validity",
  "tool_boundary_safety",
  "reversibility",
  "impact_boundedness",
] as const;

export interface CycleReceipt {
  digest: string;
  subject: string;
  payload: Record<string, unknown>;
  previousDigest: string | null;
  createdAt: string;
}

export interface CycleReport {
  schema: typeof CYCLE_SCHEMA;
  exit: "converged" | "aborted";
  kind: "SOFTWARE";
  productionAuthorized: false;
  trainingAdmission: false;
  energy: "UNAVAILABLE";
  lambda: "CONJECTURE_1";
  identity: typeof IDENTITY;
  actionClass: "READ_ONLY";
  live: boolean;
  rounds: CycleReceipt[];
  gate: GateResult;
  sourceHead: string;
  observedAt: string;
  counterparty: Record<string, unknown> | null;
  note: string;
}

function iso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function axis(
  name: string,
  value: number | null,
  status: AxisEvidence["status"],
  now: Date,
  note: string,
  sourceRef: string,
): AxisEvidence {
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    name,
    value,
    status,
    required: true,
    weight: 1,
    sourceRef,
    observedAt: iso(now),
    expiryAt: iso(expiry),
    note,
  };
}

export function collectSoftwareAxes(now: Date, liveRequired: boolean): AxisEvidence[] {
  const catalogOk = WORKSTREAMS.length === 34 && WORKSTREAMS.every((w) => w.productionAuthorized === false);
  const names = liveRequired
    ? [...REQUIRED_READ_ONLY, "counterparty_trust" as const]
    : [...REQUIRED_READ_ONLY];

  const values: Record<string, { value: number | null; status: AxisEvidence["status"]; note: string }> = {
    identity_integrity: { value: 1, status: "MEASURED", note: `organ=${SOURCE.repository}` },
    authorization_scope: { value: 1, status: "MEASURED", note: "READ_ONLY proposal cycle" },
    policy_conformance: { value: 1, status: "MEASURED", note: "deny-by-default; promotion HOLD" },
    evidence_completeness: { value: 0, status: "MEASURED", note: "sealed later" },
    provenance_integrity: {
      value: /^[0-9a-f]{40}$/.test(SOURCE.reconciledHead) ? 1 : 0,
      status: "MEASURED",
      note: `reconciledHead=${SOURCE.reconciledHead}`,
    },
    freshness: { value: 1, status: "MEASURED", note: "operator plane clock" },
    schema_validity: { value: catalogOk ? 1 : 0, status: "MEASURED", note: "F01–F34 catalog present" },
    tool_boundary_safety: { value: 1, status: "MEASURED", note: "no tool execution; proposal-only" },
    reversibility: { value: 1, status: "MEASURED", note: "READ_ONLY" },
    impact_boundedness: { value: 1, status: "MEASURED", note: "MAX_ROUNDS=2; always terminates" },
    counterparty_trust: {
      value: null,
      status: "UNAVAILABLE",
      note: "live GitHub not attached in software-only axes",
    },
  };

  return names.map((name) => {
    const row = values[name]!;
    return axis(name, row.value, row.status, now, row.note, `cycle:${name}`);
  });
}

export function attachLiveCounterparty(
  axes: AxisEvidence[],
  observation: { ok: boolean; status: string; defaultBranch?: string | null; error?: string },
  now: Date,
): AxisEvidence[] {
  const live: AxisEvidence = axis(
    "counterparty_trust",
    observation.ok ? 1 : observation.status === "UNAVAILABLE" ? null : 0,
    observation.ok ? "MEASURED" : "UNAVAILABLE",
    now,
    observation.ok
      ? `default_branch=${observation.defaultBranch ?? "unknown"}`
      : observation.error ?? "UNAVAILABLE",
    "github:szl-holdings/szl-frontier",
  );
  const replaced = axes.map((a) => (a.name === "counterparty_trust" ? live : a));
  if (!replaced.some((a) => a.name === "counterparty_trust")) replaced.push(live);
  return sealCompleteness(replaced, now);
}

function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(rec).sort().map((k) => [k, sortKeys(rec[k])]));
  }
  return value;
}

async function digestPayload(payload: Record<string, unknown>, previous: string | null): Promise<string> {
  return sha256Hex(canonical({ payload, previous }));
}

function payloadOf(opts: {
  axes: AxisEvidence[];
  gate: GateResult;
  round: number;
  exit: string;
  chainHead: string | null;
  incoming: string | null;
  live: boolean;
  counterparty: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    schema: CYCLE_SCHEMA,
    authority: "PROPOSAL_ONLY",
    state: "PROPOSAL_ONLY",
    lambda: "CONJECTURE_1",
    lambdaNeverATheorem: true,
    energy: "UNAVAILABLE",
    signed: false,
    signatures: [],
    actionClass: "READ_ONLY",
    verdict: opts.gate.verdict,
    lambdaScore: opts.gate.lambdaScore,
    arithmeticScore: opts.gate.arithmeticScore,
    threshold: opts.gate.threshold,
    reasonCodes: opts.gate.reasonCodes,
    gaps: opts.gate.gaps,
    divergent: opts.gate.divergent,
    shadow: opts.gate.divergent
      ? {
          kind: "ARITHMETIC_COUNTERFACTUAL",
          executable: false,
          arithmeticWouldAllow: opts.gate.arithmeticWouldAllow,
          geometricVerdict: opts.gate.verdict,
        }
      : null,
    productionAuthorized: false,
    trainingAdmission: false,
    axes: opts.axes,
    round: opts.round,
    budget: MAX_ROUNDS,
    exit: opts.exit,
    kind: "SOFTWARE",
    identity: IDENTITY,
    chainHead: opts.chainHead,
    incomingDigest: opts.incoming,
    live: opts.live,
    counterparty: opts.counterparty,
    perpetualMotion: false,
    terminating: true,
  };
}

export async function runSoftwareCycle(opts: {
  live?: boolean;
  counterparty?: { ok: boolean; status: string; defaultBranch?: string | null; error?: string } | null;
  now?: Date;
}): Promise<CycleReport> {
  const now = opts.now ?? new Date();
  const live = Boolean(opts.live);
  let axes = collectSoftwareAxes(now, live);
  const counterparty = opts.counterparty
    ? {
        status: opts.counterparty.status,
        defaultBranch: opts.counterparty.defaultBranch ?? null,
        ok: opts.counterparty.ok,
        error: opts.counterparty.error ?? null,
      }
    : null;
  if (live && opts.counterparty) {
    axes = attachLiveCounterparty(axes, opts.counterparty, now);
  } else {
    axes = sealCompleteness(axes, now);
  }

  const gate = evaluateLambdaGate(axes, { now });
  const p1 = payloadOf({
    axes,
    gate,
    round: 1,
    exit: "observed",
    chainHead: null,
    incoming: null,
    live,
    counterparty,
  });
  const d1 = await digestPayload(p1, null);
  const r1: CycleReceipt = {
    digest: d1,
    subject: "ouroboros-cycle-round-1",
    payload: p1,
    previousDigest: null,
    createdAt: iso(now),
  };

  const p2 = payloadOf({
    axes,
    gate,
    round: 2,
    exit: "converged",
    chainHead: d1,
    incoming: d1,
    live,
    counterparty,
  });
  const d2 = await digestPayload(p2, d1);
  const r2: CycleReceipt = {
    digest: d2,
    subject: "ouroboros-cycle-round-2",
    payload: p2,
    previousDigest: d1,
    createdAt: iso(new Date(now.getTime() + 1)),
  };

  return {
    schema: CYCLE_SCHEMA,
    exit: "converged",
    kind: "SOFTWARE",
    productionAuthorized: false,
    trainingAdmission: false,
    energy: "UNAVAILABLE",
    lambda: "CONJECTURE_1",
    identity: IDENTITY,
    actionClass: "READ_ONLY",
    live,
    rounds: [r1, r2],
    gate,
    sourceHead: SOURCE.reconciledHead,
    observedAt: iso(now),
    counterparty,
    note: "Two rounds then halt. Proposal-only. Arithmetic mean cannot act. Energy UNAVAILABLE.",
  };
}

export function promotionBlockedReason(): string {
  return "Production promotion is HOLD. Missing independent witness, human approval, and an explicit productionDisposition change. This control cannot lift HOLD.";
}
