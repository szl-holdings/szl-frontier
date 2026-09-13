/**
 * Regression guard for the 2026-09-12 bound-route execution contract wave.
 *
 * House schema: szl.frontier.integration-wave.v1. The guard asserts the
 * contract record's own invariants: house identity, preparation class with
 * HOLD policy, the six required executional fields in order, the
 * synthetic-fixture exclusion, whole-chain consistency, abstain-on-any-break,
 * and claim surfaces admitting no execution has occurred.
 * Offline; no network, provider, or inference calls.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wavePath = join(
  here,
  "..",
  "frontier",
  "waves",
  "2026-09-12-bound-route-execution-contract.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-12-bound-route-execution-contract");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("deterministic self-merge is declared and bounded", () => {
  const dm = wave.deterministicMerge;
  assert.equal(dm.strategy, "python-merge");
  assert.equal(dm.script, "scripts/wave-merge.py");
  assert.equal(dm.selfEnforcing, true);
  const waveRel = "frontier/waves/" + wavePath.split("/").at(-1);
  assert.ok(dm.touchedPaths.includes(waveRel));
  for (const f of dm.forbidden) {
    assert.ok(!dm.touchedPaths.includes(f));
  }
});

test("all six executional fields are present in canonical order with rules", () => {
  const names = wave.executionContract.requiredFields.map((f) => f.name);
  assert.deepEqual(names, [
    "routeDescriptor",
    "bindingReceipt",
    "captureAnchor",
    "readoutReceipt",
    "witnessRecord",
    "abstentionRule",
  ]);
  for (const field of wave.executionContract.requiredFields) {
    assert.ok(field.rule.length > 40, `${field.name} must carry a rule`);
  }
});

test("real bound route excludes fixtures, replays, and simulations", () => {
  const rule = wave.executionContract.realBoundRoute.rule;
  assert.match(rule, /deployed estate route/);
  assert.match(rule, /routeConfigHash/);
  assert.match(rule, /Synthetic fixtures, offline replays, and simulated routes never count/);
});

test("binding receipts re-verify at execution, not at issue time", () => {
  const field = wave.executionContract.requiredFields.find(
    (f) => f.name === "bindingReceipt",
  );
  assert.match(field.rule, /re-verified at execution/);
  assert.match(field.rule, /not carried forward/);
});

test("consistency rule verifies the chain as a whole, monotonic in time", () => {
  const rule = wave.executionContract.consistencyRule;
  assert.match(rule, /readout -> capture -> binding/);
  assert.match(rule, /monotonic/);
  assert.match(rule, /never stage-by-stage/);
});

test("abstention means UNVERIFIED with a failure code, never partial credit", () => {
  const field = wave.executionContract.requiredFields.find(
    (f) => f.name === "abstentionRule",
  );
  assert.match(field.rule, /UNVERIFIED with the failure code/);
  assert.match(field.rule, /no stage may be claimed individually/);
});

test("claim graduation is a new wave receipt, never an edit of this contract", () => {
  const rule = wave.executionContract.claimGraduation;
  assert.match(rule, /new wave receipt/);
  assert.match(rule, /never by editing this contract/);
});

test("claim surfaces admit no execution has occurred", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No execution has run; no bound route exists/);
  assert.match(surfaces, /preparation, not measurement, not deployment/);
  assert.match(surfaces, /prose does not graduate anyone/);
});
