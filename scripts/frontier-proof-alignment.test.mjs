import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-08-proof-alignment.json", import.meta.url), "utf8"),
);

const SOURCE = "1bdad0f8a510afe24db6eb03fb8479e7f8330c6d";
const RECEIPT = "bdf6a0aac1af5b06f10ad0e7a9ee9d29e43d16b92654887f0c0b34f25071db46";

describe("2026-09-08 Frontier proof alignment repair", () => {
  it("records a material drift without inventing a new upstream candidate", () => {
    assert.equal(wave.schema, "szl.frontier.alignment-repair-wave.v1");
    assert.equal(wave.trigger.kind, "AUTHORITY_CHAIN_DRIFT");
    assert.equal(wave.trigger.material, true);
    assert.deepEqual(wave.discovery.newUpstreamCandidates, []);
    assert.equal(wave.sourceRevision, SOURCE);
  });

  it("binds GitHub and the successful HF exact-source witness", () => {
    assert.equal(wave.authorityChain.github.revision, SOURCE);
    assert.equal(wave.authorityChain.github.state, "EXACT");
    assert.equal(wave.authorityChain.huggingFace.expectedRevision, SOURCE);
    assert.equal(wave.authorityChain.huggingFace.syncWorkflowRun, 34178621960);
    assert.equal(wave.authorityChain.huggingFace.syncConclusion, "success");
    assert.equal(wave.authorityChain.huggingFace.state, "EXACT_SOURCE_WITNESS_PASS");
  });

  it("routes the proof repair to its owner and refuses a product-runtime inference", () => {
    assert.equal(wave.authorityChain.proof.ownerRepository, "szl-holdings/a11oy-net");
    assert.equal(wave.authorityChain.proof.observedHistoricalRevision, "9a4ed6f");
    assert.equal(wave.authorityChain.proof.repairPullRequest, "https://github.com/szl-holdings/a11oy-net/pull/155");
    assert.equal(wave.authorityChain.proof.state, "REPAIR_PREPARED");
    assert.equal(wave.authorityChain.product.state, "NOT_WITNESSED_IN_THIS_REPAIR");
    assert.equal(wave.authorityChain.product.promotionEffect, "NONE");
  });

  it("preserves the measured GLM evidence and fail-closed production boundary", () => {
    const evidence = wave.evidence.glm53FlashVsKhipu;
    assert.equal(evidence.frontierProjectionRevision, SOURCE);
    assert.equal(evidence.receiptSha256, RECEIPT);
    assert.equal(evidence.decision, "EVIDENCE_COMPLETE_REVIEW_REQUIRED");
    assert.equal(evidence.productionDisposition, "HOLD");
    assert.equal(evidence.promotionEffect, "NONE");
    assert.equal(wave.policy.defaultEffect, "HOLD");
    assert.equal(wave.policy.automaticProductionPromotion, false);
    assert.equal(wave.policy.rehostUpstreamWeights, false);
    assert.equal(wave.policy.weakenControls, false);
    assert.equal(wave.policy.productRuntimeClaimFromProof, false);
  });
});
