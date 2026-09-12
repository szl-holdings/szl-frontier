/**
 * Regression guard for the 2026-09-12 governed-inference chain receipt wave.
 *
 * House schema: szl.frontier.integration-wave.v1. This record attests and pins
 * the existence, blob identity, and ordering of the four canonical contract
 * chain records on main; asserts this receipt's own invariants; and keeps the
 * supersession of PR #99 plus the carried-forward requirement checklist
 * machine-checkable. Offline; no network, provider, or inference calls.
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
  "2026-09-12-governed-inference-chain-receipt.json",
);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-12-governed-inference-chain-receipt");
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
  assert.ok(dm.touchedPaths.includes(wavePath.split("frontier/")[1] + ""));
  for (const f of dm.forbidden) {
    assert.ok(!dm.touchedPaths.includes(f));
  }
});

test("chain receipt pins exactly four records in canonical order", () => {
  const roles = wave.chainReceipt.records.map((r) => r.role);
  assert.deepEqual(roles, ["preparation", "binding", "capture", "readout-keystone"]);
  assert.equal(wave.chainReceipt.status, "contract-complete-on-main");
  for (const r of wave.chainReceipt.records) {
    assert.match(r.path, /^frontier\/waves\/2026-09-11-/);
    assert.match(r.blob, /^[0-9a-f]{40}$/);
    assert.ok(Number.isInteger(r.bytes) && r.bytes > 0);
  }
});

test("readout keystone record is pinned to the canonical main blob", () => {
  const keystone = wave.chainReceipt.records.find(
    (r) => r.role === "readout-keystone",
  );
  assert.equal(keystone.blob, "dafa297895fc882ac526ddb2de10d8f662b4552b");
  assert.match(keystone.path, /workspace-readout-receipt-contract\.json$/);
});

test("join rule forbids broken ancestry by construction", () => {
  assert.match(wave.chainReceipt.joinRule, /invalid by construction/);
  assert.match(wave.chainReceipt.joinRule, /binding -> capture -> readout/);
});

test("supersession of PR 99 is recorded with reason and checklist", () => {
  assert.equal(wave.supersession.supersededPullRequest, 99);
  assert.match(wave.supersession.reason, /one readout contract of record/);
  assert.deepEqual(wave.supersession.carriedForwardRequirements, [
    "joinKeyAncestryCheck",
    "pinnedReadoutMethod",
    "coverageAgainstCaptureHash",
    "dispositionBesideBehavioral",
    "unavailableFloor",
    "measuredUpgradeReversible",
    "failureAbstains",
  ]);
});

test("checklist is labeled requirements-not-claims about the canonical file", () => {
  assert.match(
    wave.supersession.requirementStatus,
    /not as claims about the canonical file/,
  );
});

test("verification scope admits canonical keystone internals are unverified", () => {
  assert.match(wave.verificationScope.unverifiedFollowUp, /not verified/);
  assert.ok(wave.verificationScope.verified.length >= 3);
});

test("claim surfaces admit no readout exists and cap instrument claims", () => {
  const surfaces = wave.claimSurfaces.join("\n");
  assert.match(surfaces, /No readout has run/);
  assert.match(surfaces, /remains MODELED or NO_ORGAN/);
  assert.match(surfaces, /does not attest the internal fields/);
  assert.match(surfaces, /not a verdict/);
});
