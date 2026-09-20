import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path = new URL(
  "../frontier/waves/2026-09-19-counterfactual-rehearsal.json",
  import.meta.url,
);
const wave = JSON.parse(fs.readFileSync(path, "utf8"));

test("dated rehearsal wave stays HOLD and does not stamp completion", () => {
  assert.equal(wave.schema, "szl.frontier.wave/v1");
  assert.equal(wave.id, "2026-09-19-counterfactual-rehearsal");
  assert.equal(wave.disposition, "EVALUATION_HOLD");
  assert.equal(wave.productionAuthorized, false);
  assert.equal(wave.automaticPromotionAuthorized, false);
  assert.equal(wave.allWorkPackagesComplete, false);
  assert.equal(wave.lambdaStatus, "CONJECTURE_1");
  assert.equal(wave.lockedFormulas.length, 8);
});

test("wave binds NX07/NX08 without recreating merged observer work", () => {
  assert.deepEqual(wave.implements, ["NX07", "NX08"]);
  assert.ok(wave.landedPredecessors.some((row) => row.includes("a11oy#2124")));
  assert.ok(wave.deduplication.doNotRecreate.includes("a11oy#2124"));
  assert.ok(wave.deduplication.doNotRecreate.includes("szl-forge#239"));
  assert.ok(wave.deduplication.doNotRecreate.includes("szl-frontier#181"));
});

test("rehearsal contract refuses promotion shortcuts", () => {
  assert.equal(wave.rehearsal.agiWishWithoutEvidence, "HOLD");
  assert.equal(wave.rehearsal.http200IsNotLive, true);
  assert.equal(wave.rehearsal.notRequestedIsNotPass, true);
  assert.equal(wave.rehearsal.productRepairDoesNotImplyVerticals, true);
  assert.equal(wave.rehearsal.productionAuthorizationFromThisTool, false);
  assert.equal(wave.policy.hubPublicationAuthorized, false);
  assert.equal(wave.policy.providerWriteAuthorized, false);
});

test("v1.1 graph and analog catalog stay citation-only under HOLD", () => {
  assert.equal(wave.rehearsal.graphSchema, "szl.frontier.evidence-graph/v1");
  assert.equal(wave.rehearsal.analogSchema, "szl.frontier.analog-catalog/v1");
  assert.deepEqual(wave.rehearsal.nodeKinds, [
    "DECISION",
    "POLICY",
    "SIGNAL",
    "ARTIFACT",
  ]);
  assert.equal(wave.rehearsal.inheritsQualification, false);
  assert.equal(wave.rehearsal.analogCitationIsNotQualification, true);
  assert.equal(wave.rehearsal.hostedCiGreenIsNotPublish, true);
  assert.equal(wave.rehearsal.unshippedDreamIsNamedNotAdmitted, true);
  assert.equal(wave.analogCatalog.inheritsQualification, false);
  assert.equal(wave.analogCatalog.citationOnly, true);
  assert.ok(wave.analogCatalog.entries.length >= 10);
  assert.ok(wave.deduplication.doNotRecreate.includes("a11oy#2205"));
  assert.ok(wave.remainingHolds.some((row) => row.includes("Forge #347")));
});
