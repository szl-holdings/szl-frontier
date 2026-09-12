/**
 * Regression guard for the 2026-09-11 workspace-readout preparation wave.
 *
 * House schema: szl.frontier.integration-wave.v1. The guard refuses drift
 * that would let a preparation record masquerade as measurement, promote
 * HOLD, or reorder the fail-closed measurement order. Offline; no network,
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
  "2026-09-11-workspace-readout-preparation.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-11-workspace-readout-preparation");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("candidate is paper-only and never an estate authority", () => {
  assert.equal(wave.candidate.kind, "paper-only");
  assert.equal(wave.candidate.authority, "external-source-never-estate-authority");
});

test("measurement order is fail-closed: binding precedes capture precedes readout precedes labeling", () => {
  const steps = wave.preparation.measurementOrder.map((s) => s.name);
  assert.deepEqual(steps, [
    "governed-inference-binding",
    "residual-stream-capture",
    "workspace-readout",
    "property-labeling",
  ]);
  assert.equal(wave.preparation.measurementOrder[0].step, 1);
  assert.match(
    wave.preparation.measurementOrder[0].rule,
    /Do not call an unbound plan inference/,
  );
});

test("tracked issues bind a11oy#2020 and its #1806 prerequisite", () => {
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#2020"));
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#1806"));
  for (const step of wave.preparation.measurementOrder) {
    assert.match(step.tracks, /^szl-holdings\/a11oy#(1806|2020)$/);
  }
});

test("no estate organ claims MEASURED; selectivity has no organ", () => {
  const mapping = wave.preparation.estateOrganMapping;
  for (const [property, entry] of Object.entries(mapping)) {
    assert.notEqual(
      entry.currentState,
      "MEASURED",
      `organ for ${property} must not claim MEASURED without a bound-route receipt`,
    );
  }
  assert.equal(mapping.selectivity.currentState, "NO_ORGAN");
  assert.equal(mapping.selectivity.organ, null);
});

test("claim surfaces forbid upgrading labels without receipts", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No MEASURED upgrade/);
  assert.match(surfaces, /bound-route, real-model receipt/);
  assert.match(surfaces, /honesty labels read verbatim/);
});

test("provenance labels are preserved and honesty is verbatim", () => {
  assert.ok(wave.labels.provenance.includes("OBSERVED"));
  assert.ok(wave.labels.provenance.includes("SIM"));
  assert.equal(wave.labels.honesty, "labels-verbatim");
});
