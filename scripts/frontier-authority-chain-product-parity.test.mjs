import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-08-authority-chain-product-parity.json", import.meta.url), "utf8"),
);

const FRONTIER = "0640258ccd63f40605a1811287322e99038836da";
const HF_REPO = "e71a9b32159e3964b8ed06ddb0603fe90a8d7f23";
const PRODUCT = "e14af70d8fd24306e449db56450ad01fb524a857";
const PRODUCT_HF_REPO = "8eec9a696e838e6889bd968776d8f0279e188400";
const PROOF = "97f33143f50d2fb615f83323114a707463fd034b";
const LYTE = "72560fd5eb68cab08c40565c3c489e42c8442e72";
const LYTE_RUNTIME = "a6a653b0d93a0d150b868a044642ce4f5c71d766";

describe("2026-09-08 authority-chain product parity successor", () => {
  it("records a material alignment advance without inventing another upstream release", () => {
    assert.equal(wave.schema, "szl.frontier.alignment-repair-wave.v1");
    assert.equal(wave.trigger.kind, "AUTHORITY_CHAIN_REPAIR_ADVANCED");
    assert.equal(wave.trigger.material, true);
    assert.deepEqual(wave.discovery.newUpstreamCandidates, []);
    assert.equal(wave.sourceRevision, FRONTIER);
  });

  it("keeps protected Frontier source exactly bound to the Hugging Face Frontier runtime", () => {
    assert.equal(wave.authorityChain.github.revision, FRONTIER);
    assert.equal(wave.authorityChain.github.state, "EXACT");
    assert.equal(wave.authorityChain.huggingFace.spaceRepositoryRevision, HF_REPO);
    assert.equal(wave.authorityChain.huggingFace.runtimeDeploymentSourceRevision, FRONTIER);
    assert.equal(wave.authorityChain.huggingFace.state, "EXACT_SOURCE_WITNESS_PASS");
  });

  it("records the newer A11oy exact source/runtime and semantic parity without upgrading artifact binding", () => {
    const product = wave.authorityChain.product;
    assert.equal(product.protectedMainRevision, PRODUCT);
    assert.equal(product.huggingFaceSpaceRepositoryRevision, PRODUCT_HF_REPO);
    assert.equal(product.huggingFaceRuntimeSourceRevision, PRODUCT);
    assert.equal(product.domainRuntimeSourceRevision, PRODUCT);
    assert.equal(product.sourceRuntimeParity, "MATCH");
    assert.equal(product.semanticParity, "MATCH");
    assert.equal(product.completeArtifactBinding, "NOT_REOBSERVED_BY_ESTATE_VERIFIER");
  });

  it("fails closed on stale proof content rather than mistaking deployed proof code for current evidence", () => {
    const proof = wave.authorityChain.proof;
    assert.equal(proof.repositoryRevision, PROOF);
    assert.equal(proof.deployedRevision, PROOF);
    assert.equal(proof.frontierRecordProductRevision, "002cd0c2edc8f38b297ae0394ecf8da12c06cc60");
    assert.equal(proof.currentProductRevision, PRODUCT);
    assert.equal(proof.contentParity, "STALE_PRODUCT_REVISION");
    assert.equal(wave.policy.defaultEffect, "HOLD");
    assert.equal(wave.policy.automaticProductionPromotion, false);
    assert.equal(wave.policy.productionDefaultsChanged, false);
    assert.equal(wave.policy.rehostUpstreamWeights, false);
    assert.equal(wave.policy.weakenControls, false);
  });

  it("binds the latest immutable estate verifier evidence", () => {
    const verifier = wave.latestEstateVerifier;
    assert.equal(verifier.run, 34297559945);
    assert.equal(verifier.job, 102297362728);
    assert.equal(verifier.headRevision, PRODUCT);
    assert.equal(verifier.releaseId, "d1b3d82e190549cefb0d87ce");
    assert.equal(verifier.actionsArtifactId, 10084191278);
    assert.equal(verifier.actionsArtifactSha256, "b5eed8c12736c1e28a076f5e73f48f51483703246251205f62b6a2976cc182f6");
    assert.equal(verifier.proofChainSha256, "b24aeefb2e6f92b93c027b85357f92ced2d3af28049a423ae1dc612f30c86fb5");
    assert.equal(verifier.providerWritesPerformed, false);
    assert.deepEqual(verifier.observedBlockingCodes, [
      "HF_INVENTORY_COUNT_MISMATCH_OR_UNAVAILABLE",
      "lyte:SOURCE_REVISION_MISMATCH",
    ]);
  });

  it("routes current drift to the repositories that own the repair", () => {
    const byCode = Object.fromEntries(wave.alignmentDrift.map((item) => [item.code, item]));
    assert.deepEqual(byCode.HF_INVENTORY_COUNT_MISMATCH_OR_UNAVAILABLE.declaredCounts, {
      models: 45, datasets: 34, spaces: 17,
    });
    assert.deepEqual(byCode.HF_INVENTORY_COUNT_MISMATCH_OR_UNAVAILABLE.observedCounts, {
      models: 46, datasets: 35, spaces: 21,
    });
    assert.equal(byCode["lyte:SOURCE_REVISION_MISMATCH"].canonicalSourceRevision, LYTE);
    assert.equal(byCode["lyte:SOURCE_REVISION_MISMATCH"].runtimeSourceRevision, LYTE_RUNTIME);
    assert.equal(byCode.PROOF_FRONTIER_RECORD_STALE_PRODUCT_REVISION.owner, "szl-holdings/a11oy-net");
    assert.equal(wave.holdConditions[0].code, "PRODUCT_HF_ARTIFACT_BINDING_NOT_REOBSERVED");
  });
});
