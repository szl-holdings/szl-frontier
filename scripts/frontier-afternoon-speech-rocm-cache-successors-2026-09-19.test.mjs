import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-19-afternoon-speech-rocm-cache-successors.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-19-afternoon-speech-rocm-cache-successors");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#180");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.deepEqual(wave.authorityChain, [
  "GitHub",
  "Hugging Face",
  "a-11-oy.com",
  "a11oy.net",
]);

const expected = new Map([
  [
    "vllm-omni-higgsaudio-v2-reference-audio-cache-salt",
    ["vllm-project/vllm-omni", "f9f53f2bd8ddf7c7990b167d448108daa50f992a", 7826],
  ],
  [
    "sglang-dsv4-rocm-draft-compressed-kv-metadata-isolation",
    ["sgl-project/sglang", "2305242f514da95eba3c411de0517c4d79ffff94", 40205],
  ],
]);

assert.equal(wave.candidates.length, expected.size);
const ids = new Set();
const revisions = new Set();
for (const candidate of wave.candidates) {
  assert.ok(expected.has(candidate.id), `unexpected candidate ${candidate.id}`);
  assert.equal(ids.has(candidate.id), false, `duplicate candidate ${candidate.id}`);
  ids.add(candidate.id);

  const [repo, revision, pr] = expected.get(candidate.id);
  assert.equal(candidate.upstreamRepository, repo);
  assert.equal(candidate.upstreamRevision, revision);
  assert.equal(candidate.upstreamPullRequest, pr);
  assert.match(candidate.upstreamRevision, /^[0-9a-f]{40}$/);
  assert.equal(revisions.has(candidate.upstreamRevision), false, `duplicate revision ${revision}`);
  revisions.add(candidate.upstreamRevision);

  assert.equal(candidate.sourceVerification, "EXACT_GITHUB_COMMIT_OBSERVED");
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(Array.isArray(candidate.materiality) && candidate.materiality.length >= 2);
  assert.ok(Array.isArray(candidate.requiredEvidence) && candidate.requiredEvidence.length >= 4);
  assert.ok(
    candidate.requiredEvidence.some((entry) => /exact|bind/i.test(entry)),
    `${candidate.id} must bind exact execution identity`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /predecessor|known-bad|negative/i.test(entry)),
    `${candidate.id} must preserve a predecessor/negative control`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /rollback|non-speculative|cache-disable/i.test(entry)),
    `${candidate.id} must preserve rollback`,
  );
}

const higgs = wave.candidates.find(
  (candidate) => candidate.id === "vllm-omni-higgsaudio-v2-reference-audio-cache-salt",
);
assert.equal(higgs.modelReference, "bosonai/higgs-tts-2-3b-base");
assert.equal(higgs.modelLicenseObserved, "other");
assert.equal(
  higgs.licenseDisposition,
  "REVIEW_REQUIRED_BEFORE_REAL_MODEL_EXECUTION_OR_PROJECTION",
);
assert.ok(
  higgs.requiredEvidence.some((entry) => /synthetic/i.test(entry)),
  "HiggsAudio lane must permit source/cache evaluation without downloading weights",
);
assert.ok(
  higgs.requiredEvidence.some((entry) => /license review/i.test(entry)),
  "HiggsAudio real-model execution must remain license-gated",
);

const dsv4 = wave.candidates.find(
  (candidate) => candidate.id === "sglang-dsv4-rocm-draft-compressed-kv-metadata-isolation",
);
assert.ok(
  dsv4.requiredEvidence.some((entry) => /ROCm|HIP|MI3/i.test(entry)),
  "DSV4 draft lane must require affected ROCm hardware/runtime evidence",
);
assert.ok(
  dsv4.requiredEvidence.some((entry) => /CUDA-only evidence cannot qualify/i.test(entry)),
  "CUDA-only evidence must not qualify the ROCm lane",
);

assert.deepEqual(new Set(expected.keys()), ids);
assert.equal(wave.owners.canonicalGovernance, "szl-holdings/szl-frontier#180");
assert.equal(wave.owners.deterministicEvaluation, "szl-holdings/szl-forge");
assert.equal(wave.owners.acceleratorClosure, "szl-holdings/szl-gpu-bridge");
assert.equal(wave.owners.productProjectionAfterQualification, "szl-holdings/a11oy");
assert.equal(wave.owners.proofProjectionAfterMeasuredReceipts, "szl-holdings/a11oy-net");

assert.equal(
  wave.alignmentDependency.canonicalResidualAlignmentIssue,
  "szl-holdings/szl-frontier#151",
);
assert.equal(wave.alignmentDependency.state, "INDEPENDENT_HOLD");
assert.equal(wave.alignmentDependency.currentWholeChainClosureClaim, false);
assert.equal(wave.alignmentDependency.proofCapturedAt, "2026-09-12T01:25:04Z");
assert.deepEqual(wave.alignmentDependency.proofCounts, {
  models: 46,
  datasets: 35,
  spaces: 21,
});
assert.equal(wave.alignmentDependency.proofOperational, false);

assert.equal(
  wave.projection.huggingFace,
  "NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED",
);
assert.equal(wave.projection["a-11-oy.com"], "NO_CAPABILITY_CHANGE_FROM_DISCOVERY");
assert.equal(
  wave.projection["a11oy.net"],
  "EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION",
);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log(
  `verified ${wave.wave}: ${wave.candidates.length} exact-source candidates remain EVALUATION/HOLD`,
);
