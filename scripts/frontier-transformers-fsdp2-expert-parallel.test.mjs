import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-transformers-fsdp2-expert-parallel.json", import.meta.url),
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
  "415e6d2f596ef2bd44fdee4261799200a7fc02bf",
);
assert.equal(
  wave.candidate.upstream.parentRevision,
  "5474a55e920f358d8382f3ecd3377edca979baa1",
);
assert.equal(wave.candidate.upstream.upstreamPullRequest, 48516);
assert.equal(wave.candidate.upstream.commitSignatureVerified, true);
assert.equal(wave.candidate.upstream.releaseState, "MAIN_ONLY_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 255);
assert.equal(wave.candidate.evaluation.frontierIssue, 108);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);
assert.equal(wave.deduplication.fsdp2ExpertParallelLanePreviouslyPresent, false);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#255");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /sentinel-tail rows/i);
assert.match(changes, /router-score gradients/i);
assert.match(changes, /two-dimensional fsdp\/tp device mesh/i);
assert.match(changes, /optimizer parameter groups/i);
assert.match(changes, /refusing optimizer-checkpoint resume/i);
assert.match(changes, /rejecting pipeline parallelism/i);

const upstream = wave.candidate.upstreamReportedEvidence;
assert.equal(upstream.label, "UPSTREAM_REPORTED_NOT_SZL_MEASURED");
assert.equal(upstream.qualificationEffect, "none");
assert.match(upstream.gradientReference, /3\/179/);
assert.match(upstream.gradientReference, /179\/179/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /torch and accelerate versions/i);
assert.match(acceptance, /CUDA driver and NCCL/i);
assert.match(acceptance, /single-device and Expert-Parallel-only/i);
assert.match(acceptance, /router, non-expert and expert parameter gradients/i);
assert.match(acceptance, /NaN or Inf gradient propagation/i);
assert.match(acceptance, /grouped-GEMM sentinel-tail masking/i);
assert.match(acceptance, /fsdp\/tp mesh shape/i);
assert.match(acceptance, /router-score gradient all-reduce/i);
assert.match(acceptance, /save_pretrained state-dict gather/i);
assert.match(acceptance, /optimizer checkpoint resume unsupported/i);
assert.match(acceptance, /rank loss, collective timeout, malformed mesh, OOM, cancellation/i);
assert.match(acceptance, /Correctness precedes performance/i);
assert.match(acceptance, /automatic promotion false/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /no SZL model, adapter/i);
assert.match(wave.authorityChain.productRuntime, /no a-11-oy\.com training or inference route/i);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.match(wave.alignment.claimBoundary, /does not by itself prove stable training/i);
assert.match(wave.alignment.claimBoundary, /resumability/i);

console.log("Transformers FSDP2 + Expert Parallel governed evaluation: PASS");
