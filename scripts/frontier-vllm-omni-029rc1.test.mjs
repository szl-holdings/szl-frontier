import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const path = new URL("../frontier/waves/2026-09-13-vllm-omni-0.29.0rc1.json", import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, "utf8"));
const candidate = wave.candidate;
const material = candidate.materialChanges.join("\n");
const acceptance = candidate.acceptance.join("\n");

const EXPECTED_BLOCKERS = [
  "counsel:SOURCE_REVISION_MISMATCH",
  "finance:SOURCE_REVISION_MISMATCH",
  "terra:SOURCE_REVISION_MISMATCH",
];

test("governed vLLM-Omni RC identity is exact and fail-closed", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.noWeightRehostingForInventory, true);

  assert.equal(candidate.upstream.repository, "vllm-project/vllm-omni");
  assert.equal(candidate.upstream.tag, "v0.29.0rc1");
  assert.equal(candidate.upstream.revision, "aff7d64948f6c0e81e9b3272234623044e215967");
  assert.equal(candidate.upstream.license, "Apache-2.0");
  assert.equal(candidate.upstream.prerelease, true);
  assert.equal(candidate.upstream.immutableRelease, false);
  assert.equal(candidate.upstream.baseRuntime, "vLLM 0.29.0");
  assert.equal(candidate.status, "EVALUATION");
  assert.equal(candidate.productionDisposition, "HOLD");
});

test("material runtime changes cannot be collapsed into the plain vLLM wave", () => {
  assert.match(material, /full-duplex/i);
  assert.match(material, /server-side VAD/i);
  assert.match(material, /BAGEL continuous batching/i);
  assert.match(material, /parallel_stage_init/i);
  assert.match(material, /Mooncake/i);
  assert.match(material, /end-to-end completion handling is not yet complete/i);
  assert.match(material, /diffusion_batch_size/i);
  assert.match(material, /max_num_seqs/i);
  assert.equal(wave.deduplication.exactCandidatePreviouslyPresent, false);
  assert.match(wave.deduplication.newMaterialBoundary, /multimodal serving\/runtime boundary/i);
});

test("qualification requires measured identity, unavailable floors, migration safety and rollback", () => {
  assert.match(acceptance, /exact package or container digest actually executed/i);
  assert.match(acceptance, /CUDA, driver and accelerator identity/i);
  assert.match(acceptance, /record UNAVAILABLE/i);
  assert.match(acceptance, /parallel_stage_init only as opt-in/i);
  assert.match(acceptance, /actual end-to-end completion witness/i);
  assert.match(acceptance, /diffusion_batch_size is rejected or migrated explicitly/i);
  assert.match(acceptance, /max_num_seqs semantics are preserved/i);
  assert.match(acceptance, /do not rehost upstream weights/i);
  assert.match(acceptance, /rollback\/fallback/i);
  assert.match(acceptance, /do not grant production authority/i);
});

test("estate truth remains independent from this prerelease intake", () => {
  assert.equal(wave.alignmentObservation.directAuthorityChain, "OPERATIONAL_VERIFIED");
  assert.deepEqual(wave.alignmentObservation.remainingBlockers, EXPECTED_BLOCKERS);
  assert.equal(wave.alignmentObservation.readiness.lies, 0);
  assert.equal(wave.alignmentObservation.readiness.throttled, 0);
  assert.equal(wave.alignmentObservation.readiness.unreachable, 0);
  assert.equal(wave.alignmentObservation.productionDisposition, "HOLD");
});

test("responsibility routing stays on the active owners", () => {
  assert.equal(wave.routing.catalogOwner, "szl-holdings/szl-frontier");
  assert.equal(wave.routing.runtimeQualificationOwner, "szl-holdings/szl-forge");
  assert.equal(wave.routing.servingOwner, "szl-holdings/szl-serve");
  assert.equal(wave.routing.gpuInfrastructureOwner, "szl-holdings/szl-gpu-bridge");
  assert.equal(wave.routing.productOwner, "szl-holdings/a11oy");
  assert.equal(wave.routing.proofOwner, "szl-holdings/a11oy-net");
  assert.match(wave.codexCompletionContract.definitionOfDone, /Counsel\/Finance\/Terra estate drift/i);
});
