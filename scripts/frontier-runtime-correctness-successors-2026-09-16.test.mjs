import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-16-runtime-correctness-successors.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "81d787df65791384b5629ca1b80b4c3f179eef3c");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#168");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.candidates.length, 4);

const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));

assert.equal(
  byId["transformers-qwen38-gguf"].upstreamRevision,
  "41f519e7419f5c4cf71d173403caae63c5b28275",
);
assert.equal(byId["transformers-qwen38-gguf"].upstreamPullRequest, 48660);
assert.ok(byId["transformers-qwen38-gguf"].requiredEvidence.some((x) => x.includes("dequantization")));
assert.ok(byId["transformers-qwen38-gguf"].requiredEvidence.some((x) => x.includes("rollback")));

assert.equal(
  byId["vllm-kimik3-rocm-a4w4-flydsl"].upstreamRevision,
  "a4d2d9d95edd2db39cc7dec0a3433c764ff2c578",
);
assert.equal(
  byId["vllm-kimik3-rocm-a4w4-flydsl"].upstreamParent,
  "c8d1cf077a7878ea30040a33ac61262003a3953a",
);
assert.ok(byId["vllm-kimik3-rocm-a4w4-flydsl"].requiredDependency.includes("AITER"));
assert.ok(byId["vllm-kimik3-rocm-a4w4-flydsl"].requiredEvidence.some((x) => x.includes("UNAVAILABLE")));

assert.equal(
  byId["vllm-glm53-flash-quark-mxfp4"].upstreamRevision,
  "c8d1cf077a7878ea30040a33ac61262003a3953a",
);
assert.equal(byId["vllm-glm53-flash-quark-mxfp4"].priority, "P0");
assert.ok(byId["vllm-glm53-flash-quark-mxfp4"].requiredEvidence.some((x) => x.includes("weight_scale")));
assert.ok(byId["vllm-glm53-flash-quark-mxfp4"].requiredEvidence.some((x) => x.includes("rollback")));

assert.equal(
  byId["sglang-rocm-eagle-sampling-correctness"].upstreamRevision,
  "7eedd57ab0970dab586fa8ab00d4e4de93392ff5",
);
assert.equal(byId["sglang-rocm-eagle-sampling-correctness"].priority, "P0");
assert.ok(byId["sglang-rocm-eagle-sampling-correctness"].requiredEvidence.some((x) => x.includes("temperature/top-p")));
assert.ok(byId["sglang-rocm-eagle-sampling-correctness"].requiredEvidence.some((x) => x.includes("NaN")));

for (const candidate of wave.candidates) {
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(candidate.requiredEvidence.length >= 5);
}

assert.equal(wave.alignmentObservation.githubA11oyProtectedMain, "ebfd70f4c6915c2640cf82a97c7f22b6c62906eb");
assert.equal(wave.alignmentObservation.a11oyProductHonestyGitSha, "ebfd70f4c6915c2640cf82a97c7f22b6c62906eb");
assert.equal(wave.alignmentObservation.sourceToProductParity, true);
assert.equal(wave.alignmentObservation.fullChainClosed, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);
assert.match(wave.projection.huggingFace, /UNTIL_QUALIFIED/);
assert.match(wave.projection.a11oy.net, /MEASURED_RECEIPTS/);

console.log("2026-09-16 runtime correctness successor wave invariants OK");
