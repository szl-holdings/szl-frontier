import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-transformers-pp-tp-inference.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.repository, "huggingface/transformers");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "5474a55e920f358d8382f3ecd3377edca979baa1",
);
assert.equal(wave.candidate.upstream.upstreamPullRequest, 48155);
assert.equal(wave.candidate.upstream.releaseState, "MAIN_ONLY_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 253);
assert.equal(wave.candidate.evaluation.frontierIssue, 106);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);
assert.equal(wave.deduplication.combinedPpTpLanePreviouslyPresent, false);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#253");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /named device mesh/i);
assert.match(changes, /pipeline parallelism and tensor parallelism/i);
assert.match(changes, /reject FSDP combined/i);
assert.match(changes, /global ranks/i);
assert.match(changes, /multimodal\/VLM support was explicitly reverted/i);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /torch version/i);
assert.match(acceptance, /single-process, PP-only and TP-only/i);
assert.match(acceptance, /world_size equals pp_size times tp_size/i);
assert.match(acceptance, /process-group to global-rank translation/i);
assert.match(acceptance, /incompatible device_map/i);
assert.match(acceptance, /MPS tensor parallelism/i);
assert.match(acceptance, /Correctness precedes performance/i);
assert.match(acceptance, /stage-boundary tensor shapes and dtypes/i);
assert.match(acceptance, /same-hardware latency, throughput and memory/i);
assert.match(acceptance, /process loss, timeout, cancellation/i);
assert.match(acceptance, /multimodal or VLM/i);
assert.match(acceptance, /automatic promotion false/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /no SZL model/i);
assert.match(wave.authorityChain.productRuntime, /no a-11-oy\.com inference route/i);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.match(wave.alignment.claimBoundary, /does not by itself prove faster inference/i);
assert.match(wave.alignment.claimBoundary, /multimodal support/i);

console.log("Transformers combined PP+TP governed evaluation: PASS");
