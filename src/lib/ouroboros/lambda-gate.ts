// SPDX-License-Identifier: Apache-2.0
/**
 * SOFTWARE Λ aggregator for the UI. Never a theorem.
 *
 * Thin adapter over ../frontier/lambda-gate.ts, the single TypeScript mirror of
 * python/szl_frontier/lambda_gate.py (the reference). This module keeps its
 * historical call shape, evaluateLambdaGate(axes, threshold, now), and result
 * shape, but owns no gate logic: threshold validation, expiry parsing and gap
 * classification are the frontier implementation's. Parity is pinned by
 * python/tests/fixtures/lambda_gate_parity_v1.json.
 */
import {
  evaluateLambdaGate as evaluateFrontierLambdaGate,
  LAMBDA_POSTURE,
  VERDICTS,
  weightedArithmeticMean,
  weightedGeometricMean,
  type EvidenceState,
  type Verdict,
} from "../frontier/lambda-gate.ts";

export { LAMBDA_POSTURE, VERDICTS, weightedArithmeticMean, weightedGeometricMean };
export type { Verdict };

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

export function evaluateLambdaGate(
  axes: AxisEvidence[],
  threshold = 0.7,
  now = new Date(),
): GateResult {
  // An unknown status is not MEASURED, so the frontier gate treats it as a gap.
  const r = evaluateFrontierLambdaGate(
    axes.map((a) => ({ ...a, status: a.status as EvidenceState })),
    { threshold, now },
  );
  return {
    verdict: r.verdict,
    lambdaScore: r.lambdaScore,
    arithmeticScore: r.arithmeticScore,
    threshold: r.threshold,
    reasonCodes: r.reasonCodes,
    gaps: r.gaps,
    arithmeticWouldAllow: r.arithmeticWouldAllow,
    divergent: r.divergent,
  };
}
