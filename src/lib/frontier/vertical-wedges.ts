/** Checked-in vertical wedges. A row is a named incumbent, not a comparison. */

export class VerticalWedgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerticalWedgeError";
  }
}

export const REQUIRED_VERTICAL_WEDGES = [
  "vertical-a11oy-langgraph",
  "vertical-killinchu-dedrone",
  "vertical-immune-wiz",
  "vertical-ayllu-harvey",
  "vertical-terra-costar",
  "vertical-finance-bloomberg",
  "vertical-lyte-honeycomb",
  "vertical-vessels-windward",
  "vertical-sentra-opa",
  "vertical-khipu-sigstore",
  "vertical-second-brain-elasticsearch",
  "vertical-retrieval-mteb",
  "vertical-router-litellm",
  "vertical-lean-mathlib",
  "vertical-yarqa-openfoam",
  "vertical-hatun-mcp",
  "vertical-forge-unsloth",
] as const;

const REFUSED_PHRASES = ["state-of-the-art", "state of the art", "beats the incumbent", "unicorn"];

export type VerticalWedge = {
  id: (typeof REQUIRED_VERTICAL_WEDGES)[number];
  incumbent: string;
  refused: string;
  status: "HOLD";
  comparison: "NOT_RUN";
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VerticalWedgeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new VerticalWedgeError(`${label} must be text`);
  }
  return value.trim();
}

function refusedBlob(entry: Record<string, unknown>): string {
  const parts = [entry.claim, entry.limitation, entry.adaptation];
  const rejected = entry.rejectedAlternatives;
  if (Array.isArray(rejected)) parts.push(...rejected);
  return parts.map((part) => (typeof part === "string" ? part : "")).join("\n").toLowerCase();
}

export function readVerticalWedges(raw: string): VerticalWedge[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VerticalWedgeError("register JSON is unreadable");
  }
  const register = asRecord(parsed, "register");
  if (register.productionPromotion !== false) {
    throw new VerticalWedgeError("production promotion stays false");
  }
  if (!Array.isArray(register.entries)) {
    throw new VerticalWedgeError("entries must be a list");
  }
  const found = new Map<string, VerticalWedge>();
  for (const item of register.entries) {
    const entry = asRecord(item, "entry");
    const id = asText(entry.id, "entry id");
    if (!id.startsWith("vertical-")) continue;
    if (entry.status !== "HOLD") {
      throw new VerticalWedgeError(`${id} stays HOLD`);
    }
    const experiment = asText(entry.validationExperiment, `${id} validation`);
    if (!experiment.includes("NOT_RUN")) {
      throw new VerticalWedgeError(`${id} comparison stays NOT_RUN`);
    }
    const blob = refusedBlob(entry);
    if (REFUSED_PHRASES.some((phrase) => blob.includes(phrase))) {
      throw new VerticalWedgeError(`${id} cannot claim superiority`);
    }
    if (!REQUIRED_VERTICAL_WEDGES.includes(id as VerticalWedge["id"])) {
      throw new VerticalWedgeError(`${id} is not a known wedge`);
    }
    if (found.has(id)) throw new VerticalWedgeError(`duplicate ${id}`);
    found.set(id, {
      id: id as VerticalWedge["id"],
      incumbent: asText(entry.authorMaintainer, `${id} incumbent`),
      refused: asText(entry.limitation, `${id} limitation`),
      status: "HOLD",
      comparison: "NOT_RUN",
    });
  }
  return REQUIRED_VERTICAL_WEDGES.map((id) => {
    const wedge = found.get(id);
    if (!wedge) throw new VerticalWedgeError(`missing ${id}`);
    return wedge;
  });
}
