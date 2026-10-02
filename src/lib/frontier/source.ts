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
    disposition: "HOLD" as const,
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
      "x-szl-disposition": "HOLD",
      "x-szl-production-authorization": "false",
    },
  });
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

export function sourcePayload(opts?: { deploymentSourceRevision?: string | null }) {
  const deployRaw = opts?.deploymentSourceRevision ?? null;
  const deploymentSourceRevision = classifySha(deployRaw) ? deployRaw : null;
  const deploymentSourceRevisionClass: HeadClass = deploymentSourceRevision ? "REACHABLE" : "UNAVAILABLE";
  const headMatch: HeadMatch = deploymentSourceRevision
    ? deploymentSourceRevision === SOURCE.reconciledHead
      ? "MATCH"
      : "DRIFT"
    : "UNAVAILABLE";
  return {
    schema: "szl.frontier.source-identity/v1",
    ...SOURCE,
    liveGitHubHead: null as string | null,
    liveGitHubHeadClass: "UNAVAILABLE" as HeadClass,
    deploymentSourceRevision,
    deploymentSourceRevisionClass,
    headMatch,
    semanticReviewComplete: false,
    sourceContentFilesRead: 0,
    fileAuditComplete: false,
    runtimeVerified: false,
    checkedAt: new Date().toISOString(),
    note: "reconciledHead is a MODELED inspection pin. deploymentSourceRevision is REACHABLE when /deployment.json is present. live GitHub HEAD stays UNAVAILABLE in this payload. Identity is not qualification.",
  };
}
