/** Receipt envelope. Presence is not authority. */

export const RECEIPT_ENVELOPE_SCHEMA = "szl.frontier.receipt-envelope/v1";

export type ReceiptKind =
  | "health"
  | "ready"
  | "source"
  | "triad"
  | "estate"
  | "cycle"
  | "codex"
  | "pin"
  | "completion";

export interface ReceiptEnvelope<T = unknown> {
  schema: typeof RECEIPT_ENVELOPE_SCHEMA;
  kind: ReceiptKind;
  digestSha256: string;
  producedAt: string;
  productionAuthorization: false;
  authority: "NONE";
  payload: T;
}

export class EnvelopeError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "EnvelopeError";
    this.code = code;
  }
}

export function stableCanonical(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    out[key] = canonicalize(input[key]);
  }
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sealReceipt<T>(opts: {
  kind: ReceiptKind;
  payload: T;
  producedAt?: string;
}): Promise<ReceiptEnvelope<T>> {
  const payload = opts.payload;
  if (
    payload &&
    typeof payload === "object" &&
    "productionAuthorization" in payload &&
    (payload as { productionAuthorization?: unknown }).productionAuthorization !== false
  ) {
    throw new EnvelopeError("PRODUCTION_AUTHORIZATION_FORBIDDEN");
  }
  const producedAt = opts.producedAt ?? new Date().toISOString();
  const digestSha256 = await sha256Hex(stableCanonical(payload));
  return {
    schema: RECEIPT_ENVELOPE_SCHEMA,
    kind: opts.kind,
    digestSha256,
    producedAt,
    productionAuthorization: false,
    authority: "NONE",
    payload,
  };
}

export function assertEnvelopeHolds(envelope: ReceiptEnvelope): void {
  if (envelope.schema !== RECEIPT_ENVELOPE_SCHEMA) throw new EnvelopeError("ENVELOPE_SCHEMA");
  if (envelope.productionAuthorization !== false) throw new EnvelopeError("PRODUCTION_AUTHORIZATION_FORBIDDEN");
  if (envelope.authority !== "NONE") throw new EnvelopeError("AUTHORITY_NOT_NONE");
}

export function envelopeGrantsAuthority(_envelope: ReceiptEnvelope): false {
  return false;
}
