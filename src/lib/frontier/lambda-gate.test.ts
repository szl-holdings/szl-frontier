import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLambdaGate,
  sealCompleteness,
  weightedArithmeticMean,
  weightedGeometricMean,
  type AxisEvidence,
} from "./lambda-gate.ts";

function axis(name: string, value: number | null, status: AxisEvidence["status"] = "MEASURED"): AxisEvidence {
  return {
    name,
    value,
    status,
    required: true,
    weight: 1,
    observedAt: "2026-09-20T11:00:00Z",
    expiryAt: "2027-09-20T11:00:00Z",
  };
}

test("geometric mean is the only actor; a zero vetoes", () => {
  assert.equal(weightedGeometricMean([1, 0.5, 1], [1, 1, 1]), Math.exp(Math.log(0.5) / 3));
  assert.equal(weightedGeometricMean([1, 0, 1], [1, 1, 1]), 0);
});

test("arithmetic mean is recorded and can diverge", () => {
  const axes = [axis("a", 1), axis("b", 0.2), axis("c", 1)];
  const gate = evaluateLambdaGate(axes, { threshold: 0.7 });
  assert.equal(gate.verdict, "ESCALATE");
  assert.ok(gate.arithmeticScore !== null);
  assert.ok(gate.lambdaScore !== null && gate.lambdaScore < 0.7);
  assert.equal(weightedArithmeticMean([1, 0.2, 1], [1, 1, 1]), (1 + 0.2 + 1) / 3);
});

test("missing required axis is HARD_DENY not skipped", () => {
  const gate = evaluateLambdaGate([axis("a", null, "UNAVAILABLE"), axis("b", 1)]);
  assert.equal(gate.verdict, "HARD_DENY");
  assert.equal(gate.lambdaScore, null);
  assert.ok(gate.reasonCodes.includes("MISSING_AXIS:a"));
});

test("measured zero is LAMBDA_VETO even if arithmetic would allow", () => {
  const axes = [axis("a", 1), axis("b", 0), axis("c", 1)];
  const gate = evaluateLambdaGate(axes, { threshold: 0.5 });
  assert.equal(gate.verdict, "LAMBDA_VETO");
  assert.equal(gate.lambdaScore, 0);
  assert.equal(gate.arithmeticWouldAllow, true);
  assert.equal(gate.divergent, true);
  assert.equal(gate.shadowExecutable, false);
});

test("completeness is a zero-veto axis", () => {
  const axes = sealCompleteness([
    axis("identity_integrity", 1),
    axis("evidence_completeness", 1),
    { ...axis("freshness", null, "UNAVAILABLE"), required: true },
  ]);
  const complete = axes.find((a) => a.name === "evidence_completeness");
  assert.equal(complete?.value, 0);
});
