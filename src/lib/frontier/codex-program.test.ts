import assert from "node:assert/strict";
import test from "node:test";
import { UPGRADE_LANES, laneScope, programSummary, thisOrganLanes } from "./codex-program.ts";

test("program has 26 lanes and never authorizes production", () => {
  const summary = programSummary();
  assert.equal(UPGRADE_LANES.length, 26);
  assert.equal(summary.total, 26);
  assert.equal(summary.thisOrgan + summary.handoff, 26);
  assert.equal(summary.productionAuthorization, false);
  assert.equal(summary.trainingAdmission, false);
  assert.equal(summary.paidWorkloadBudgetUsd, 0);
  assert.equal(summary.lambda, "CONJECTURE_1");
  assert.equal(summary.fileAuditComplete, false);
  assert.equal(summary.promotionEffect, "NONE");
  assert.equal(summary.execution.mergeProtectedMain, false);
  assert.equal(summary.execution.recreateFlagship, false);
  assert.ok(UPGRADE_LANES.every((lane) => lane.productionAuthorization === false));
});

test("this organ lanes stay on frontier and do not include a11oy rewrite", () => {
  const mine = thisOrganLanes();
  assert.deepEqual(
    mine.map((lane) => lane.id),
    ["FE-03", "FE-06", "DR-01", "DR-03", "DR-05", "DR-06", "DR-07", "DR-08", "DR-10"],
  );
  assert.equal(laneScope("FE-01"), "HANDOFF");
  assert.equal(laneScope("FE-03"), "THIS_ORGAN");
  assert.ok(mine.every((lane) => lane.owners.includes("szl-holdings/szl-frontier") || lane.id === "DR-10"));
});
