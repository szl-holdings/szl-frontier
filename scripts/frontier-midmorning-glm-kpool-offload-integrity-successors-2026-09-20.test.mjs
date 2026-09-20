import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-20-midmorning-glm-kpool-offload-integrity-successors.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-20-midmorning-glm-kpool-offload-integrity-successors");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "b3aee6443b484768d1de107449918a050fe8528d");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#180");
assert.equal(wave.predecessorWave, "2026-09-20-early-diffusers-varlen-compile-successor");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.paidExecutionAuthorized, false);
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);

assert.equal(wave.candidates.length, 2);
const byId = new Map(wave.candidates.map((candidate) => [candidate.id, candidate]));

const stride = byId.get("vllm-glm53-kpool-padded-stride-cache-integrity");
assert.ok(stride);
assert.equal(stride.priority, "P0");
assert.equal(stride.upstreamRepository, "vllm-project/vllm");
assert.equal(stride.upstreamRevision, "db1bfdd4fb0dd7b8226402ee00abc7a987561b7c");
assert.equal(stride.upstreamPullRequest, 57477);
assert.equal(stride.primarySourceUrl, "https://github.com/vllm-project/vllm/pull/57477");
assert.equal(stride.signatureVerification, "GITHUB_VERIFIED_VALID");
assert.equal(stride.upstreamLicenseObserved, "Apache-2.0");
assert.equal(stride.inheritsQualification, false);
assert.equal(stride.productionDisposition, "HOLD");
assert.ok(stride.deduplication.some((entry) => /#57317/.test(entry)));
assert.ok(stride.requiredEvidence.some((entry) => /known-bad predecessor/i.test(entry)));
assert.ok(stride.requiredEvidence.some((entry) => /byte-level isolation/i.test(entry)));
assert.ok(stride.requiredEvidence.some((entry) => /AMD only as a non-regression/i.test(entry)));
assert.ok(stride.requiredEvidence.some((entry) => /rollback/i.test(entry)));
assert.ok(stride.disconfirmingEvidence.some((entry) => /not SZL runtime receipts/i.test(entry)));

const offload = byId.get("vllm-simple-cpu-offload-noncacheable-group-isolation");
assert.ok(offload);
assert.equal(offload.priority, "P0");
assert.equal(offload.upstreamRepository, "vllm-project/vllm");
assert.equal(offload.upstreamRevision, "f648eed23dc48fcc8ba64be0c4182f8e775b5bfa");
assert.equal(offload.upstreamPullRequest, 56810);
assert.equal(offload.primarySourceUrl, "https://github.com/vllm-project/vllm/pull/56810");
assert.equal(offload.signatureVerification, "GITHUB_VERIFIED_VALID");
assert.equal(offload.upstreamLicenseObserved, "Apache-2.0");
assert.equal(offload.inheritsQualification, false);
assert.equal(offload.productionDisposition, "HOLD");
assert.ok(offload.deduplication.some((entry) => /#57160/.test(entry)));
assert.ok(offload.deduplication.some((entry) => /#57477/.test(entry)));
assert.ok(offload.requiredEvidence.some((entry) => /known-bad predecessor/i.test(entry)));
assert.ok(offload.requiredEvidence.some((entry) => /never enter prefix-cache store\/load/i.test(entry)));
assert.ok(offload.requiredEvidence.some((entry) => /events enabled and disabled/i.test(entry)));
assert.ok(offload.requiredEvidence.some((entry) => /rollback/i.test(entry)));
assert.ok(offload.disconfirmingEvidence.some((entry) => /not SZL runtime or model-quality receipts/i.test(entry)));

for (const candidate of wave.candidates) {
  assert.equal(candidate.sourceVerification, "EXACT_GITHUB_COMMIT_OBSERVED");
  assert.equal(candidate.signatureVerification, "GITHUB_VERIFIED_VALID");
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(Array.isArray(candidate.materiality) && candidate.materiality.length >= 3);
  assert.ok(Array.isArray(candidate.disconfirmingEvidence) && candidate.disconfirmingEvidence.length >= 3);
  assert.ok(Array.isArray(candidate.requiredEvidence) && candidate.requiredEvidence.length >= 8);
  assert.match(candidate.boundedResources, /New paid spend is zero/);
}

assert.equal(wave.owners.canonicalGovernance, "szl-holdings/szl-frontier#180");
assert.equal(wave.owners.deterministicEvaluation, "szl-holdings/szl-forge");
assert.equal(wave.owners.acceleratorClosure, "szl-holdings/szl-gpu-bridge");
assert.equal(wave.owners.productProjectionAfterQualification, "szl-holdings/a11oy");
assert.equal(wave.owners.proofProjectionAfterMeasuredReceipts, "szl-holdings/a11oy-net");
assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, "szl-holdings/szl-frontier#151");
assert.equal(wave.alignmentDependency.currentWholeChainClosureClaim, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log(`verified ${wave.wave}: two exact vLLM successors remain EVALUATION/HOLD`);
