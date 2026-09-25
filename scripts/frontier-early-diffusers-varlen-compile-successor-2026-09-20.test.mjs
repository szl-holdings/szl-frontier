import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-20-early-diffusers-varlen-compile-successor.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-20-early-diffusers-varlen-compile-successor");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "4f40cdf2f0bb218f75f43e03e7246f67fb24583f");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#180");
assert.equal(wave.predecessorWave, "2026-09-19-late-flashmla-ragged-decode-successors");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.paidExecutionAuthorized, false);
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);

assert.equal(wave.candidates.length, 1);
const candidate = wave.candidates[0];
assert.equal(candidate.id, "diffusers-flash-sage-varlen-dynamic-compile-shape-integrity");
assert.equal(candidate.upstreamRepository, "huggingface/diffusers");
assert.equal(candidate.upstreamRevision, "80c7ed262aeffbeb43ef13ae04baeb9b84515a69");
assert.equal(candidate.upstreamPullRequest, 14568);
assert.equal(candidate.primarySourceUrl, "https://github.com/huggingface/diffusers/pull/14568");
assert.equal(candidate.sourceVerification, "EXACT_GITHUB_COMMIT_OBSERVED");
assert.equal(candidate.signatureVerification, "GITHUB_VERIFIED_VALID");
assert.equal(candidate.upstreamLicenseObserved, "Apache-2.0");
assert.equal(candidate.inheritsQualification, false);
assert.equal(candidate.productionDisposition, "HOLD");
assert.ok(Array.isArray(candidate.materiality) && candidate.materiality.length >= 2);
assert.ok(Array.isArray(candidate.disconfirmingEvidence) && candidate.disconfirmingEvidence.length >= 2);
assert.ok(Array.isArray(candidate.requiredEvidence) && candidate.requiredEvidence.length >= 6);
assert.ok(candidate.requiredEvidence.some((entry) => /exact Diffusers commit\/wheel|Bind exact Diffusers/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /predecessor|known-bad/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /zero-length/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /FlashAttention evidence does not automatically qualify SageAttention/i.test(entry)));
assert.ok(candidate.requiredEvidence.some((entry) => /rollback|eager\/uncompiled/i.test(entry)));
assert.ok(candidate.disconfirmingEvidence.some((entry) => /upstream measurement and not an SZL runtime receipt/i.test(entry)));
assert.ok(candidate.disconfirmingEvidence.some((entry) => /masked key-length path remains data-dependent/i.test(entry)));
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

console.log(`verified ${wave.wave}: exact Diffusers successor remains EVALUATION/HOLD`);
