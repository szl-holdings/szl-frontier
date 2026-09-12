/**
 * Regression guard for the 2026-09-11 workspace-readout receipt contract wave.
 *
 * House schema: szl.frontier.integration-wave.v1. These static checks pin the
 * wave's declared fields and selected rules. They do not validate actual receipt
 * ancestry, coverage, method pins, or consumer behavior. Offline; no network,
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
  "2026-09-11-workspace-readout-receipt-contract.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-11-workspace-readout-receipt-contract");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("join key chains to the capture harness wave and the full receipt chain", () => {
  assert.equal(
    wave.deduplication.canonicalPredecessor,
    "frontier/waves/2026-09-11-residual-capture-harness-contract.json",
  );
  assert.equal(wave.readoutContract.joinKey.name, "captureReceipt");
  assert.match(wave.readoutContract.joinKey.rule, /invalid by construction/);
  assert.match(wave.readoutContract.joinKey.rule, /binding -> capture -> readout/);
});

test("all six readout fields are present with rules", () => {
  const names = wave.readoutContract.requiredFields.map((f) => f.name);
  assert.deepEqual(names, [
    "readoutMethod",
    "coverageMap",
    "dispositionField",
    "unavailableSemantics",
    "measuredUpgradeRule",
    "failureDisposition",
  ]);
  for (const field of wave.readoutContract.requiredFields) {
    assert.ok(field.rule.length > 20, `${field.name} must carry a rule`);
  }
});

test("disposition field schema is pinned and never replaces behavioral output", () => {
  const field = wave.readoutContract.requiredFields.find(
    (f) => f.name === "dispositionField",
  );
  assert.match(field.rule, /property, state, method, captureReceiptId/);
  assert.match(field.rule, /never replaces the behavioral output/);
  assert.match(field.rule, /never outruns the coverage map/);
});

test("UNAVAILABLE is the floor for unexposed properties and absence is a violation", () => {
  const field = wave.readoutContract.requiredFields.find(
    (f) => f.name === "unavailableSemantics",
  );
  assert.match(field.rule, /UNAVAILABLE on every receipt/);
  assert.match(field.rule, /contract violation, not an omission/);
});

test("MEASURED upgrade requires a readout receipt and is reversible", () => {
  const field = wave.readoutContract.requiredFields.find(
    (f) => f.name === "measuredUpgradeRule",
  );
  assert.match(field.rule, /MODELED -> MEASURED/);
  assert.match(field.rule, /receipt-evidenced and reversible/);
});

test("failure means UNAVAILABLE with a code, never silent behavioral fallback", () => {
  const field = wave.readoutContract.requiredFields.find(
    (f) => f.name === "failureDisposition",
  );
  assert.match(field.rule, /UNAVAILABLE with the failure code/);
  assert.match(field.rule, /never presented as workspace evidence/);
});

test("lane relation and tracked issues are pinned", () => {
  assert.equal(
    wave.relationToLane.consumes,
    "frontier/waves/2026-09-11-residual-capture-harness-contract.json",
  );
  assert.match(wave.relationToLane.satisfies, /steps 3-4/);
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#2020"));
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#1806"));
});

test("claim surfaces admit no readout exists", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No readout has run/);
  assert.match(surfaces, /remains MODELED or NO_ORGAN/);
  assert.match(surfaces, /not a verdict/);
});
