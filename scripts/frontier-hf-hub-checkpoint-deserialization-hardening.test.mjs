import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL(
      "../frontier/waves/2026-09-11-hf-hub-checkpoint-deserialization-hardening.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.wave/v1");
assert.equal(wave.disposition, "EVALUATION");
assert.equal(wave.productionAuthorized, false);
assert.equal(wave.automaticPromotionAuthorized, false);

assert.deepEqual(
  {
    repository: wave.candidate.repository,
    version: wave.candidate.version,
    exactCommit: wave.candidate.exactCommit,
    releasePublished: wave.candidate.releasePublished,
    upstreamPullRequest: wave.candidate.upstreamPullRequest,
  },
  {
    repository: "huggingface/huggingface_hub",
    version: "post-1.31-mainline-security",
    exactCommit: "dd6919c21eabf2434c5db9894081123bd38c988e",
    releasePublished: false,
    upstreamPullRequest: 4877,
  },
);
assert.equal(wave.candidate.commitSignatureVerified, true);
assert.equal(wave.candidate.commitSignatureReason, "valid");

assert.equal(wave.deduplication.stableVersion, "1.31.0");
assert.equal(
  wave.deduplication.stableReleaseCommit,
  "495b17c8529614759ae0f1ccf1ebe9a61c148b7c",
);
assert.equal(wave.deduplication.existingStableEvaluation.pullRequest, 216);
assert.equal(wave.deduplication.trackingIssue, 87);
assert.equal(wave.deduplication.exactCommitPreviouslyCataloged, false);
assert.equal(wave.deduplication.classification, "unreleased-security-successor");

for (const denied of [
  "hubPublicationAuthorized",
  "providerWriteAuthorized",
  "productionRouteChangeAuthorized",
  "productionCheckpointLoadingAuthorized",
  "unsafePickleDefaultAuthorized",
  "massPurposePinUpgradeAuthorized",
  "weightRehostingAuthorized",
  "branchProtectionMutationAuthorized",
]) {
  assert.equal(wave.policy[denied], false, `${denied} must remain denied`);
}
for (const preserved of [
  "preserveStable131Pin",
  "preserveLicensing",
  "preserveProvenance",
  "preserveRollback",
  "preserveReceipts",
]) {
  assert.equal(wave.policy[preserved], true, `${preserved} must remain enabled`);
}

const changes = wave.materialChanges.join("\n");
assert.match(changes, /safe state-dict loading becomes the default/i);
assert.match(changes, /weights_only=true/i);
assert.match(changes, /case-insensitive filesystem/i);
assert.match(changes, /actual shard contents/i);
assert.match(changes, /maximum size/i);

const evidence = wave.requiredEvidence.join("\n");
assert.match(evidence, /exact-commit installation/i);
assert.match(evidence, /safe=true refusal/i);
assert.match(evidence, /older-Torch limitation/i);
assert.match(evidence, /legacy safe=false compatibility/i);

assert.match(wave.authorityChain.productRuntime, /HOLD/);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.ok(wave.remainingGates.some((gate) => /stable Hub 1\.31/i.test(gate)));
assert.ok(wave.remainingGates.some((gate) => /released successor/i.test(gate)));

console.log("HF Hub post-1.31 checkpoint hardening governed wave: PASS");
