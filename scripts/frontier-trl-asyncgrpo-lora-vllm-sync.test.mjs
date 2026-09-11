import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-10-trl-asyncgrpo-lora-vllm-sync.json", import.meta.url), "utf8"),
);

assert.equal(wave.schema, "szl.frontier.wave/v1");
assert.equal(wave.disposition, "EVALUATION");
assert.equal(wave.productionAuthorized, false);
assert.equal(wave.automaticPromotionAuthorized, false);
assert.equal(wave.candidate.repository, "huggingface/trl");
assert.equal(wave.candidate.revision, "f540773f5250c816e992ae3d35a41142ef3625c0");
assert.equal(wave.candidate.releaseStatus, "post-v1.13.0-main-commit");
assert.equal(wave.deduplication.exactFeatureAlreadyRepresented, false);
assert.equal(wave.evaluationOwner, "szl-holdings/szl-forge");

for (const property of [
  "adapterOnlySync",
  "mergedWeightFallback",
  "requiresExplicitVllmLoraEnablement",
  "runtimeAdapterUpdateEndpointRequired",
  "sharedFilesystemAdapterCache",
  "stalenessVersionWindow",
  "checkpointPersistenceRequired",
  "hybridRecurrentLogprobDriftWarning",
]) {
  assert.equal(wave.materialProperties[property], true, `${property} must be explicit`);
}

for (const denied of [
  "productionTrainingAuthorized",
  "productionServingAuthorized",
  "providerCredentialUseAuthorized",
  "externalProviderWriteAuthorized",
  "automaticRoutePromotionAuthorized",
  "branchProtectionMutationAuthorized",
  "weightRehostingAuthorized",
]) {
  assert.equal(wave.authority[denied], false, `${denied} must remain denied`);
}

const gates = wave.requiredEvaluation.join("\n");
for (const required of [
  /adapter-only versus merged/i,
  /max_lora_rank/i,
  /max_loras/i,
  /shared-filesystem/i,
  /checkpoint survival/i,
  /server-without-LoRA/i,
  /hybrid recurrent-state/i,
]) {
  assert.match(gates, required);
}
assert.match(wave.promotionRule, /separate normal-control qualification/i);

console.log("TRL AsyncGRPO LoRA/vLLM governed evaluation contract: PASS");
