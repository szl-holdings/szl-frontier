// SPDX-License-Identifier: Apache-2.0
/** SOFTWARE Λ aggregator for the UI. Never a theorem. Mirrors python/szl_frontier/lambda_gate.py */

export const LAMBDA_POSTURE = "CONJECTURE_1";
export const VERDICTS = [
  "HARD_DENY",
  "DENY_DEFAULT",
  "LAMBDA_VETO",
  "ESCALATE",
  "ALLOW",
] as const;
export type Verdict = (typeof VERDICTS)[number];

export type AxisEvidence = {
  name: string;
  value: number | null;
  status: string;
  required: boolean;
  weight: number;
  expiryAt?: string | null;
};

export type GateResult = {
  verdict: Verdict;
  lambdaScore: number | null;
  arithmeticScore: number | null;
  threshold: number;
  reasonCodes: string[];
  gaps: string[];
  arithmeticWouldAllow: boolean;
  divergent: boolean;
};

export function weightedGeometricMean(values: number[], weights: number[]): number {
  if (!values.length || values.length !== weights.length) {
    throw new Error("geometric mean requires matching non-empty values and weights");
  }
  if (values.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error("geometric mean rejects non-finite or negative values");
  }
  if (weights.some((w) => !Number.isFinite(w) || w <= 0)) {
    throw new Error("geometric mean requires finite positive weights");
  }
  if (values.some((v) => v === 0)) return 0;
  const total = weights.reduce((a, b) => a + b, 0);
  const logSum = values.reduce((acc, v, i) => acc + weights[i] * Math.log(v), 0);
  return Math.exp(logSum / total);
}

export function weightedArithmeticMean(values: number[], weights: number[]): number {
  if (!values.length || values.length !== weights.length) {
    throw new Error("arithmetic mean requires matching non-empty values and weights");
  }
  const total = weights.reduce((a, b) => a + b, 0);
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / total;
}

function axisValid(axis: AxisEvidence, now: Date): boolean {
  if (axis.status !== "MEASURED") return false;
  if (axis.value === null || !Number.isFinite(axis.value)) return false;
  if (axis.value < 0 || axis.value > 1) return false;
  if (axis.expiryAt) {
    const exp = Date.parse(axis.expiryAt);
    if (!Number.isFinite(exp) || exp <= now.getTime()) return false;
  }
  return true;
}

function classifyGap(axis: AxisEvidence, now: Date): string {
  if (
    axis.value === null ||
    (typeof axis.value === "number" &&
      (!Number.isFinite(axis.value) || axis.value < 0 || axis.value > 1))
  ) {
    if (axis.status === "MEASURED" && axis.value !== null) return `INVALID_AXIS:${axis.name}`;
    return `MISSING_AXIS:${axis.name}`;
  }
  if (axis.expiryAt) {
    const exp = Date.parse(axis.expiryAt);
    if (!Number.isFinite(exp) || exp <= now.getTime()) return `STALE_AXIS:${axis.name}`;
  }
  if (axis.status !== "MEASURED") return `MISSING_AXIS:${axis.name}`;
  return `INVALID_AXIS:${axis.name}`;
}

export function evaluateLambdaGate(
  axes: AxisEvidence[],
  threshold = 0.7,
  now = new Date(),
): GateResult {
  const required = axes.filter((a) => a.required);
  if (!required.length) throw new Error("at least one required axis is required");
  const reasonCodes: string[] = [];
  const gaps: string[] = [];
  for (const axis of required) {
    if (!axisValid(axis, now)) {
      reasonCodes.push(classifyGap(axis, now));
      gaps.push(axis.name);
    }
  }
  if (reasonCodes.length) {
    const hard = reasonCodes.some(
      (c) => c.startsWith("INVALID_AXIS:") || c.startsWith("MISSING_AXIS:"),
    );
    return {
      verdict: hard ? "HARD_DENY" : "DENY_DEFAULT",
      lambdaScore: null,
      arithmeticScore: null,
      threshold,
      reasonCodes,
      gaps,
      arithmeticWouldAllow: false,
      divergent: false,
    };
  }
  const values = required.map((a) => a.value as number);
  const weights = required.map((a) => a.weight);
  const lam = weightedGeometricMean(values, weights);
  const ari = weightedArithmeticMean(values, weights);
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
    gaps: [],
    arithmeticWouldAllow,
    divergent: arithmeticWouldAllow !== (verdict === "ALLOW"),
  };
}
