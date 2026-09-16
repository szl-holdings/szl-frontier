import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-16-sentence-transformers-faiss-metric.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#170");
assert.equal(wave.priority, "P0");
assert.equal(wave.candidate.upstreamRepository, "huggingface/sentence-transformers");
assert.equal(wave.candidate.upstreamRevision, "7ae9079733b4e7e997f0011a3fef67f73a65aeaa");
assert.equal(wave.candidate.upstreamPullRequest, 4022);
assert.equal(wave.candidate.productionDisposition, "HOLD");
assert.equal(wave.deduplication.exactSourcePreviouslyGoverned, false);
assert.equal(wave.deduplication.inheritsQualification, false);
assert.equal(wave.evaluationOwners.retrievalExposureAndPolicy, "szl-holdings/szl-second-brain#21");
assert.ok(wave.requiredEvidence.some((x) => x.includes("NOT_EXPOSED")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("L2 and inner-product")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("float32 or uint8")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("rollback")));
assert.equal(wave.productionDisposition, "HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);
assert.match(wave.projection.huggingFace, /NO_NEW_SZL_ARTIFACT/);
assert.match(wave.projection.a11oy.net, /MEASURED_RECEIPTS/);

console.log("Sentence Transformers FAISS metric correctness wave invariants OK");
