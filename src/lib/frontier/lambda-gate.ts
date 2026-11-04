export const EVIDENCE_STATES = [
  "MEASURED",
  "BLOCKED",
  "INVALID",
  "FAILED",
  "UNAVAILABLE",
  "STALE",
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const VERDICTS = ["HARD_DENY", "DENY_DEFAULT", "LAMBDA_VETO", "ESCALATE", "ALLOW"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LAMBDA_POSTURE = "CONJECTURE_1";
export const DEFAULT_THRESHOLD = 0.7;

export class GateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateError";
  }
}

export interface AxisEvidence {
  name: string;
  value: number | null;
  status: EvidenceState;
  required: boolean;
  weight: number;
  sourceRef?: string | null;
  observedAt?: string | null;
  expiryAt?: string | null;
  note?: string | null;
}

export interface GateResult {
  verdict: Verdict;
  lambdaScore: number | null;
  arithmeticScore: number | null;
  threshold: number;
  reasonCodes: string[];
  state: "BLOCKED" | "EVALUATED";
  gaps: string[];
  arithmeticWouldAllow: boolean;
  divergent: boolean;
  lambda: typeof LAMBDA_POSTURE;
  lambdaNeverATheorem: true;
  shadowExecutable: false;
}

// Strict RFC 3339 subset; an explicit offset is required. Mirrors
// python/szl_frontier/lambda_gate.py::_parse_iso, which refuses offset-less
// timestamps. Calendar-invalid dates (e.g. 2026-02-30) are refused rather than
// rolled over the way Date.parse would.
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;

function parseIso(value: string): Date | null {
  const m = RFC3339.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number) as number[];
  const cal = new Date(Date.UTC(y!, mo! - 1, d!));
  if (cal.getUTCFullYear() !== y || cal.getUTCMonth() !== mo! - 1 || cal.getUTCDate() !== d) return null;
  if (h! > 23 || mi! > 59 || s! > 59) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidAxis(axis: AxisEvidence, now = new Date()): boolean {
  if (axis.status !== "MEASURED") return false;
  if (axis.value === null || !Number.isFinite(axis.value)) return false;
  if (axis.value < 0 || axis.value > 1) return false;
  if (axis.expiryAt) {
    const expiry = parseIso(axis.expiryAt);
    if (expiry === null || expiry.getTime() <= now.getTime()) return false;
  }
  return true;
}

export function weightedGeometricMean(values: number[], weights: number[]): number {
  if (!values.length || values.length !== weights.length) {
    throw new GateError("geometric mean requires matching non-empty values and weights");
  }
  if (values.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new GateError("geometric mean rejects non-finite or negative values");
  }
  if (weights.some((w) => !Number.isFinite(w) || w <= 0)) {
    throw new GateError("geometric mean requires finite positive weights");
  }
  if (values.some((v) => v === 0)) return 0;
  // Scaling every weight by the same positive factor preserves the mean.
  // Do this before multiplication: finite weights can overflow their sum or
  // underflow weighted logs, incorrectly turning an axis below threshold into 1.
  const scale = weights.reduce((largest, weight) => Math.max(largest, weight), 0);
  const scaledWeights = weights.map((weight) => weight / scale);
  const total = scaledWeights.reduce((a, b) => a + b, 0);
  const logSum = values.reduce((acc, v, i) => acc + scaledWeights[i]! * Math.log(v), 0);
  return Math.exp(logSum / total);
}

export function weightedArithmeticMean(values: number[], weights: number[]): number {
  if (!values.length || values.length !== weights.length) {
    throw new GateError("arithmetic mean requires matching non-empty values and weights");
  }
  if (values.some((v) => !Number.isFinite(v)) || weights.some((w) => !Number.isFinite(w) || w <= 0)) {
    throw new GateError("arithmetic mean requires finite values and positive weights");
  }
  const total = weights.reduce((a, b) => a + b, 0);
  return values.reduce((acc, v, i) => acc + v * weights[i]!, 0) / total;
}

function classifyGap(axis: AxisEvidence, now: Date): string {
  if (
    axis.value === null ||
    (typeof axis.value === "number" && (!Number.isFinite(axis.value) || axis.value < 0 || axis.value > 1))
  ) {
    if (axis.status === "MEASURED" && axis.value !== null) return `INVALID_AXIS:${axis.name}`;
    return `MISSING_AXIS:${axis.name}`;
  }
  if (axis.expiryAt) {
    const expiry = parseIso(axis.expiryAt);
    if (expiry === null) return `INVALID_AXIS:${axis.name}`;
    if (expiry.getTime() <= now.getTime()) return `STALE_AXIS:${axis.name}`;
  }
  if (axis.status !== "MEASURED") return `MISSING_AXIS:${axis.name}`;
  return `INVALID_AXIS:${axis.name}`;
}

export function evaluateLambdaGate(
  axes: AxisEvidence[],
  opts: { threshold?: number; now?: Date } = {},
): GateResult {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const now = opts.now ?? new Date();
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    throw new GateError("threshold must be in (0, 1]");
  }
  const required = axes.filter((a) => a.required);
  if (!required.length) throw new GateError("at least one required axis is required");

  const reasonCodes: string[] = [];
  const gaps: string[] = [];
  for (const axis of required) {
    if (!isValidAxis(axis, now)) {
      reasonCodes.push(classifyGap(axis, now));
      gaps.push(axis.name);
    }
  }

  if (reasonCodes.length) {
    const hard = reasonCodes.some((c) => c.startsWith("INVALID_AXIS:") || c.startsWith("MISSING_AXIS:"));
    return {
      verdict: hard ? "HARD_DENY" : "DENY_DEFAULT",
      lambdaScore: null,
      arithmeticScore: null,
      threshold,
      reasonCodes,
      state: "BLOCKED",
      gaps,
      arithmeticWouldAllow: false,
      divergent: false,
      lambda: LAMBDA_POSTURE,
      lambdaNeverATheorem: true,
      shadowExecutable: false,
    };
  }

  const values = required.map((a) => a.value as number);
  const weights = required.map((a) => a.weight);
  const lam = weightedGeometricMean(values, weights);
  // Gate values are validated in [0,1]. Keep weight scaling here: in the
  // standalone arithmetic helper, an unbounded value can offset a tiny weight.
  const weightScale = weights.reduce((largest, weight) => Math.max(largest, weight), 0);
  const scaledWeights = weights.map((weight) => weight / weightScale);
  const totalWeight = scaledWeights.reduce((a, b) => a + b, 0);
  const ari = values.reduce((acc, value, i) => acc + value * scaledWeights[i]!, 0) / totalWeight;
  const arithmeticWouldAllow = ari >= threshold;
  let verdict: Verdict;
  if (lam === 0) verdict = "LAMBDA_VETO";
  else if (lam >= threshold) verdict = "ALLOW";
  else verdict = "ESCALATE";

  return {
    verdict,
    lambdaScore: lam,
    arithmeticScore: ari,
    threshold,
    reasonCodes: [],
    state: "EVALUATED",
    gaps: [],
    arithmeticWouldAllow,
    divergent: arithmeticWouldAllow !== (verdict === "ALLOW"),
    lambda: LAMBDA_POSTURE,
    lambdaNeverATheorem: true,
    shadowExecutable: false,
  };
}

export function sealCompleteness(axes: AxisEvidence[], now = new Date()): AxisEvidence[] {
  const requiredOthers = axes.filter((a) => a.required && a.name !== "evidence_completeness");
  const complete = requiredOthers.every((a) => isValidAxis(a, now));
  return axes.map((axis) =>
    axis.name === "evidence_completeness"
      ? {
          ...axis,
          value: complete ? 1 : 0,
          status: "MEASURED",
          note: "1 only when every other required axis is valid MEASURED; else zero-veto",
        }
      : axis,
  );
}
