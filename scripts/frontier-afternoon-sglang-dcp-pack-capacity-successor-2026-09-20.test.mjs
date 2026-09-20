import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-20-afternoon-sglang-dcp-pack-capacity-successor.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-20-afternoon-sglang-dcp-pack-capacity-successor");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "d24d7a224d1e608f5df6ab6bfc896875d78bfb47");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#180");
assert.equal(wave.predecessorWave, "2026-09-20-midmorning-glm-kpool-offload-integrity-successors");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.paidExecutionAuthorized, false);
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);

assert.equal(wave.candidates.length, 1);
const candidate = wave.candidates[0];
assert.equal(candidate.id, "sglang-pd-cached-prefix-dcp-pack-capacity-isolation");
assert.equal(candidate.priority, "P0");
assert.equal(candidate.upstreamRepository, "sgl-project/sglang");
assert.equal(candidate.upstreamRevision, "b3e4d198af5e74e5070e541475fd767302342be9");
assert.equal(candidate.upstreamPullRequest, 40376);
assert.equal(candidate.primarySourceUrl, "https://github.com/sgl-project/sglang/pull/40376");
assert.equal(candidate.sourceVerification, "EXACT_GITHUB_COMMIT_OBSERVED");
assert.equal(candidate.signatureVerification, "GITHUB_VERIFIED_VALID");
assert.equal(candidate.upstreamLicenseObserved, "Apache-2.0");
assert.equal(candidate.inheritsQualification, false);
assert.equal(candidate.productionDisposition, "HOLD");
assert.ok(candidate.materiality.some((entry) => /adjacent rank/i.test(entry)));
assert.ok(candidate.disconfirmingEvidence.some((entry) => /GPU matrix was not rerun/i.test(entry)));
assert.ok(candidate.disconfirmingEvidence.some((entry) => /RDMA.*interrupted/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /predecessor control/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /sentinel-backed per-rank/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /mixed peers/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /Mooncake RDMA UNQUALIFIED/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /rollback/i.test(entry)));
assert.match(candidate.boundedResources, /New paid spend is zero/);

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

console.log(`verified ${wave.wave}: SGLang DCP pack-capacity successor remains EVALUATION/HOLD`);
