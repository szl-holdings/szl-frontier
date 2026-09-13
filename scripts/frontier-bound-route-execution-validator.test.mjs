/**
 * Regression guard for the 2026-09-13 bound-route execution validator wave.
 * Asserts the wave record's own invariants and exercises the structural
 * checker against synthetic fixtures. Offline; no network, provider, or
 * inference calls. Fixtures are synthetic and never claim route existence.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { checkWitnessBundle } from "./frontier-execution-witness-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(readFileSync(join(here, "..", "frontier", "waves", "2026-09-13-bound-route-execution-validator.json"), "utf8"));

const CANON = [
  "routeDescriptor",
  "bindingReceipt",
  "captureAnchor",
  "readoutReceipt",
  "witnessRecord",
  "abstentionRule",
];

const goodBundle = () => ({
  routeDescriptor: { routeId: "synthetic-fixture", routeConfigHash: "a".repeat(40) },
  bindingReceipt: { dsseId: "dsse-fixture-1", reverifiedAtCallTime: true },
  captureAnchor: { configHash: "b".repeat(40), joinedToBindingReceipt: true, bindingReceiptId: "dsse-fixture-1" },
  readoutReceipt: { keystoneConformant: true, ordersAfterCapture: true, captureAnchorRef: "b".repeat(40) },
  witnessRecord: {
    organ: "synthetic-organ",
    stages: [
      { name: "bind", at: "2026-09-13T00:00:01Z" },
      { name: "capture", at: "2026-09-13T00:00:02Z" },
      { name: "readout", at: "2026-09-13T00:00:03Z" },
    ],
    evidenceUri: "fixture://none",
    evidenceHash: "c".repeat(40),
  },
  abstentionRule: { onBreakState: "UNVERIFIED", noPartialCredit: true },
  state: "VERIFIED",
});

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-13-bound-route-execution-validator");
});

test("wave is preparation-class, fail-closed, no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("six contract fields recorded in canonical order", () => {
  assert.deepEqual(wave.validator.sixFieldsCanonicalOrder, CANON);
});

test("validator references the pinned admitted contract", () => {
  assert.equal(wave.validator.contractReference.path, "frontier/waves/2026-09-12-bound-route-execution-contract.json");
  assert.equal(wave.validator.contractReference.pinnedBlob, "f380025ccd02cfb00ab2b0b355034447c40a5a3c");
});

test("synthetic complete bundle passes structurally", () => {
  const v = checkWitnessBundle(goodBundle());
  assert.equal(v.state, "VERIFIED");
});

test("missing field abstains with named code", () => {
  const b = goodBundle();
  delete b.witnessRecord;
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "MISSING_FIELD");
});

test("out-of-order fields abstain", () => {
  const b = goodBundle();
  const reshaped = {};
  for (const k of ["bindingReceipt", "routeDescriptor", "captureAnchor", "readoutReceipt", "witnessRecord", "abstentionRule", "state"]) {
    reshaped[k] = b[k];
  }
  const v = checkWitnessBundle(reshaped);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "FIELD_ORDER_VIOLATION");
});

test("non-monotonic witness stages abstain", () => {
  const b = goodBundle();
  b.witnessRecord.stages[1].at = "2026-09-13T00:00:01Z";
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "WITNESS_ORDER_VIOLATION");
});

test("broken capture chain abstains, never partial credit", () => {
  const b = goodBundle();
  b.captureAnchor.bindingReceiptId = "different-id";
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "CHAIN_BROKEN_CAPTURE");
});

test("claim surfaces admit no execution and bound the checker's power", () => {
  const s = wave.claimSurfaces.join("\n");
  assert.match(s, /No execution has run; no bound route exists/);
  assert.match(s, /precondition for evaluation, not evidence/);
});

test("deterministic self-merge is declared and bounded", () => {
  const dm = wave.deterministicMerge;
  assert.equal(dm.strategy, "python-merge");
  assert.equal(dm.selfEnforcing, true);
  assert.ok(dm.touchedPaths.some((p) => p.endsWith("2026-09-13-bound-route-execution-validator.json")));
  for (const f of dm.forbidden) assert.ok(!dm.touchedPaths.includes(f));
});
