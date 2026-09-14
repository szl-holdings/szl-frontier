import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-estate-alignment-drift.json", import.meta.url),
    "utf8",
  ),
);

const terminalSource = "a7bf14a576bc79b4db1945384c55a3c56b109670";

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.kind, "authority-chain-alignment-drift");
assert.equal(wave.candidate.priority, "P0");
assert.equal(
  wave.candidate.protectedSource,
  "f02f4978c32665b55c41f1b3f47cfa087c3b69a0",
);

// Historical failing and exact-head candidate evidence remain immutable context.
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

const candidate = wave.candidate.currentCandidateEvidence;
assert.equal(candidate.repairPullRequest, "szl-holdings/a11oy#2142");
assert.equal(candidate.headRevision, "b8241fca605aba03890b2caba519aed3ca3569bc");
assert.equal(candidate.verifierRun, 34733259799);
assert.equal(
  candidate.artifactDigest,
  "sha256:bfae52a577825974b5111d4bf80aef3f063eedde526101944c29c33815abd78d",
);
assert.equal(candidate.releaseId, "dc182307ce756cdc6ff94ff9");
assert.equal(
  candidate.proofChainSha256,
  "f1de94e8e79cfcefd6a5a3d1920e864a93521aebd1c6386df8010d42b557bd40",
);
assert.equal(candidate.state, "ALIGNED");
assert.deepEqual(candidate.blockers, []);

// Terminal closure must be fresh protected-main native evidence, not a rewrite
// of the historical candidate receipt.
const terminal = wave.candidate.terminalProtectedMainEvidence;
assert.equal(terminal.repairRun, 34791261715);
assert.equal(terminal.runAttempt, 1);
assert.equal(terminal.event, "workflow_dispatch");
assert.equal(terminal.sourceRevision, terminalSource);
assert.equal(terminal.state, "ALIGNED");
assert.deepEqual(terminal.blockers, []);
assert.equal(
  terminal.artifactDigest,
  "sha256:5352ba55dcdc300b87e37ee8940270fbefd970bf8f5a38fd51766d9cf494031c",
);
assert.equal(
  terminal.estateReceiptSha256,
  "47797b73423fb5e1c7d15420f7801b06a2233a62d0460c670fdb4948ab652c1b",
);
assert.equal(
  terminal.publicInventoryReceiptSha256,
  "f5f799d89938c0ee7945b5bab49740415a98099ba9a30380f4e5873f24360bd9",
);
assert.equal(
  terminal.publicInventoryRecordSha256,
  "822d82474c5f4273cf403e072307650c3c0aae15bc7ec467d06a0ef0114963eb",
);
assert.equal(terminal.canonicalWriterDispatch.reason, "PRODUCT_AND_VERTICAL");
assert.equal(terminal.canonicalWriterDispatch.verticalFlagships, true);
assert.equal(terminal.canonicalWriterDispatch.approvedPlanBoundToSource, true);
assert.equal(terminal.canonicalWriterDispatch.productionAuthorization, false);

assert.deepEqual(wave.candidate.evaluation.relatedPullRequests, [2124, 2142]);
assert.equal(wave.candidate.evaluation.frontierIssue, 96);
assert.equal(
  wave.candidate.evaluation.status,
  "PROTECTED_MAIN_ALIGNMENT_REPAIRED",
);

for (const key of ["a11oy", "counsel", "finance", "terra"]) {
  assert.equal(wave.currentRuntimeWitnesses[key], terminalSource);
  assert.equal(terminal.requiredRuntimeWitnesses[key], terminalSource);
}
assert.equal(
  wave.currentRuntimeWitnesses.lyte,
  "9ce4e6b5f36fe0b094a07308abe3665cd2a210c1",
);
assert.equal(
  wave.currentRuntimeWitnesses.killinchu,
  "1335a7a7205355eab4485aba3fab512f0362341b",
);
assert.equal(
  wave.currentRuntimeWitnesses["vertical-services"],
  "d018c1f2c892bd36f8ba7e9c85ee0430da348a17",
);
assert.deepEqual(
  Object.keys(terminal.requiredRuntimeWitnesses).sort(),
  ["a11oy", "counsel", "finance", "killinchu", "lyte", "terra", "vertical-services"].sort(),
);
assert.equal(
  wave.configuredRequiredComponentState,
  "ALIGNED_PROTECTED_MAIN_NATIVE_RECEIPT",
);

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
assert.equal(
  wave.semanticDriftRootCause.repairDisposition,
  "RESOLVED_BY_ADMITTED_VERIFIER_AND_CANONICAL_WRITER_REPAIR",
);

assert.equal(wave.inventoryPredicate.scope, "hf-public-author-membership/v1");
assert.equal(
  wave.inventoryPredicate.scopeSha256,
  "9060fa8d7edcd5c246b86bcfcf1916df44b18038253325336f2f46208f8001ae",
);
assert.equal(wave.inventoryPredicate.state, "ALIGNED");
assert.equal(wave.inventoryPredicate.models, 46);
assert.equal(wave.inventoryPredicate.datasets, 35);
assert.equal(wave.inventoryPredicate.spaces, 21);
assert.equal(wave.inventoryPredicate.itemDeltas, false);

// The acceptance contract advanced from candidate admission to terminal receipt;
// none of the original fail-closed boundaries are removed.
const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Do not create a second writer/i);
assert.match(acceptance, /provider_scripts evidence/i);
assert.match(acceptance, /unknown external scripts/i);
assert.match(acceptance, /terminal closure requires protected-main native evidence/i);
assert.match(acceptance, /authorized repair plan and writer dispatch.*exact protected A11oy source/i);
assert.match(acceptance, /fresh native estate-release-train receipt showing ALIGNED/i);
assert.match(acceptance, /planted or unknown semantic differences.*fail closed/i);
assert.match(acceptance, /do not delete, hide, retype or duplicate assets/i);
assert.match(acceptance, /Sentra and David Leads are non-required/i);
assert.match(acceptance, /Historical failing and aligned receipts remain immutable/i);

// Optional observations stay visible but cannot substitute for required scope.
assert.equal(terminal.nonRequiredObservations.sentra.required, false);
assert.equal(terminal.nonRequiredObservations.sentra.aligned, false);
assert.ok(terminal.nonRequiredObservations.sentra.blockers.length > 0);
assert.equal(terminal.nonRequiredObservations["david-leads"].required, false);
assert.equal(terminal.nonRequiredObservations["david-leads"].aligned, false);
assert.ok(terminal.nonRequiredObservations["david-leads"].blockers.length > 0);

assert.equal(wave.alignment.state, "ALIGNED");
assert.equal(
  wave.alignment.productionDisposition,
  "ALIGNMENT_REPAIRED_NO_PRODUCTION_PROMOTION",
);
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /source-exact and RUNNING/i);
assert.match(wave.authorityChain.productRuntime, /source-exact.*semantic parity is true/i);
assert.match(wave.authorityChain.proofEvidence, /a11oy\.net is aligned/i);
assert.match(wave.alignment.claimBoundary, /production_authorization remains false/i);
assert.match(wave.alignment.claimBoundary, /no model, training, GPU, serving-default/i);

console.log("Estate authority-chain alignment terminal record: PASS");
