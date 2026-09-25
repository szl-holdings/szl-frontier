/** Capability leases. No ambient write authority. EVALUATION / HOLD only. */

export const LEASE_SCHEMA = "szl.frontier.capability-lease/v1";

export type LeaseState = "ISSUED" | "EXPIRED" | "REVOKED" | "EXHAUSTED" | "DENIED";

export type CapabilityLease = {
  capability: string;
  subject: string;
  scope: string[];
  issuedAt: string;
  expiresAt: string;
  maxCalls: number;
  callsUsed: number;
  maxCostUsd: number | null;
  allowedTargets: string[];
  approvalId: string | null;
  revoked: boolean;
  productionAuthorization: false;
  state: LeaseState;
};

export class LeaseError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "LeaseError";
    this.code = code;
  }
}

export function leaseState(lease: Omit<CapabilityLease, "state" | "productionAuthorization">, nowIso: string): LeaseState {
  if (lease.revoked) return "REVOKED";
  if (lease.callsUsed >= lease.maxCalls) return "EXHAUSTED";
  if (Date.parse(nowIso) >= Date.parse(lease.expiresAt)) return "EXPIRED";
  return "ISSUED";
}

export function assertUsable(lease: CapabilityLease, target: string, nowIso: string): void {
  const state = leaseState(lease, nowIso);
  if (state !== "ISSUED") throw new LeaseError(`LEASE_${state}`);
  if (!lease.allowedTargets.includes(target) && !lease.allowedTargets.includes("*HOLD*")) {
    throw new LeaseError("LEASE_TARGET_DENIED");
  }
  if (lease.productionAuthorization !== false) throw new LeaseError("LEASE_PRODUCTION_FORBIDDEN");
}

export function issueEvaluationLease(opts: {
  capability: string;
  subject: string;
  scope: string[];
  ttlSeconds: number;
  maxCalls: number;
  allowedTargets: string[];
  nowIso?: string;
}): CapabilityLease {
  if (opts.ttlSeconds <= 0) throw new LeaseError("LEASE_TTL");
  if (opts.maxCalls <= 0) throw new LeaseError("LEASE_MAX_CALLS");
  const issuedAt = opts.nowIso ?? new Date().toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + opts.ttlSeconds * 1000).toISOString();
  const base = {
    capability: opts.capability,
    subject: opts.subject,
    scope: opts.scope,
    issuedAt,
    expiresAt,
    maxCalls: opts.maxCalls,
    callsUsed: 0,
    maxCostUsd: 0,
    allowedTargets: opts.allowedTargets,
    approvalId: null,
    revoked: false,
    productionAuthorization: false as const,
  };
  return { ...base, state: leaseState(base, issuedAt) };
}

export function evaluationLeaseBook() {
  const now = "2026-09-20T16:10:00Z";
  const observe = issueEvaluationLease({
    capability: "estate.observe.public",
    subject: "szl-frontier/operator",
    scope: ["github.public", "hf.public"],
    ttlSeconds: 3600,
    maxCalls: 32,
    allowedTargets: ["api.github.com", "huggingface.co"],
    nowIso: now,
  });
  const denied = {
    ...issueEvaluationLease({
      capability: "publisher.deploy",
      subject: "szl-frontier/operator",
      scope: ["a-11-oy.com"],
      ttlSeconds: 3600,
      maxCalls: 1,
      allowedTargets: ["a-11-oy.com"],
      nowIso: now,
    }),
    revoked: true,
    state: "REVOKED" as const,
  };
  return {
    schema: LEASE_SCHEMA,
    productionAuthorization: false as const,
    evidenceClass: "EVALUATION" as const,
    note: "Leases inspect and expire. They do not publish, train, or close #2189.",
    leases: [observe, denied],
  };
}
