import assert from "node:assert/strict";
import test from "node:test";
import { planEvaluationTurn, step } from "./agent-state.ts";

test("planned turn cannot run tools", () => {
  const planned = planEvaluationTurn();
  assert.equal(planned.phase, "PLANNED");
  assert.equal(planned.toolsMayRun, false);
  assert.equal(planned.productionAuthorization, false);
});

test("step can stop before tools", () => {
  const stopped = step(planEvaluationTurn(), "STOPPED");
  assert.equal(stopped.phase, "STOPPED");
  assert.equal(stopped.toolsMayRun, false);
});

test("phase skips and production are refused", () => {
  assert.throws(() => step(planEvaluationTurn(), "EXECUTING"), /PHASE_SKIP/);
});
