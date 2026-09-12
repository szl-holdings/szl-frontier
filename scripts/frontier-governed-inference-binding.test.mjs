/**
 * Regression guard for the 2026-09-11 governed-inference binding contract wave.
 *
 * House schema: szl.frontier.integration-wave.v1. The guard refuses drift that
 * would let this contract record name a candidate without evidence, weaken a
 * required field, or bind a route without a receipt. Offline; no network,
 * provider, or inference calls.
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
  "2026-09-11-governed-inference-binding-contract.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-11-governed-inference-binding-contract");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("no candidate is named; naming one requires evidence", () => {
  assert.equal(wave.candidate.kind, "contract-only");
  assert.equal(wave.candidate.repository, null);
  assert.match(wave.candidate.note, /satisfying every contract field/);
});

test("all seven contract fields are present with rules", () => {
  const names = wave.bindingContract.requiredFields.map((f) => f.name);
  assert.deepEqual(names, [
    "modelRevision",
    "tokenizerRevision",
    "benchmarkSuite",
    "latencyCostEnvelope",
    "fallbackPolicy",
    "piiBoundary",
    "failClosedBehavior",
  ]);
  for (const field of wave.bindingContract.requiredFields) {
    assert.ok(field.rule.length > 20, `${field.name} must carry a rule`);
  }
});

test("binding is receipt-evidenced and drift unbinds", () => {
  assert.match(wave.bindingContract.bindingReceipt, /DSSE receipt/);
  assert.match(wave.bindingContract.bindingReceipt, /all seven fields/);
  assert.match(wave.bindingContract.unbindingRule, /unbinds the route automatically/);
});

test("mutable refs are rejected as model bindings", () => {
  const modelField = wave.bindingContract.requiredFields.find(
    (f) => f.name === "modelRevision",
  );
  assert.match(modelField.rule, /never a binding/);
  assert.match(modelField.rule, /immutable/i);
});

test("workspace readout join key and bakeoff inheritance are wired", () => {
  assert.equal(
    wave.relationToWorkspaceReadout.consumes,
    "frontier/waves/2026-09-11-workspace-readout-preparation.json",
  );
  assert.match(wave.relationToWorkspaceReadout.rule, /step 1/);
  assert.equal(wave.relationToBakeoff.references, "szl-holdings/a11oy#1686");
  assert.match(wave.relationToBakeoff.rule, /bound routes, never unbound demos/);
});

test("tracked issues bind the prerequisite chain", () => {
  for (const issue of [
    "szl-holdings/a11oy#1806",
    "szl-holdings/a11oy#2020",
    "szl-holdings/a11oy#1686",
  ]) {
    assert.ok(wave.trackedIssues.includes(issue));
  }
});

test("claim surfaces admit nothing is bound yet", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No route is bound by this wave/);
  assert.match(surfaces, /No inference is called/);
  assert.match(surfaces, /unbound plan remains a plan/);
});
