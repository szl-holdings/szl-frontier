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
  return canonicalNode(value, new Set<object>(), 0);
}

function canonicalNode(value: unknown, ancestors: Set<object>, depth: number): unknown {
  if (depth > 128) throw new EnvelopeError("JSON_DEPTH_LIMIT");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new EnvelopeError("NONFINITE_JSON_NUMBER");
    return value; // JSON intentionally represents -0 and 0 identically.
  }
  if (typeof value !== "object") throw new EnvelopeError("NON_JSON_VALUE");
  if (ancestors.has(value)) throw new EnvelopeError("CYCLIC_JSON_VALUE");
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null) {
    throw new EnvelopeError("NON_JSON_OBJECT");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
    throw new EnvelopeError("NON_JSON_KEY");
  }
  ancestors.add(value);
  try {
    if (array) {
      if (Object.keys(descriptors).length !== value.length + 1) throw new EnvelopeError("NON_JSON_ARRAY");
      const out: unknown[] = [];
      for (let index = 0; index < value.length; index++) {
        const descriptor = descriptors[String(index)];
        if (!descriptor?.enumerable || !("value" in descriptor)) throw new EnvelopeError("NON_JSON_ARRAY");
        out.push(canonicalNode(descriptor.value, ancestors, depth + 1));
      }
      return out;
    }
    const out: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(descriptors).sort()) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !("value" in descriptor)) throw new EnvelopeError("NON_JSON_PROPERTY");
      out[key] = canonicalNode(descriptor.value, ancestors, depth + 1);
    }
    return out;
  } finally {
    ancestors.delete(value);
  }
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
