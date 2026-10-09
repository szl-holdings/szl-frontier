/** Reconciled owner identity. Not a live Git observation by itself. */

export type HeadClass = "MODELED" | "REACHABLE" | "UNAVAILABLE";
export type HeadMatch = "MATCH" | "DRIFT" | "UNAVAILABLE";

const SHA1 = /^[0-9a-f]{40}$/;

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
  /** Frozen inspection pin from operator-plane open (PR #190). MODELED, not live HEAD. */
  reconciledHead: "b3aee6443b484768d1de107449918a050fe8528d",
  reconciledAt: "2026-09-20T11:26:13Z",
  reconciledHeadClass: "MODELED" as HeadClass,
  softwareState: "OPERATIONAL",
  productionAuthorization: false,
  productionDisposition: "HOLD",
  trainingAdmission: false,
  paidWorkloadBudgetUsd: 0,
} as const;

export function classifySha(value: string | null | undefined): value is string {
  return typeof value === "string" && SHA1.test(value);
}

export type HealthStatus = "ok" | "degraded";
export type ReadyStatus = "ready" | "not_ready";

export function healthPayload() {
  return {
    schema: "szl.frontier.health/v1",
    status: "ok" as HealthStatus,
    ok: true,
    kind: "SOFTWARE",
    organ: SOURCE.repository,
    operational: true,
    softwareState: SOURCE.softwareState,
    disposition: "HOLD" as const,
    productionDisposition: SOURCE.productionDisposition,
    productionAuthorization: false,
    runtimeVerified: false,
    checkedAt: new Date().toISOString(),
    note: "Process is up. Health is not readiness, task quality, or production authorization.",
  };
}

/**
 * Liveness response shared by `/api/health` and the `/healthz` probe route that
 * the Hugging Face Space and the container HEALTHCHECK call. Liveness only.
 */
export function healthResponse(): Response {
  return new Response(JSON.stringify(healthPayload()), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-szl-kind": "health",
      "x-szl-software-state": SOURCE.softwareState,
      "x-szl-disposition": "HOLD",
      "x-szl-production-disposition": SOURCE.productionDisposition,
      "x-szl-production-authorization": "false",
    },
  });
}

export function readyPayload(opts: { catalogLoaded: boolean; engineHydratable: boolean }) {
  const operatorHydratable = opts.catalogLoaded && opts.engineHydratable;
  const operationalBlockers: string[] = [];
  if (!opts.catalogLoaded) operationalBlockers.push("CATALOG_NOT_LOADED");
  if (!opts.engineHydratable) operationalBlockers.push("ENGINE_NOT_HYDRATABLE");
  const productionBlockers = ["PRODUCTION_HOLD"] as const;
  const blockers = [...operationalBlockers, ...productionBlockers];
  return {
    schema: "szl.frontier.readiness/v1",
    status: (operatorHydratable ? "ready" : "not_ready") as ReadyStatus,
    ready: operatorHydratable,
    operationalReady: operatorHydratable,
    softwareState: SOURCE.softwareState,
    productionReady: false,
    productionDisposition: SOURCE.productionDisposition,
    catalogLoaded: opts.catalogLoaded,
    engineHydratable: opts.engineHydratable,
    blockers,
    operationalBlockers,
    productionBlockers,
    reason: operatorHydratable
      ? "Operator plane hydratable. productionReady stays false."
      : blockers.join(","),
    productionAuthorization: false,
    checkedAt: new Date().toISOString(),
    note: "Readiness means the operator plane can run software gates. It does not authorize promotion. RUNNING is not ready.",
  };
}

export function sourcePayload(opts?: { deploymentSourceRevision?: string | null }) {
  const deployRaw = opts?.deploymentSourceRevision ?? null;
  const deploymentSourceRevision = classifySha(deployRaw) ? deployRaw : null;
  const deploymentSourceRevisionClass: HeadClass = deploymentSourceRevision ? "REACHABLE" : "UNAVAILABLE";
  const reconciledPinMatch: HeadMatch = deploymentSourceRevision
    ? deploymentSourceRevision === SOURCE.reconciledHead
      ? "MATCH"
      : "DRIFT"
    : "UNAVAILABLE";
  // A MODELED inspection pin is not a live GitHub HEAD. Without a live HEAD,
  // deployed-vs-current source parity is UNAVAILABLE rather than falsely DRIFT.
  const headMatch: HeadMatch = "UNAVAILABLE";
  return {
    schema: "szl.frontier.source-identity/v1",
    ...SOURCE,
    liveGitHubHead: null as string | null,
    liveGitHubHeadClass: "UNAVAILABLE" as HeadClass,
    deploymentSourceRevision,
    deploymentSourceRevisionClass,
    deploymentSourceBound: deploymentSourceRevision !== null,
    reconciledPinMatch,
    headMatch,
    softwareState: SOURCE.softwareState,
    semanticReviewComplete: false,
    sourceContentFilesRead: 0,
    fileAuditComplete: false,
    runtimeVerified: false,
    checkedAt: new Date().toISOString(),
    note: "reconciledHead is a MODELED inspection pin, not live HEAD. deploymentSourceRevision is source-bound when /deployment.json is present. Current deployed-vs-GitHub parity stays UNAVAILABLE until liveGitHubHead is independently observed. Identity is not qualification.",
  };
}
