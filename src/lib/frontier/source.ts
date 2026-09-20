/** Reconciled owner identity. Not a live Git observation by itself. */
export const SOURCE = {
  product: "szl-frontier",
  organization: "szl-holdings",
  repository: "szl-holdings/szl-frontier",
  huggingfaceSpace: "SZLHOLDINGS/szl-frontier",
  productOrigin: "https://a-11-oy.com",
  proofOrigin: "https://a11oy.net",
  doctrine: "v11 LOCKED",
  lambda: "CONJECTURE_1",
  license: "Apache-2.0",
  /** Exact main head inspected at session start. */
  reconciledHead: "b3aee6443b484768d1de107449918a050fe8528d",
  reconciledAt: "2026-09-20T11:26:13Z",
  productionAuthorization: false,
  productionDisposition: "HOLD",
  trainingAdmission: false,
  paidWorkloadBudgetUsd: 0,
} as const;

export type HealthStatus = "ok" | "degraded";
export type ReadyStatus = "ready" | "not_ready";

export function healthPayload() {
  return {
    schema: "szl.frontier.health/v1",
    status: "ok" as HealthStatus,
    kind: "SOFTWARE",
    productionAuthorization: false,
    checkedAt: new Date().toISOString(),
    note: "Process is up. Health is not readiness, task quality, or production authorization.",
  };
}

export function readyPayload(opts: { catalogLoaded: boolean; engineHydratable: boolean }) {
  const ready = opts.catalogLoaded && opts.engineHydratable;
  return {
    schema: "szl.frontier.readiness/v1",
    status: (ready ? "ready" : "not_ready") as ReadyStatus,
    catalogLoaded: opts.catalogLoaded,
    engineHydratable: opts.engineHydratable,
    productionAuthorization: false,
    checkedAt: new Date().toISOString(),
    note: "Readiness means the operator plane can run software gates. It does not authorize promotion.",
  };
}

export function sourcePayload() {
  return {
    schema: "szl.frontier.source-identity/v1",
    ...SOURCE,
    checkedAt: new Date().toISOString(),
    note: "Source identity is not a live GitHub-to-deployment provenance proof.",
  };
}
