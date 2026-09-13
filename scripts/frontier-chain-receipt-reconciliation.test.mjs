/**
 * Regression guard for the 2026-09-13 chain receipt reconciliation wave.
 *
 * House schema: szl.frontier.integration-wave.v1. Asserts the reconciliation
 * record's own invariants: additive reconciliation (receipt of record
 * preserved), the current four-record pinset with correct status labels, the
 * two absent records carried as removedSincePin with their prior blobs, the
 * UNVERIFIED content caveat, and the keystone's checkout-verifiable status.
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
  "2026-09-13-chain-receipt-reconciliation-01.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));
// Sentence-initial capitalization is presentation, not a different claim.
// Keep sentence/word boundaries so negation and "canonicalized" cannot pass.
const canonicalInstrumentStatement =
  /(?:^|[.!?]\s+)[Tt]he instrument is canonical(?:[.;]|$)/;

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-13-chain-receipt-reconciliation-01");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("reconciliation targets the chain receipt and preserves it", () => {
  assert.equal(
    wave.reconciliation.reconcilesAgainst,
    "frontier/waves/2026-09-12-governed-inference-chain-receipt.json",
  );
  assert.equal(wave.reconciliation.reconciledBlob, "e66cf07babb537215dd0706362634bc330340831");
  assert.equal(wave.reconciliation.kind, "ledger-drift-reconciliation");
  assert.match(wave.reconciliation.supersessionSemantics, /remains the receipt of record/);
});

test("current pinset is four records with honest status labels", () => {
  const statuses = wave.reconciliation.current.map((r) => r.status);
  assert.deepEqual(statuses, [
    "present-new",
    "present-changed",
    "present-new",
    "present-unchanged",
  ]);
  for (const r of wave.reconciliation.current) {
    assert.match(r.path, /^frontier\/waves\/2026-09-11-/);
    assert.match(r.blob, /^[0-9a-f]{40}$/);
    assert.ok(Number.isInteger(r.bytes) && r.bytes > 0);
  }
});

test("capture harness change is pinned with its prior blob carried", () => {
  const capture = wave.reconciliation.current.find((r) => r.status === "present-changed");
  assert.equal(capture.blob, "bbeb393ad8871b6fba11df53b2d96b2bb265b259");
  assert.equal(capture.previousBlob, "20262c63e4e6bdf0b04fb9f75e110c0d0c3b4847");
  assert.match(capture.path, /residual-capture-harness-contract/);
});

test("two absent records are carried with their prior blobs", () => {
  const removed = wave.reconciliation.removedSincePin;
  assert.equal(removed.length, 2);
  const blobs = removed.map((r) => r.previousBlob);
  assert.ok(blobs.includes("a1766d251dd5b447228b3c3aaebdeeca07e09fba"));
  assert.ok(blobs.includes("2dcebad5712f750bdb1a6d6e9bc72620a3476fa0"));
  for (const r of removed) {
    assert.equal(r.status, "absent-on-current-main");
  }
});

test("content semantics are honestly UNVERIFIED from this lane", () => {
  const caveat = wave.reconciliation.contentCaveat;
  assert.match(caveat, /UNVERIFIED/);
  assert.match(caveat, /SUPERSEDED pending checkout verification/);
});

test("keystone verification status is checkout-verifiable, instrument canonical", () => {
  const v = wave.reconciliation.verificationStatus;
  assert.match(v.current, /checkout-verifiable/);
  assert.match(v.current, /frontier-keystone-verification-harness/);
  assert.match(v.current, canonicalInstrumentStatement);
});

test("canonical instrument matcher accepts sentence-initial capitalization", () => {
  for (const statement of [
    "The instrument is canonical.",
    "the instrument is canonical.",
    "Checkout witness. The instrument is canonical; qualification remains separate.",
    "Checkout witness. the instrument is canonical; qualification remains separate.",
  ]) {
    assert.match(statement, canonicalInstrumentStatement);
  }
});

test("canonical instrument matcher rejects absent, negated and changed claims", () => {
  for (const statement of [
    "",
    "The instrument is not canonical.",
    "The instrument is noncanonical.",
    "The instrument is canonicalized.",
    "Not the instrument is canonical.",
    "The instrument was canonical.",
  ]) {
    assert.doesNotMatch(statement, canonicalInstrumentStatement);
  }
});

test("claim surfaces admit no execution and preserve the receipt of record", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No execution has run; no bound route exists/);
  assert.match(surfaces, /remains MODELED or NO_ORGAN/);
  assert.match(surfaces, /verifies no record's internal semantics/);
  assert.match(surfaces, /original chain receipt is preserved/);
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
