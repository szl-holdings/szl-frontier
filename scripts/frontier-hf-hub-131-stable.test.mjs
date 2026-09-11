import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-10-hf-hub-131-stable.json", import.meta.url), "utf8"),
);

assert.equal(wave.schema, "szl.frontier.wave/v1");
assert.equal(wave.disposition, "EVALUATION");
assert.equal(wave.productionAuthorized, false);
assert.equal(wave.automaticPromotionAuthorized, false);

assert.deepEqual(
  {
    repository: wave.candidate.repository,
    version: wave.candidate.version,
    releaseCommit: wave.candidate.releaseCommit,
    annotatedTagObject: wave.candidate.annotatedTagObject,
  },
  {
    repository: "huggingface/huggingface_hub",
    version: "1.31.0",
    releaseCommit: "495b17c8529614759ae0f1ccf1ebe9a61c148b7c",
    annotatedTagObject: "32ccc9ee57f3b3546165de105b4a0d8eba1b7446",
  },
);
assert.equal(wave.candidate.tagSignatureVerified, false);
assert.equal(wave.candidate.tagSignatureReason, "unsigned");

assert.equal(wave.deduplication.predecessorVersion, "1.30.0");
assert.equal(wave.deduplication.existingEvaluation.pullRequest, 216);
assert.equal(
  wave.deduplication.existingEvaluation.mergeCommit,
  "74a8a07ced6c6b8697b31b7d0e482c4241d55880",
);
assert.equal(
  wave.deduplication.existingEvaluation.evaluatedReleaseCommit,
  wave.candidate.releaseCommit,
);

for (const denied of [
  "billableSandboxJobCreationAuthorized",
  "hubPublicationAuthorized",
  "providerWriteAuthorized",
  "productionRouteChangeAuthorized",
  "massPurposePinUpgradeAuthorized",
  "weightRehostingAuthorized",
  "branchProtectionMutationAuthorized",
]) {
  assert.equal(wave.policy[denied], false, `${denied} must remain denied`);
}
for (const preserved of ["preserveLicensing", "preserveProvenance", "preserveRollback", "preserveReceipts"]) {
  assert.equal(wave.policy[preserved], true, `${preserved} must remain enabled`);
}

const changes = wave.materialChanges.join("\n");
assert.match(changes, /atomic/i);
assert.match(changes, /unsafe remote filenames/i);
assert.match(changes, /dry-run/i);
assert.match(changes, /Sandbox custom Job labels/i);

assert.match(wave.authorityChain.productRuntime, /HOLD/);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.ok(wave.remainingGates.length >= 4);

console.log("HF Hub 1.31 governed successor contract: PASS");
