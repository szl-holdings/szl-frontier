import assert from "node:assert/strict";
import test from "node:test";
import {
  OptionalEvalError,
  admitOptionalEvaluation,
  canEvaluate,
  defaultOptionalEvaluation,
  parseStoredOptionalEval,
  refuseHandoffFromThisOrgan,
  refuseUnauthorizedCompose,
} from "./optional-eval.ts";

test("optional evaluation defaults off and never authorizes", () => {
  const off = defaultOptionalEvaluation();
  assert.equal(off.optedIn, false);
  assert.equal(off.productionAuthorization, false);
  assert.equal(off.promotionEffect, "NONE");
  assert.deepEqual(off.admittedScopes, []);
});

test("opting in admits THIS_ORGAN only", () => {
  const on = admitOptionalEvaluation(true);
  assert.equal(on.optedIn, true);
  assert.deepEqual(on.admittedScopes, ["THIS_ORGAN"]);
  assert.equal(on.productionAuthorization, false);
  assert.equal(canEvaluate(true, "THIS_ORGAN"), true);
  assert.equal(canEvaluate(true, "HANDOFF"), false);
  assert.equal(canEvaluate(false, "THIS_ORGAN"), false);
});

test("compose without opt-in fails closed", () => {
  assert.throws(
    () => refuseUnauthorizedCompose(false),
    (err: unknown) => err instanceof OptionalEvalError && err.code === "OPTIONAL_EVALUATION_REQUIRED",
  );
  refuseUnauthorizedCompose(true);
});

test("handoff cannot execute from this organ", () => {
  assert.throws(
    () => refuseHandoffFromThisOrgan("HANDOFF"),
    (err: unknown) => err instanceof OptionalEvalError && err.code === "HANDOFF_NOT_EXECUTABLE_HERE",
  );
  refuseHandoffFromThisOrgan("THIS_ORGAN");
});

test("smuggled production authorization in storage is ignored", () => {
  assert.equal(parseStoredOptionalEval(null), false);
  assert.equal(parseStoredOptionalEval("not-json"), false);
  assert.equal(parseStoredOptionalEval(JSON.stringify({ optedIn: true, productionAuthorization: true })), false);
  assert.equal(parseStoredOptionalEval(JSON.stringify({ optedIn: true, productionAuthorization: false })), true);
});
