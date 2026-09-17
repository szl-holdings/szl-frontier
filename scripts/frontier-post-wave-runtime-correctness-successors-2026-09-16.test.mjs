import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL(
      "../frontier/waves/2026-09-16-post-wave-runtime-correctness-successors.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-16-post-wave-runtime-correctness-successors");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "27e49abd8dd500f28c54d9bf700d23e5542cb503");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#168");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.candidates.length, 3);

const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));

const dsv41Kv = byId["vllm-deepseek-v41-flashmla-nvfp4-kv"];
assert.equal(dsv41Kv.priority, "P0");
assert.equal(dsv41Kv.upstreamRevision, "d6a1677d5504244c566eb900ca605cb5511f4ab4");
assert.equal(dsv41Kv.upstreamPullRequest, 56935);
assert.equal(dsv41Kv.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(dsv41Kv.requiredEvidence.some((item) => item.includes("NVFP4")));
assert.ok(dsv41Kv.requiredEvidence.some((item) => item.includes("SM100")));
assert.ok(dsv41Kv.requiredEvidence.some((item) => item.includes("rollback")));

const kimi = byId["vllm-kimik3-stateless-first-chunk"];
assert.equal(kimi.priority, "P0");
assert.equal(kimi.upstreamRevision, "f8b5c11468f665c75968e3a7c12f16ca074f3a30");
assert.equal(kimi.upstreamPullRequest, 51483);
assert.equal(kimi.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(kimi.requiredEvidence.some((item) => item.includes("stateless first chunk")));
assert.ok(kimi.requiredEvidence.some((item) => item.includes("CUDA-graph capture")));
assert.ok(kimi.requiredEvidence.some((item) => item.includes("recurrent state")));

const sglangComm = byId["sglang-deepseek-v41-communication-kernels"];
assert.equal(sglangComm.priority, "P0");
assert.equal(sglangComm.upstreamRevision, "7d5696b3a1638a7c980e46ed77eb876faad158a2");
assert.equal(sglangComm.upstreamPullRequest, 39653);
assert.equal(sglangComm.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(sglangComm.requiredEvidence.some((item) => item.includes("world size")));
assert.ok(sglangComm.requiredEvidence.some((item) => item.includes("UNAVAILABLE")));
assert.ok(sglangComm.requiredEvidence.some((item) => item.includes("deadlock")));

for (const candidate of wave.candidates) {
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(candidate.materiality.length >= 2);
  assert.ok(candidate.requiredEvidence.length >= 6);
  assert.ok(candidate.deduplicatesUnder.length >= 2);
}

assert.equal(wave.owners.canonicalGovernance, "szl-holdings/szl-frontier#168");
assert.equal(wave.owners.canonicalDeepSeekModelProtocol, "szl-holdings/szl-frontier#134");
assert.equal(wave.owners.deterministicEvaluation, "szl-holdings/szl-forge#331");
assert.equal(wave.owners.acceleratorClosure, "szl-holdings/szl-gpu-bridge#105");

assert.equal(wave.alignmentObservation.githubA11oyProtectedMain, "ebfd70f4c6915c2640cf82a97c7f22b6c62906eb");
assert.equal(wave.alignmentObservation.a11oyProductHonestyGitSha, "ebfd70f4c6915c2640cf82a97c7f22b6c62906eb");
assert.equal(wave.alignmentObservation.sourceToProductParity, true);
assert.equal(wave.alignmentObservation.publicHuggingFacePageObservedModels, 46);
assert.equal(wave.alignmentObservation.sameWindowHuggingFaceMembershipApiVerified, false);
assert.equal(wave.alignmentObservation.huggingFaceConnectorState, "TRANSIENT_UNAVAILABLE_DURING_OBSERVATION");
assert.equal(wave.alignmentObservation.fullChainClosed, false);
assert.equal(wave.alignmentObservation.canonicalResidualAlignmentPullRequest, "szl-holdings/szl-frontier#159");
assert.match(wave.alignmentObservation.note, /Do not infer alignment closure/);

assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);
assert.match(wave.projection.huggingFace, /UNTIL_QUALIFIED/);
assert.match(wave.projection["a-11-oy.com"], /NO_CAPABILITY_CHANGE/);
assert.match(wave.projection["a11oy.net"], /MEASURED_RECEIPTS/);

console.log("2026-09-16 post-wave runtime correctness successor invariants OK");
