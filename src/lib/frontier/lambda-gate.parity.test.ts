import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateLambdaGate as evaluateFrontier, type AxisEvidence } from "./lambda-gate.ts";
import { evaluateLambdaGate as evaluateOuroboros } from "../ouroboros/lambda-gate.ts";

// Golden vectors generated from python/szl_frontier/lambda_gate.py (the
// reference); python/tests/test_lambda_gate_parity.py keeps them in sync with it.
type Expected =
  | { error: string }
  | {
      verdict: string;
      lambdaScore: number | null;
      arithmeticScore: number | null;
      reasonCodes: string[];
      gaps: string[];
      arithmeticWouldAllow: boolean;
      divergent: boolean;
      state: string;
    };
type Case = { id: string; threshold: number; axes: AxisEvidence[]; typescript: Expected };

const fixture = JSON.parse(
  readFileSync(new URL("../../../python/tests/fixtures/lambda_gate_parity_v1.json", import.meta.url), "utf8"),
) as { now: string; score_abs_tol: number; cases: Case[] };
const now = new Date(fixture.now);
const tol = fixture.score_abs_tol;

function close(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tol;
}

function check(id: string, got: Record<string, unknown>, want: Exclude<Expected, { error: string }>, withState: boolean) {
  for (const key of ["verdict", "reasonCodes", "gaps", "arithmeticWouldAllow", "divergent"] as const) {
    assert.deepEqual(got[key], want[key], `${id}: ${key}`);
  }
  if (withState) assert.equal(got.state, want.state, `${id}: state`);
  for (const key of ["lambdaScore", "arithmeticScore"] as const) {
    assert.ok(close(got[key] as number | null, want[key]), `${id}: ${key} ${String(got[key])} vs ${String(want[key])}`);
  }
}

test("parity fixture is present and non-trivial", () => {
  assert.ok(fixture.cases.length >= 30);
});

test("frontier lambda gate matches the Python reference vectors", () => {
  for (const c of fixture.cases) {
    if ("error" in c.typescript) {
      assert.throws(() => evaluateFrontier(c.axes, { threshold: c.threshold, now }), Error, c.id);
      continue;
    }
    check(c.id, evaluateFrontier(c.axes, { threshold: c.threshold, now }) as unknown as Record<string, unknown>, c.typescript, true);
  }
});

test("ouroboros adapter matches the same vectors", () => {
  for (const c of fixture.cases) {
    if ("error" in c.typescript) {
      assert.throws(() => evaluateOuroboros(c.axes, c.threshold, now), Error, c.id);
      continue;
    }
    check(c.id, evaluateOuroboros(c.axes, c.threshold, now) as unknown as Record<string, unknown>, c.typescript, false);
  }
});
