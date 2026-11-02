import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { sealReceipt, sha256Hex, stableCanonical } from "./receipt-envelope.ts";
import { evaluateLambdaGate as evaluateOuroborosGate } from "../ouroboros/lambda-gate.ts";
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

const scalingCases = JSON.parse(readFileSync(
  new URL("../../../tests/fixtures/lambda-weight-scaling.json", import.meta.url), "utf8",
)) as Array<{ id: string; values: number[]; weights: number[]; threshold: number;
  geometric: number; arithmetic: number; verdict: string }>;

for (const row of scalingCases) {
  test(`finite weight scaling preserves scores and receipt integrity: ${row.id}`, async () => {
    const axes = row.values.map((value, i) => ({ ...axis(`axis-${i}`, value), weight: row.weights[i] }));
    const result = evaluateLambdaGate(axes, { threshold: row.threshold });
    assert.equal(result.verdict, row.verdict);
    const ouroboros = evaluateOuroborosGate(axes, row.threshold);
    assert.equal(ouroboros.verdict, row.verdict);
    for (const [actual, expected] of [[ouroboros.lambdaScore, row.geometric], [ouroboros.arithmeticScore, row.arithmetic]]) {
      assert.ok(Number.isFinite(actual));
      assert.ok(Math.abs(actual! - expected!) <= 1e-14);
    }
    for (const [actual, expected] of [[result.lambdaScore, row.geometric], [result.arithmeticScore, row.arithmetic]]) {
      assert.equal(typeof actual, "number");
      assert.ok(Number.isFinite(actual));
      assert.ok(Math.abs(actual! - expected!) <= 1e-14);
    }
    assert.equal(result.arithmeticWouldAllow, row.arithmetic >= row.threshold);
    assert.equal(result.shadowExecutable, false);
    const payload = { axes, result, productionAuthorization: false };
    const envelope = await sealReceipt({ kind: "ready", payload, producedAt: "2026-11-02T00:00:00Z" });
    const persisted = JSON.parse(JSON.stringify(envelope));
    assert.deepEqual(persisted.payload, payload);
    assert.equal(persisted.digestSha256, await sha256Hex(stableCanonical(persisted.payload)));
    assert.equal(persisted.authority, "NONE");
    assert.equal(persisted.productionAuthorization, false);
  });
}

test("ordinary receipt bytes retain the existing envelope serializer", () => {
  assert.equal(stableCanonical({ score: 0.9, weights: [1, 1] }), '{"score":0.9,"weights":[1,1]}');
});
