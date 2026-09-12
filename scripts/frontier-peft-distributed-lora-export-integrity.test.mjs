import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-peft-distributed-lora-export-integrity.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.repository, "huggingface/peft");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "78bce7cb48f800a7ad0d352b68a46302e13e1687",
);
assert.equal(wave.candidate.upstream.upstreamPullRequest, 3251);
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 257);
assert.equal(wave.candidate.evaluation.frontierIssue, 110);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);
assert.equal(wave.deduplication.distributedLoraExportGuardPreviouslyPresent, false);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#257");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /1-D or zero-sized LoRA A\/B/i);
assert.match(changes, /DeepSpeed ZeRO-3 or FSDP/i);
assert.match(changes, /PeftWarning/i);
assert.match(changes, /explicitly supplied state dicts/i);
assert.match(changes, /DoRA magnitude vectors/i);
assert.match(changes, /does not refuse the write/i);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /torch, DeepSpeed or FSDP, safetensors/i);
assert.match(acceptance, /ungathered one-dimensional or zero-sized/i);
assert.match(acceptance, /PeftWarning behavior/i);
assert.match(acceptance, /explicit-state-dict bypass/i);
assert.match(acceptance, /DoRA magnitude vectors/i);
assert.match(acceptance, /serialized LoRA A\/B tensors/i);
assert.match(acceptance, /at least two-dimensional, non-empty/i);
assert.match(acceptance, /immutable-byte readable/i);
assert.match(acceptance, /successfully reloadable/i);
assert.match(acceptance, /malformed shard/i);
assert.match(acceptance, /fail-closed SZL publisher guard/i);
assert.match(acceptance, /automatic promotion false/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /no SZL adapter/i);
assert.match(wave.authorityChain.proofEvidence, /warning alone is not artifact qualification/i);
assert.match(wave.alignment.claimBoundary, /does not by itself refuse malformed writes/i);
assert.match(wave.alignment.claimBoundary, /authorize publication/i);

console.log("PEFT distributed LoRA export integrity governed evaluation: PASS");
