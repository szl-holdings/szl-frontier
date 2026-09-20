/** Fail-closed health ≠ ready ≠ source. Running is not ready. Health is not success. */
import { healthPayload, readyPayload, sourcePayload } from "./source";
import { sealReceipt, type ReceiptEnvelope } from "./receipt-envelope";

export const TRIAD_SCHEMA = "szl.frontier.triad/v1";
export const SPACE_TRIAD_CONTRACT = "szl.frontier.space-triad-contract/v1";

export class TriadError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TriadError";
  }
}

export const SPACE_TRIAD_SURFACES = [
  "SZLHOLDINGS/a11oy",
  "SZLHOLDINGS/killinchu",
  "SZLHOLDINGS/counsel",
  "SZLHOLDINGS/terra",
  "SZLHOLDINGS/sentra",
  "SZLHOLDINGS/finance",
  "SZLHOLDINGS/lyte",
  "SZLHOLDINGS/vertical-services",
  "SZLHOLDINGS/szl-command-lab",
  "SZLHOLDINGS/david-leads",
  "SZLHOLDINGS/szl-constellation",
  "SZLHOLDINGS/szl-frontier",
  "SZLHOLDINGS/szl-model-inference-lab",
  "SZLHOLDINGS/immune-lattice",
  "SZLHOLDINGS/immune",
  "SZLHOLDINGS/ayllu",
  "SZLHOLDINGS/yarqa",
  "SZLHOLDINGS/szl-atelier",
  "SZLHOLDINGS/holographic-unify",
  "SZLHOLDINGS/szl-khipu",
  "SZLHOLDINGS/llm-router-live",
] as const;

export function assertTriadDistinct(
  health: ReturnType<typeof healthPayload>,
  ready: ReturnType<typeof readyPayload>,
  source: ReturnType<typeof sourcePayload>,
): void {
  if (health.schema === ready.schema) throw new TriadError("HEALTH_READY_SCHEMA_COLLAPSE");
  if (health.schema === source.schema) throw new TriadError("HEALTH_SOURCE_SCHEMA_COLLAPSE");
  if (ready.schema === source.schema) throw new TriadError("READY_SOURCE_SCHEMA_COLLAPSE");
  if (health.productionAuthorization !== false) throw new TriadError("HEALTH_AUTHORIZATION");
  if (ready.productionAuthorization !== false) throw new TriadError("READY_AUTHORIZATION");
  if (source.productionAuthorization !== false) throw new TriadError("SOURCE_AUTHORIZATION");
  if (ready.productionReady !== false) throw new TriadError("PRODUCTION_READY_OVERCLAIM");
  if (health.ok === true && ready.productionReady === true) {
    throw new TriadError("HEALTH_IMPLIES_PRODUCTION_READY");
  }
  if (source.semanticReviewComplete !== false) throw new TriadError("SOURCE_REVIEW_OVERCLAIM");
  if (source.sourceContentFilesRead !== 0) throw new TriadError("SOURCE_FILES_OVERCLAIM");
  if (source.fileAuditComplete !== false) throw new TriadError("FILE_AUDIT_OVERCLAIM");
}

export function spaceTriadContract() {
  return {
    schema: SPACE_TRIAD_CONTRACT,
    productionAuthorization: false,
    runtimeVerified: false,
    sourceContentFilesRead: 0,
    expectedEndpoints: ["/health", "/ready", "/source"] as const,
    surfaces: SPACE_TRIAD_SURFACES.map((id) => ({
      id,
      expected: ["/health", "/ready", "/source"] as const,
      runtimeVerified: false,
      note: "Expected endpoints. List membership is not a live probe and RUNNING is not ready.",
    })),
    note: "This is a contract inventory for existing Spaces. It does not mutate Space repos and does not qualify runtimes.",
  };
}

export async function composeTriad(opts: {
  catalogLoaded: boolean;
  engineHydratable: boolean;
}): Promise<{
  schema: typeof TRIAD_SCHEMA;
  productionAuthorization: false;
  health: ReturnType<typeof healthPayload>;
  ready: ReturnType<typeof readyPayload>;
  source: ReturnType<typeof sourcePayload>;
  spaces: ReturnType<typeof spaceTriadContract>;
  envelopes: {
    health: ReceiptEnvelope<ReturnType<typeof healthPayload>>;
    ready: ReceiptEnvelope<ReturnType<typeof readyPayload>>;
    source: ReceiptEnvelope<ReturnType<typeof sourcePayload>>;
  };
}> {
  const health = healthPayload();
  const ready = readyPayload(opts);
  const source = sourcePayload();
  assertTriadDistinct(health, ready, source);
  const spaces = spaceTriadContract();
  return {
    schema: TRIAD_SCHEMA,
    productionAuthorization: false,
    health,
    ready,
    source,
    spaces,
    envelopes: {
      health: await sealReceipt({ kind: "health", payload: health }),
      ready: await sealReceipt({ kind: "ready", payload: ready }),
      source: await sealReceipt({ kind: "source", payload: source }),
    },
  };
}
