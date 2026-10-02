/** MODELED flotation rank before the bench. recoveryPercent stays null. */

import { createHash } from "node:crypto";

export const FLOTATION_SCHEMA = "szl.frontier.flotation-selectivity.v1";
export const FLOTATION_ORGAN = "flotation-selectivity-before-bench";
export const PRIOR_NEEDED = [
  "homo_lumo_gap_eV",
  "dipole_D",
  "surface_charge",
  "pH",
  "collector_mM",
] as const;
export const DEFAULT_TAU = 0.15;
const DEFAULT_SCORE_COLUMNS = ["public_score", "screen_score"] as const;
const FORBIDDEN_TOKENS = new Set(["recovery", "grade", "selectivity"]);
const ID_COLUMNS = ["id", "reagent", "name"] as const;

export type FlotationReceipt = {
  schema: typeof FLOTATION_SCHEMA;
  organ: typeof FLOTATION_ORGAN;
  evidenceTier: "SOFTWARE_RECEIPT";
  directive: "DEFER" | "RELEASE" | "BLOCK";
  selectivity: "MODELED";
  claims: {
    execution: "SOFTWARE";
    identity: "MEASURED" | "UNAVAILABLE";
    input: "MEASURED" | "UNAVAILABLE";
    policy: "MEASURED";
  };
  tableSha256: string | null;
  benchSha256: string | null;
  scoreColumn: string | null;
  rankBand: Array<{ id: string; rank: number; band: string }> | null;
  rowCount: number;
  recoveryPercent: null;
  note: string;
  energyClass: "UNAVAILABLE";
  ato: false;
  lambda: "OPEN";
  trustCeiling: 0.97;
  discourse: "REPORTED topic 412";
  nexusOrgan: false;
  mintNexusSpace: false;
  exhibitOnApex: false;
  prior: SelectivityPrior;
};

export type SelectivityPrior = {
  state: "UNAVAILABLE" | "ABSTAIN" | "PRIOR_ONLY";
  reason: string;
  missing: string[];
  S: number | null;
  S_class: "SIMULATED" | "UNAVAILABLE";
  not: "flotation recovery";
  tau: number | null;
};

export class FlotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlotationError";
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function norm(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function forbidden(name: string): boolean {
  const tokens = new Set(norm(name).split("_").filter(Boolean));
  for (const token of FORBIDDEN_TOKENS) {
    if (tokens.has(token)) return true;
  }
  return false;
}

function finite(text: string): number | null {
  const raw = text.trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
}

function band(index: number, count: number): string {
  if (count < 3) return "listed";
  const cut = count / 3;
  if (index < cut) return "high";
  if (index < 2 * cut) return "mid";
  return "low";
}

function baseReceipt(): FlotationReceipt {
  return {
    schema: FLOTATION_SCHEMA,
    organ: FLOTATION_ORGAN,
    evidenceTier: "SOFTWARE_RECEIPT",
    directive: "DEFER",
    selectivity: "MODELED",
    claims: {
      execution: "SOFTWARE",
      identity: "UNAVAILABLE",
      input: "UNAVAILABLE",
      policy: "MEASURED",
    },
    tableSha256: null,
    benchSha256: null,
    scoreColumn: null,
    rankBand: null,
    rowCount: 0,
    recoveryPercent: null,
    note: "rank band only; no invented recovery",
    energyClass: "UNAVAILABLE",
    ato: false,
    lambda: "OPEN",
    trustCeiling: 0.97,
    discourse: "REPORTED topic 412",
    nexusOrgan: false,
    mintNexusSpace: false,
    exhibitOnApex: false,
    prior: {
      state: "UNAVAILABLE",
      reason: "prior not requested",
      missing: [],
      S: null,
      S_class: "UNAVAILABLE",
      not: "flotation recovery",
      tau: null,
    },
  };
}

export function selectivityPrior(
  features: Record<string, unknown> | null,
  weights: Record<string, unknown> | null,
  tau = DEFAULT_TAU,
): SelectivityPrior {
  const source = features ?? {};
  const missing = PRIOR_NEEDED.filter((key) => source[key] == null);
  if (missing.length > 0 || !weights || Object.keys(weights).length === 0) {
    return {
      state: "ABSTAIN",
      reason: "missing descriptor or unset weights",
      missing,
      S: null,
      S_class: "UNAVAILABLE",
      not: "flotation recovery",
      tau,
    };
  }
  let z = 0;
  try {
    for (const key of PRIOR_NEEDED) {
      const w = Number(weights[key]);
      const x = Number(source[key]);
      if (!Number.isFinite(w) || !Number.isFinite(x)) {
        return {
          state: "ABSTAIN",
          reason: "missing descriptor or unset weights",
          missing,
          S: null,
          S_class: "UNAVAILABLE",
          not: "flotation recovery",
          tau,
        };
      }
      z += w * x;
    }
  } catch {
    return {
      state: "ABSTAIN",
      reason: "missing descriptor or unset weights",
      missing,
      S: null,
      S_class: "UNAVAILABLE",
      not: "flotation recovery",
      tau,
    };
  }
  const s = 1 / (1 + 2.718281828 ** -z);
  if (Math.abs(2 * s - 1) < tau) {
    return {
      state: "ABSTAIN",
      reason: `|2S-1|<${tau}`,
      missing: [],
      S: Math.round(s * 1e6) / 1e6,
      S_class: "SIMULATED",
      not: "flotation recovery",
      tau,
    };
  }
  return {
    state: "PRIOR_ONLY",
    reason: "unitless prior; not recovery",
    missing: [],
    S: Math.round(s * 1e6) / 1e6,
    S_class: "SIMULATED",
    not: "flotation recovery",
    tau,
  };
}

function parseCsv(text: string): { fields: string[]; rows: Array<Record<string, string>> } {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    throw new FlotationError("reagent table has no header");
  }
  const fields = lines[0].split(",").map((field) => field.trim());
  if (fields.length === 0 || fields.every((field) => field === "")) {
    throw new FlotationError("reagent table has no header");
  }
  const rows: Array<Record<string, string>> = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    let nonempty = false;
    fields.forEach((field, index) => {
      const value = (cells[index] ?? "").trim();
      row[field] = value;
      if (value !== "") nonempty = true;
    });
    if (nonempty) rows.push(row);
  }
  return { fields, rows };
}

function column(fields: string[], wanted: string): string | undefined {
  const target = norm(wanted);
  return fields.find((field) => norm(field) === target);
}

export function buildReceiptFromCsv(
  tableText: string | null = null,
  benchText: string | null = null,
  scoreColumn: string | null = null,
  features: Record<string, unknown> | null = null,
  weights: Record<string, unknown> | null = null,
  tau = DEFAULT_TAU,
): FlotationReceipt {
  const receipt = baseReceipt();
  if (features !== null || weights !== null) {
    receipt.prior = selectivityPrior(features, weights, tau);
  }
  if (tableText === null || tableText.trim() === "") {
    if (features === null && weights === null) {
      throw new FlotationError("need a reagent table or a descriptor prior");
    }
    receipt.note = "PRIOR path; no reagent table; recovery not invented";
    return receipt;
  }
  receipt.tableSha256 = sha256(utf8(tableText));
  receipt.claims.identity = "MEASURED";

  if (benchText !== null) {
    receipt.benchSha256 = sha256(utf8(benchText));
    receipt.claims.input = "MEASURED";
  }

  if (scoreColumn !== null && forbidden(scoreColumn)) {
    receipt.directive = "BLOCK";
    receipt.scoreColumn = norm(scoreColumn);
    receipt.note = "refused recovery, grade, or selectivity column";
    return receipt;
  }

  let fields: string[];
  let rows: Array<Record<string, string>>;
  try {
    const parsed = parseCsv(tableText);
    fields = parsed.fields;
    rows = parsed.rows;
  } catch (err) {
    receipt.note = err instanceof FlotationError ? err.message : "table unreadable";
    return receipt;
  }

  let chosen: string | undefined;
  if (scoreColumn !== null) {
    chosen = column(fields, scoreColumn);
    if (!chosen) {
      receipt.note = "declared score column is not in the table";
      return receipt;
    }
  } else {
    for (const candidate of DEFAULT_SCORE_COLUMNS) {
      chosen = column(fields, candidate);
      if (chosen) break;
    }
  }
  if (!chosen) {
    receipt.note = "no declared public score column";
    return receipt;
  }
  if (forbidden(chosen)) {
    receipt.directive = "BLOCK";
    receipt.scoreColumn = norm(chosen);
    receipt.note = "refused recovery, grade, or selectivity column";
    return receipt;
  }

  let idField: string | undefined;
  for (const name of ID_COLUMNS) {
    idField = column(fields, name);
    if (idField) break;
  }
  if (!idField) {
    receipt.scoreColumn = chosen;
    receipt.note = "reagent table needs an id, reagent, or name column";
    return receipt;
  }

  const parsed: Array<[string, number]> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const reagentId = (row[idField] ?? "").trim();
    if (reagentId === "") {
      receipt.scoreColumn = chosen;
      receipt.note = "blank reagent id";
      return receipt;
    }
    if (seen.has(reagentId)) {
      receipt.scoreColumn = chosen;
      receipt.note = "duplicate reagent id";
      return receipt;
    }
    seen.add(reagentId);
    const score = finite(row[chosen] ?? "");
    if (score === null) {
      receipt.scoreColumn = chosen;
      receipt.note = "score column is not finite";
      return receipt;
    }
    parsed.push([reagentId, score]);
  }

  if (parsed.length === 0) {
    receipt.scoreColumn = chosen;
    receipt.note = "no reagent rows";
    return receipt;
  }

  parsed.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  receipt.scoreColumn = chosen;
  receipt.rowCount = parsed.length;
  receipt.rankBand = parsed.map(([id], index) => ({
    id,
    rank: index + 1,
    band: band(index, parsed.length),
  }));
  if (receipt.benchSha256 !== null) {
    receipt.directive = "RELEASE";
    receipt.note = "rank band from declared public score; bench hashed; recovery not invented";
  } else {
    receipt.directive = "DEFER";
    receipt.note = "MODELED rank band; bench CSV absent; recovery not invented";
  }
  return receipt;
}
