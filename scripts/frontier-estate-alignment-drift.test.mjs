import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-estate-alignment-drift.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.kind, "authority-chain-alignment-drift");
assert.equal(wave.candidate.priority, "P0");
assert.equal(
  wave.candidate.protectedSource,
  "f02f4978c32665b55c41f1b3f47cfa087c3b69a0",
);
assert.equal(wave.candidate.history.failingRun, 34729765971);
assert.equal(
  wave.candidate.history.failingArtifactDigest,
  "sha256:8434e97b4a4b9d17a8f5019a5acd257e516539e2669e416c34bc2d16597dfe7a",
);
assert.deepEqual(wave.candidate.history.failingBlockers, [
  "PRODUCT_DOMAIN_SPACE_SEMANTIC_DRIFT",
  "counsel:SOURCE_REVISION_MISMATCH",
  "finance:SOURCE_REVISION_MISMATCH",
  "lyte:SOURCE_REVISION_MISMATCH",
  "terra:SOURCE_REVISION_MISMATCH",
]);

const current = wave.candidate.currentCandidateEvidence;
assert.equal(current.repairPullRequest, "szl-holdings/a11oy#2142");
assert.equal(current.headRevision, "b8241fca605aba03890b2caba519aed3ca3569bc");
assert.equal(current.verifierRun, 34733259799);
assert.equal(
  current.artifactDigest,
  "sha256:bfae52a577825974b5111d4bf80aef3f063eedde526101944c29c33815abd78d",
);
assert.equal(current.releaseId, "dc182307ce756cdc6ff94ff9");
assert.equal(
  current.proofChainSha256,
  "f1de94e8e79cfcefd6a5a3d1920e864a93521aebd1c6386df8010d42b557bd40",
);
assert.equal(current.state, "ALIGNED");
assert.deepEqual(current.blockers, []);
assert.deepEqual(wave.candidate.evaluation.relatedPullRequests, [2124, 2142]);
assert.equal(wave.candidate.evaluation.frontierIssue, 96);
assert.equal(
  wave.candidate.evaluation.status,
  "CANDIDATE_ALIGNED_PENDING_PROTECTED_MAIN_ADMISSION",
);

for (const key of ["a11oy", "counsel", "finance", "terra"]) {
  assert.equal(
    wave.currentRuntimeWitnesses[key],
    "f02f4978c32665b55c41f1b3f47cfa087c3b69a0",
  );
}
assert.equal(
  wave.currentRuntimeWitnesses.lyte,
  "9ce4e6b5f36fe0b094a07308abe3665cd2a210c1",
);
assert.equal(
  wave.currentRuntimeWitnesses.killinchu,
  "06ab306bdebacc678cc04ca30ba5022c893c8f5a",
);
assert.equal(
  wave.currentRuntimeWitnesses["vertical-services"],
  "d018c1f2c892bd36f8ba7e9c85ee0430da348a17",
);
assert.equal(wave.configuredRequiredComponentState, "ALIGNED_IN_CANDIDATE_READBACK");

assert.equal(
  wave.semanticDriftRootCause.classification,
  "VERIFIER_FALSE_POSITIVE_PROVIDER_INJECTION",
);
assert.equal(wave.semanticDriftRootCause.domainAndSpaceSourceRevisionEqual, true);
assert.match(
  wave.semanticDriftRootCause.providerScript,
  /^https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js\//,
);
assert.equal(
  wave.semanticDriftRootCause.candidateSemanticSha256,
  "6c1dd9bc05e119d6d8df1fcd3655e67a61a4a8bbf711ce3e86fe38f3b0c9a3a0",
);
assert.equal(wave.semanticDriftRootCause.repairPullRequest, "szl-holdings/a11oy#2142");
assert.match(wave.semanticDriftRootCause.repairDisposition, /DRAFT_HOLD/);

assert.equal(wave.inventoryPredicate.scope, "hf-public-author-membership/v1");
assert.equal(wave.inventoryPredicate.state, "ALIGNED");
assert.equal(wave.inventoryPredicate.models, 46);
assert.equal(wave.inventoryPredicate.datasets, 35);
assert.equal(wave.inventoryPredicate.spaces, 21);
assert.equal(wave.inventoryPredicate.itemDeltas, false);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Do not create a second writer/i);
assert.match(acceptance, /provider_scripts evidence/i);
assert.match(acceptance, /unknown external scripts/i);
assert.match(acceptance, /exact-head candidate evidence/i);
assert.match(acceptance, /normal repository checks and review requirements/i);
assert.match(acceptance, /protected A11oy main/i);
assert.match(acceptance, /fresh protected-main native estate-release-train receipt/i);
assert.match(acceptance, /planted or unknown semantic differences.*fail closed/i);
assert.match(acceptance, /do not delete, hide, retype or duplicate assets/i);
assert.match(acceptance, /Sentra and David Leads are non-required/i);
assert.match(acceptance, /Historical failing and aligned receipts remain immutable/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /currently source-exact/i);
assert.match(wave.authorityChain.productRuntime, /candidate semantic parity is true/i);
assert.match(wave.authorityChain.proofEvidence, /waits for protected-main verifier admission/i);
assert.match(wave.alignment.claimBoundary, /Runtime projection drift has been repaired/i);
assert.match(wave.alignment.claimBoundary, /remains HOLD/i);

console.log("Estate authority-chain drift record: PASS");
