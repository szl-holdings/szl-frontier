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
    ok: true,
    kind: "SOFTWARE",
    organ: SOURCE.repository,
    disposition: "HOLD" as const,
    productionAuthorization: false,
    runtimeVerified: false,
    checkedAt: new Date().toISOString(),
    note: "Process is up. Health is not readiness, task quality, or production authorization.",
  };
}

export function readyPayload(opts: { catalogLoaded: boolean; engineHydratable: boolean }) {
  const operatorHydratable = opts.catalogLoaded && opts.engineHydratable;
  const blockers: string[] = [];
  if (!opts.catalogLoaded) blockers.push("CATALOG_NOT_LOADED");
  if (!opts.engineHydratable) blockers.push("ENGINE_NOT_HYDRATABLE");
  blockers.push("PRODUCTION_HOLD");
  return {
    schema: "szl.frontier.readiness/v1",
    status: (operatorHydratable ? "ready" : "not_ready") as ReadyStatus,
    ready: operatorHydratable,
    productionReady: false,
    catalogLoaded: opts.catalogLoaded,
    engineHydratable: opts.engineHydratable,
    blockers,
    reason: operatorHydratable
      ? "Operator plane hydratable. productionReady stays false."
      : blockers.join(","),
    productionAuthorization: false,
    checkedAt: new Date().toISOString(),
    note: "Readiness means the operator plane can run software gates. It does not authorize promotion. RUNNING is not ready.",
  };
}

export function sourcePayload() {
  return {
    schema: "szl.frontier.source-identity/v1",
    ...SOURCE,
    semanticReviewComplete: false,
    sourceContentFilesRead: 0,
    fileAuditComplete: false,
    runtimeVerified: false,
    checkedAt: new Date().toISOString(),
    note: "Source identity is not a live GitHub-to-deployment provenance proof.",
  };
}
