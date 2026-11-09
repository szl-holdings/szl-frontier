/** Reconciled owner identity. Not a live Git observation by itself. */

export type HeadClass = "MODELED" | "REACHABLE" | "UNAVAILABLE";
export type HeadMatch = "MATCH" | "DRIFT" | "UNAVAILABLE";

const SHA1 = /^[0-9a-f]{40}$/;
const DEPLOYMENT_JSON_MAX_BYTES = 16 * 1024;
const DEPLOYMENT_JSON_TIMEOUT_MS = 5_000;
const DEPLOYMENT_SOURCE_SCHEMA = "szl.runtime-source/v1";
const DEPLOYMENT_SOURCE_AUTHORITY = "protected-github-source";

/**
 * Canonical provider origin for source readback. Hugging Face may pass an
 * internal proxy URL to a server handler; deriving the readback URL from that
 * request makes a live deployment report an unbound source even when its
 * public `/deployment.json` is healthy.
 */
export const DEPLOYMENT_SOURCE_ORIGIN = "https://szlholdings-szl-frontier.hf.space";
const DEPLOYMENT_SOURCE_HOST = new URL(DEPLOYMENT_SOURCE_ORIGIN).host.toLowerCase();

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/:443$/, "");
}

/**
 * Select the source readback origin for the current runtime. The provider's
 * forwarded host confirms the canonical Space deployment; local, preview, and
 * other deployments retain their own request URL.
 */
export function deploymentSourceRequestUrl(
  request: Pick<Request, "url" | "headers">,
): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0];
  const requestHost = forwardedHost ?? request.headers.get("host");
  return requestHost && normalizeHost(requestHost) === DEPLOYMENT_SOURCE_HOST
    ? `${DEPLOYMENT_SOURCE_ORIGIN}/api/source`
    : request.url;
}

interface DeploymentResponse {
  status: number;
  redirected: boolean;
  url: string;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
}

export type DeploymentTransport = (url: URL, init: RequestInit) => Promise<DeploymentResponse>;

async function readBoundedDeploymentBody(
  body: ReadableStream<Uint8Array> | null,
): Promise<Uint8Array | null> {
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > DEPLOYMENT_JSON_MAX_BYTES) {
        await reader.cancel("DEPLOYMENT_JSON_TOO_LARGE");
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  if (length < 1) return null;
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

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

/**
 * Read the deployment revision from this runtime's exact static endpoint.
 *
 * A revision string is identity evidence only after the transport stays on the
 * requested URL and the bounded response is valid JSON. Redirects are refused
 * before another request is sent; a successful HTTP response alone does not
 * bind source identity.
 */
export async function fetchDeploymentSourceRevision(
  requestUrl: string,
  transport: DeploymentTransport = (url, init) => fetch(url, init),
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEPLOYMENT_JSON_TIMEOUT_MS);
  try {
    const request = new URL(requestUrl);
    if (!/^https?:$/.test(request.protocol) || request.username || request.password) return null;
    const target = new URL("/deployment.json", request);
    const response = await transport(target, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status !== 200 || response.redirected || !response.url) return null;

    const finalUrl = new URL(response.url);
    if (finalUrl.href !== target.href) return null;
    const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "application/json") return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength !== null) {
      if (!/^\d+$/.test(contentLength)) return null;
      const declaredBytes = Number(contentLength);
      if (
        !Number.isSafeInteger(declaredBytes) ||
        declaredBytes < 1 ||
        declaredBytes > DEPLOYMENT_JSON_MAX_BYTES
      ) {
        return null;
      }
    }

    const bytes = await readBoundedDeploymentBody(response.body);
    if (!bytes) return null;
    if (contentLength !== null && Number(contentLength) !== bytes.byteLength) return null;
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const identity = body as Record<string, unknown>;
    if (
      identity.schema !== DEPLOYMENT_SOURCE_SCHEMA ||
      identity.source_repository !== SOURCE.repository ||
      identity.surface !== SOURCE.huggingfaceSpace ||
      identity.authority !== DEPLOYMENT_SOURCE_AUTHORITY
    ) {
      return null;
    }
    const sha = identity.source_revision;
    return typeof sha === "string" && classifySha(sha) ? sha : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
  const deploymentSourceRevisionClass: HeadClass = deploymentSourceRevision
    ? "REACHABLE"
    : "UNAVAILABLE";
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
