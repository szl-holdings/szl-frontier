import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-09-estate-reobservation.json", import.meta.url), "utf8"),
);

const FRONTIER = "0640258ccd63f40605a1811287322e99038836da";
const A11OY = "e14af70d8fd24306e449db56450ad01fb524a857";
const LYTE = "72560fd5eb68cab08c40565c3c489e42c8442e72";

describe("2026-09-09 estate reobservation", () => {
  it("records no duplicate upstream candidate while preserving exact source identity", () => {
    assert.equal(wave.schema, "szl.frontier.alignment-reobservation.v1");
    assert.equal(wave.frontierSourceRevision, FRONTIER);
    assert.equal(wave.discovery.result, "NO_NEW_MATERIAL_CANDIDATE");
    assert.deepEqual(wave.discovery.newUpstreamCandidates, []);
  });

  it("binds the fresh scheduled estate run and immutable Actions artifact", () => {
    const estate = wave.estateVerifier;
    assert.equal(estate.event, "schedule");
    assert.equal(estate.run, 34320477216);
    assert.equal(estate.job, 102365763129);
    assert.equal(estate.headRevision, A11OY);
    assert.equal(estate.releaseId, "cd3845060cc9669685d61eee");
    assert.equal(estate.artifact.id, 10092245027);
    assert.equal(estate.artifact.sha256, "c9bbc7685c080b31b1a7857686a886e95c14f03b049167191f2c6a11b08ed4ec");
    assert.equal(estate.conclusion, "failure");
    assert.equal(estate.failedStep, "Enforce aligned terminal state");
  });

  it("does not misrepresent missing current-run proof-chain evidence", () => {
    const estate = wave.estateVerifier;
    assert.equal(estate.proofChainSha256, null);
    assert.match(estate.proofChainBoundary, /not carried forward/);
    assert.equal(estate.providerWritesPerformed, false);
    assert.equal(estate.repairDispatched, false);
    assert.equal(estate.canonicalWriterDispatchStep, "skipped");
  });

  it("reproduces only the known inventory and Lyte drift", () => {
    assert.deepEqual(wave.estateVerifier.observedBlockingCodes, [
      "HF_INVENTORY_COUNT_MISMATCH_OR_UNAVAILABLE",
      "lyte:SOURCE_REVISION_MISMATCH",
    ]);
    const byCode = Object.fromEntries(wave.drift.map((item) => [item.code, item]));
    assert.equal(byCode.HF_INVENTORY_COUNT_MISMATCH_OR_UNAVAILABLE.owner, "szl-holdings/.github");
    assert.equal(byCode["lyte:SOURCE_REVISION_MISMATCH"].owner, "szl-holdings/lyte-services");
    assert.equal(byCode["lyte:SOURCE_REVISION_MISMATCH"].canonicalSourceRevision, LYTE);
  });

  it("retains fail-closed production and governance bounds", () => {
    assert.equal(wave.policy.productionDisposition, "HOLD");
    assert.equal(wave.policy.automaticProductionPromotion, false);
    assert.equal(wave.policy.productionDefaultsChanged, false);
    assert.equal(wave.policy.providerRoutingChanged, false);
    assert.equal(wave.policy.branchProtectionsChanged, false);
    assert.equal(wave.policy.testsOrPolicyWeakened, false);
    assert.equal(wave.policy.upstreamWeightsRehosted, false);
  });
});
