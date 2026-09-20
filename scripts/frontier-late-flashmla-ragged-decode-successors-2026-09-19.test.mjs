import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const waveUrl = new URL(
  "../frontier/waves/2026-09-19-late-flashmla-ragged-decode-successors.json",
  import.meta.url,
);
const wave = JSON.parse(readFileSync(waveUrl, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-19-late-flashmla-ragged-decode-successors");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "32b2173062dde7098cb881b9264d612324317b4c");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#180");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.paidExecutionAuthorized, false);
assert.deepEqual(wave.authorityChain, [
  "GitHub",
  "Hugging Face",
  "a-11-oy.com",
  "a11oy.net",
]);

const expected = new Map([
  [
    "vllm-fp8-ds-mla-writer-reader-scale-contract",
    ["vllm-project/vllm", "a7fda4c88bfc421d31e33acc5e01e86ebe467ad8", 49435],
  ],
  [
    "vllm-sparse-indexer-ragged-decode-padded-path",
    ["vllm-project/vllm", "133b71e0beec3c7bcaae5b0839a03e7e88d20bc7", 52500],
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
  assert.equal(candidate.signatureVerification, "GITHUB_VERIFIED_VALID");
  assert.equal(candidate.inheritsQualification, false);
  assert.equal(candidate.productionDisposition, "HOLD");
  assert.ok(Array.isArray(candidate.materiality) && candidate.materiality.length >= 2);
  assert.ok(
    Array.isArray(candidate.disconfirmingEvidence) && candidate.disconfirmingEvidence.length >= 1,
    `${candidate.id} must record disconfirming/limiting evidence`,
  );
  assert.ok(candidate.boundedResources && typeof candidate.boundedResources === "object");
  assert.ok(Array.isArray(candidate.requiredEvidence) && candidate.requiredEvidence.length >= 5);
  assert.ok(
    candidate.requiredEvidence.some((entry) => /exact|bind/i.test(entry)),
    `${candidate.id} must bind exact execution identity`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /predecessor|known-bad|negative/i.test(entry)),
    `${candidate.id} must preserve a predecessor/negative control`,
  );
  assert.ok(
    candidate.requiredEvidence.some((entry) => /rollback|incumbent|reference/i.test(entry)),
    `${candidate.id} must preserve rollback`,
  );
  assert.match(candidate.primarySourceUrl, /^https:\/\/github\.com\/vllm-project\/vllm\/pull\/\d+$/);
}

const scale = wave.candidates.find(
  (candidate) => candidate.id === "vllm-fp8-ds-mla-writer-reader-scale-contract",
);
assert.ok(
  scale.requiredEvidence.some((entry) => /SM90 and SM100\/SM103 separately/i.test(entry)),
  "FlashMLA scale lane must not inherit SM100 evidence into SM90",
);
assert.ok(
  scale.disconfirmingEvidence.some((entry) => /SM90 model evaluation was still outstanding/i.test(entry)),
  "FlashMLA lane must retain upstream SM90 limitation",
);
assert.ok(
  scale.requiredEvidence.some((entry) => /all-zero|1e-4|saturation/i.test(entry)),
  "FlashMLA lane must exercise scale boundaries",
);

const ragged = wave.candidates.find(
  (candidate) => candidate.id === "vllm-sparse-indexer-ragged-decode-padded-path",
);
assert.ok(
  ragged.disconfirmingEvidence.some((entry) => /necessary but not sufficient/i.test(entry)),
  "ragged-decode lane must retain the modulo-proxy limitation",
);
assert.ok(
  ragged.requiredEvidence.some((entry) => /\[1,2,3\].*\[1,1,4\]/i.test(entry)),
  "ragged-decode lane must test divisible ragged counterexamples",
);
assert.ok(
  ragged.requiredEvidence.some((entry) => /false-negative remains HOLD/i.test(entry)),
  "ragged-decode residual false negatives must fail closed",
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
