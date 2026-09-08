import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-08-authority-chain-product-parity.json", import.meta.url), "utf8"),
);

const FRONTIER = "0640258ccd63f40605a1811287322e99038836da";
const HF_REPO = "e71a9b32159e3964b8ed06ddb0603fe90a8d7f23";
const PRODUCT = "002cd0c2edc8f38b297ae0394ecf8da12c06cc60";
const PROOF = "97f33143f50d2fb615f83323114a707463fd034b";

describe("2026-09-08 authority-chain product parity successor", () => {
  it("records a material alignment advance without inventing another upstream release", () => {
    assert.equal(wave.schema, "szl.frontier.alignment-repair-wave.v1");
    assert.equal(wave.trigger.kind, "AUTHORITY_CHAIN_REPAIR_ADVANCED");
    assert.equal(wave.trigger.material, true);
    assert.deepEqual(wave.discovery.newUpstreamCandidates, []);
    assert.equal(wave.sourceRevision, FRONTIER);
  });

  it("binds protected Frontier source to the exact Hugging Face runtime source", () => {
    assert.equal(wave.authorityChain.github.revision, FRONTIER);
    assert.equal(wave.authorityChain.github.state, "EXACT");
    assert.equal(wave.authorityChain.huggingFace.spaceRepositoryRevision, HF_REPO);
    assert.equal(wave.authorityChain.huggingFace.runtimeDeploymentSourceRevision, FRONTIER);
    assert.equal(wave.authorityChain.huggingFace.syncWorkflowRun, 34247345227);
    assert.equal(wave.authorityChain.huggingFace.state, "EXACT_SOURCE_WITNESS_PASS");
  });

  it("records repaired A11oy source parity but refuses to upgrade incomplete equivalence", () => {
    const product = wave.authorityChain.product;
    assert.equal(product.protectedMainRevision, PRODUCT);
    assert.equal(product.runtimeReportedSourceRevision, PRODUCT);
    assert.equal(product.sourceRuntimeParity, "MATCH");
    assert.equal(product.equivalenceState, "UNAVAILABLE");
    assert.equal(product.claimGate, "FAILED_CLOSED");
    assert.equal(product.enforcementState, "FAILED_CLOSED");
    assert.equal(product.externalWrites, "DISABLED");
    assert.deepEqual(product.effectors, []);
    assert.deepEqual(product.criticalFailures, ["github_inventory_unavailable"]);
    assert.equal(product.canonicalSyncConclusion, "PARTIAL_FAILURE_VERTICAL_FLAGSHIP_PUBLISH_ONLY");
  });

  it("binds the repaired proof owner and retains production HOLD", () => {
    assert.equal(wave.authorityChain.proof.repositoryRevision, PROOF);
    assert.equal(wave.authorityChain.proof.repairPullRequest, "https://github.com/szl-holdings/a11oy-net/pull/158");
    assert.equal(
      wave.authorityChain.proof.state,
      "CURRENT_FRONTIER_SOURCE_HF_EXACT_PRODUCT_SOURCE_MATCH_BINDING_UNAVAILABLE_RECORDED",
    );
    assert.equal(wave.policy.defaultEffect, "HOLD");
    assert.equal(wave.policy.automaticProductionPromotion, false);
    assert.equal(wave.policy.productionDefaultsChanged, false);
    assert.equal(wave.policy.rehostUpstreamWeights, false);
    assert.equal(wave.policy.weakenControls, false);
  });

  it("routes all unresolved product binding gaps to the product owner", () => {
    assert.equal(wave.remainingBlockers.length, 3);
    for (const blocker of wave.remainingBlockers) {
      assert.equal(blocker.owner, "szl-holdings/a11oy");
      assert.match(blocker.effect, /(HOLD|BLOCKED|green)/);
    }
  });
});
