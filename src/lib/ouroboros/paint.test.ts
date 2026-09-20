import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateLambdaGate, weightedGeometricMean } from "./lambda-gate.ts";
import { evaluateAction } from "../actions/adapter.ts";
import {
  CYCLE_SCHEMA,
  allowChrome,
  paintFromCycle,
  writeEnabled,
} from "./paint.ts";

describe("ouroboros paint bind", () => {
  it("zero axis vetoes even when arithmetic would allow", () => {
    const gate = evaluateLambdaGate([
      { name: "a", value: 0.95, status: "MEASURED", required: true, weight: 1 },
      { name: "b", value: 0.95, status: "MEASURED", required: true, weight: 1 },
      { name: "c", value: 0.95, status: "MEASURED", required: true, weight: 1 },
      { name: "d", value: 0.95, status: "MEASURED", required: true, weight: 1 },
      { name: "provenance_integrity", value: 0, status: "MEASURED", required: true, weight: 1 },
    ]);
    assert.equal(gate.verdict, "LAMBDA_VETO");
    assert.equal(gate.lambdaScore, 0);
    assert.ok((gate.arithmeticScore ?? 0) > 0.7);
    assert.equal(gate.divergent, true);
  });

  it("missing required axis is hard deny", () => {
    const gate = evaluateLambdaGate([
      { name: "ok", value: 0.9, status: "MEASURED", required: true, weight: 1 },
      { name: "human_approval", value: null, status: "BLOCKED", required: true, weight: 1 },
    ]);
    assert.equal(gate.verdict, "HARD_DENY");
  });

  it("diagonal geometric mean is exact", () => {
    assert.ok(Math.abs(weightedGeometricMean([0.7, 0.7, 0.7], [1, 1, 1]) - 0.7) < 1e-12);
  });

  it("null cycle cannot paint ALLOW", () => {
    assert.equal(paintFromCycle(null), "UNAVAILABLE");
    assert.equal(allowChrome("UNAVAILABLE"), false);
    assert.equal(writeEnabled("UNAVAILABLE", "IRREVERSIBLE_WRITE"), false);
    assert.equal(writeEnabled("UNAVAILABLE", "REVERSIBLE_WRITE"), false);
  });

  it("ALLOW chrome requires a bound cycle receipt", () => {
    const paint = paintFromCycle({
      schema: CYCLE_SCHEMA,
      verdict: "ALLOW",
      invariantsOk: true,
      productionPromotion: false,
      authority: "PROPOSAL_ONLY",
      lambda: "CONJECTURE_1",
      lambdaNeverATheorem: true,
    });
    assert.equal(paint, "ALLOW");
    assert.equal(allowChrome(paint), true);
    assert.equal(writeEnabled(paint, "IRREVERSIBLE_WRITE"), false);
  });

  it("arithmetic shadow cannot enable a control", () => {
    const paint = paintFromCycle({
      schema: CYCLE_SCHEMA,
      verdict: "LAMBDA_VETO",
      invariantsOk: true,
      productionPromotion: false,
      authority: "PROPOSAL_ONLY",
      lambda: "CONJECTURE_1",
      lambdaNeverATheorem: true,
      divergent: true,
      shadow: { executable: false },
    });
    assert.equal(paint, "DENY");
    assert.equal(allowChrome(paint), false);
  });

  it("executable shadow is a hard paint deny", () => {
    const paint = paintFromCycle({
      schema: CYCLE_SCHEMA,
      verdict: "ALLOW",
      invariantsOk: true,
      productionPromotion: false,
      authority: "PROPOSAL_ONLY",
      lambda: "CONJECTURE_1",
      lambdaNeverATheorem: true,
      shadow: { executable: true },
    });
    assert.equal(paint, "DENY");
  });

  it("organ DENY blocks bounded execute even with approval", () => {
    const gate = evaluateAction({
      kind: "collect-observation",
      purpose: "action-execute",
      approval: "approved",
      organPaint: "DENY",
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.hard, true);
  });

  it("theorem claim cannot paint ALLOW", () => {
    const paint = paintFromCycle({
      schema: CYCLE_SCHEMA,
      verdict: "ALLOW",
      invariantsOk: true,
      productionPromotion: false,
      authority: "PROPOSAL_ONLY",
      lambda: "THEOREM",
      lambdaNeverATheorem: false,
    });
    assert.equal(paint, "DENY");
  });
});
