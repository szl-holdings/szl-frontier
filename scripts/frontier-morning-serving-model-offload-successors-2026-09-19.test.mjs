import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-19-morning-serving-model-offload-successors.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-19-morning-serving-model-offload-successors");
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
    "vllm-mimo-v25-fused-fp8-qkv-sharding",
    ["vllm-project/vllm", "211e252d0b4f8429f9b15fc52bdfed07782c7f70", 57508],
  ],
  [
    "sglang-non-v4-compiled-moe-mhc-context-isolation",
    ["sgl-project/sglang", "76f9213a411018547f4fd6a75f36feaa4d6bed58", 40353],
  ],
  [
    "vllm-omni-prefix-cache-manager-controller-state-machine",
    ["vllm-project/vllm-omni", "470ec60848fa98e030298706cceff88ae8f691a8", 6654],
  ],
  [
    "vllm-omni-distributed-layerwise-offload-plan-topology",
    ["vllm-project/vllm-omni", "ea84055507971c4a7f31d4efdba1488f50c264ae", 7326],
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
    `${candidate.id} must bind exact source/runtime identity`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /predecessor|known-bad|control/i.test(entry)),
    `${candidate.id} must carry an explicit negative/predecessor control`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /rollback|previously qualified|no-offload|cache-disable/i.test(entry)),
    `${candidate.id} must preserve rollback`,
  );
}

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
assert.match(wave.alignmentDependency.observedA11oySourceRevision, /^[0-9a-f]{40}$/);
assert.equal(
  wave.alignmentDependency.observedA11oySourceRevision,
  wave.alignmentDependency.observedHfRuntimeSourceRevision,
);
assert.equal(
  wave.alignmentDependency.observedA11oySourceRevision,
  wave.alignmentDependency.observedProductRuntimeSourceRevision,
);
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
  wave.projection.a11oyNet,
  undefined,
  "proof projection key must preserve the canonical a11oy.net spelling",
);
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
