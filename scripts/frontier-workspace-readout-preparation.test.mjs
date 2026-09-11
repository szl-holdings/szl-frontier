/**
 * Regression guard for the 2026-09-11 workspace-readout preparation wave.
 *
 * This wave is preparation, not measurement. The guard refuses any drift that
 * would let a preparation record masquerade as a measurement, promote HOLD,
 * or reorder the fail-closed measurement order. It runs offline against the
 * committed JSON; it performs no network, provider, or inference calls.
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

test("wave is preparation-class with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.production_disposition, "HOLD");
  assert.equal(wave.promotion_effect, false);
});

test("measurement order is fail-closed: binding precedes capture precedes readout precedes labeling", () => {
  const steps = wave.measurement_order.map((s) => s.name);
  assert.deepEqual(steps, [
    "governed-inference-binding",
    "residual-stream-capture",
    "workspace-readout",
    "property-labeling",
  ]);
  assert.equal(wave.measurement_order[0].step, 1);
  assert.match(wave.measurement_order[0].rule, /Do not call an unbound plan inference/);
});

test("tracked issues bind a11oy#2020 and its #1806 prerequisite", () => {
  const issues = wave.anchors.tracked_issues;
  assert.ok(issues.includes("szl-holdings/a11oy#2020"));
  assert.ok(issues.includes("szl-holdings/a11oy#1806"));
  for (const step of wave.measurement_order) {
    assert.match(step.tracks, /^szl-holdings\/a11oy#(1806|2020)$/);
  }
});

test("no estate organ claims MEASURED; selectivity has no organ", () => {
  const mapping = wave.estate_organ_mapping;
  for (const [property, entry] of Object.entries(mapping)) {
    assert.notEqual(
      entry.current_state,
      "MEASURED",
      `organ for ${property} must not claim MEASURED without a bound-route receipt`,
    );
  }
  assert.equal(mapping.selectivity.current_state, "NO_ORGAN");
  assert.equal(mapping.selectivity.organ, null);
});

test("claim surfaces forbid upgrading labels without receipts", () => {
  const surfaces = wave.claim_surfaces.join("\n");
  assert.match(surfaces, /No MEASURED upgrade/);
  assert.match(surfaces, /bound-route, real-model receipt/);
  assert.match(surfaces, /honesty labels read verbatim/);
});

test("provenance labels are preserved and honesty is verbatim", () => {
  assert.ok(wave.labels.provenance.includes("OBSERVED"));
  assert.ok(wave.labels.provenance.includes("SIM"));
  assert.equal(wave.labels.honesty, "labels-verbatim");
});
