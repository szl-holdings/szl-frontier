import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL(
      "../frontier/waves/2026-09-16-late-runtime-correctness-successors.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-16-late-runtime-correctness-successors");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "27e49abd8dd500f28c54d9bf700d23e5542cb503");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#168");
assert.equal(wave.predecessorWave, "szl-holdings/szl-frontier#172");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.candidates.length, 3);

const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));

const causalVl = byId["vllm-deepseek-v41-causal-image-swa"];
assert.equal(causalVl.priority, "P0");
assert.equal(causalVl.upstreamRevision, "9f9e1dac26ff0379651dd7e8ca409b573ccfce54");
assert.equal(causalVl.upstreamPullRequest, 57152);
assert.equal(causalVl.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(causalVl.requiredEvidence.some((item) => item.includes("future image token")));
assert.ok(causalVl.requiredEvidence.some((item) => item.includes("compression ratios 0, 1 and 2")));
assert.ok(causalVl.requiredEvidence.some((item) => item.includes("rollback")));
assert.ok(causalVl.upstreamEvidenceBounds.some((item) => item.includes("did not claim full-model VL accuracy")));

const rocm = byId["vllm-deepseek-v4-rocm-accuracy-revert"];
assert.equal(rocm.priority, "P0");
assert.equal(rocm.upstreamRevision, "bc0f47cd03d6ae99f9f217f096684423bb4ebc2b");
assert.equal(rocm.upstreamPullRequest, 57132);
assert.equal(rocm.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(rocm.materiality.some((item) => item.includes("catastrophic")));
assert.ok(rocm.requiredEvidence.some((item) => item.includes("known-bad predecessor")));
assert.ok(rocm.requiredEvidence.some((item) => item.includes("negative controls")));
assert.ok(rocm.requiredEvidence.some((item) => item.includes("rollback")));

const a100 = byId["vllm-a100-fp8-kernel-selection"];
assert.equal(a100.priority, "P1");
assert.equal(a100.upstreamRevision, "2bdbbc80804b2199cbf39b75e78cf7269d0383a4");
assert.equal(a100.upstreamPullRequest, 55884);
assert.equal(a100.sourceVerification, "GITHUB_VERIFIED_SIGNATURE");
assert.ok(a100.requiredEvidence.some((item) => item.includes("sm80")));
assert.ok(a100.requiredEvidence.some((item) => item.includes("negative control")));
assert.ok(a100.requiredEvidence.some((item) => item.includes("real A100 hardware")));
assert.ok(a100.requiredEvidence.some((item) => item.includes("UNAVAILABLE")));

for (const candidate of wave.candidates) {
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(candidate.materiality.length >= 2);
  assert.ok(candidate.upstreamEvidenceBounds.length >= 2);
  assert.ok(candidate.requiredEvidence.length >= 6);
  assert.ok(candidate.deduplicatesUnder.includes("szl-holdings/szl-frontier#168"));
}

assert.equal(wave.owners.canonicalGovernance, "szl-holdings/szl-frontier#168");
assert.equal(wave.owners.canonicalDeepSeekModelProtocol, "szl-holdings/szl-frontier#134");
assert.equal(wave.owners.deterministicEvaluation, "szl-holdings/szl-forge#331");
assert.equal(wave.owners.acceleratorClosure, "szl-holdings/szl-gpu-bridge#105");
assert.equal(wave.alignmentDependency.canonicalResidualAlignmentPullRequest, "szl-holdings/szl-frontier#159");
assert.equal(wave.alignmentDependency.state, "OPEN_INDEPENDENT_HOLD");
assert.match(wave.alignmentDependency.note, /does not close or override/);

assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);
assert.match(wave.projection.huggingFace, /UNTIL_QUALIFIED/);
assert.match(wave.projection["a-11-oy.com"], /NO_CAPABILITY_CHANGE/);
assert.match(wave.projection["a11oy.net"], /MEASURED_RECEIPTS/);

console.log("2026-09-16 late runtime correctness successor invariants OK");
