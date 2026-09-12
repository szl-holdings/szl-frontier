/**
 * Regression guard for the 2026-09-11 residual-capture harness contract wave.
 *
 * House schema: szl.frontier.integration-wave.v1. The guard refuses drift that
 * would let a capture occur without a binding receipt, persist tensors, or
 * anchor a readout claim to behavioral output alone. Offline; no network,
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
  "2026-09-11-residual-capture-harness-contract.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-11-residual-capture-harness-contract");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("join key chains to the binding contract wave", () => {
  assert.equal(
    wave.deduplication.canonicalPredecessor,
    "frontier/waves/2026-09-11-governed-inference-binding-contract.json",
  );
  assert.equal(wave.captureContract.joinKey.name, "bindingReceipt");
  assert.match(wave.captureContract.joinKey.rule, /invalid by construction/);
  assert.match(wave.captureContract.joinKey.rule, /never captures on an unbound route/);
});

test("all five capture fields are present with rules", () => {
  const names = wave.captureContract.requiredFields.map((f) => f.name);
  assert.deepEqual(names, [
    "exactRevisions",
    "captureConfig",
    "storageClass",
    "captureReceipt",
    "failureDisposition",
  ]);
  for (const field of wave.captureContract.requiredFields) {
    assert.ok(field.rule.length > 20, `${field.name} must carry a rule`);
  }
});

test("captured tensors may never persist", () => {
  const storage = wave.captureContract.requiredFields.find(
    (f) => f.name === "storageClass",
  );
  assert.match(storage.rule, /ephemeral/);
  assert.match(storage.rule, /never persist/);
});

test("readout consumes only capture receipts", () => {
  const receipt = wave.captureContract.requiredFields.find(
    (f) => f.name === "captureReceipt",
  );
  assert.match(receipt.rule, /bindingReceiptId/);
  assert.match(receipt.rule, /captureConfigHash/);
  assert.match(receipt.rule, /Readout steps consume only capture receipts/);
});

test("capture failure means abstention, never silent fallback", () => {
  const failure = wave.captureContract.requiredFields.find(
    (f) => f.name === "failureDisposition",
  );
  assert.match(failure.rule, /no readout claim/);
  assert.match(failure.rule, /no silent fallback/);
});

test("workspace readout steps 3-4 stay blocked until a capture receipt exists", () => {
  assert.equal(wave.relationToWorkspaceReadout.enables, "szl-holdings/a11oy#2020 step 2 (residual-stream-capture)");
  assert.match(wave.relationToWorkspaceReadout.rule, /remain blocked until then/);
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#2020"));
  assert.ok(wave.trackedIssues.includes("szl-holdings/a11oy#1806"));
});

test("claim surfaces admit no capture exists", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No residual stream has been captured/);
  assert.match(surfaces, /never presented as workspace evidence/);
});
