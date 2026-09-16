/**
 * Offline evidence-shape guard for the TRL activation-offload successor.
 *
 * This test performs no training, provider write, dependency promotion or
 * production mutation. Executable accelerator evidence is owned by Forge/GPU
 * Bridge under the wave's exact-source contract.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "waves", "2026-09-15-trl-activation-offload-successor.json"),
    "utf8",
  ),
);

const PREDECESSOR = "488a0d34be07c7cb2c130e8ba44cb9a4103717b2";
const STREAM_RACE = "61c04cd306a41c536b44c172d840398d3e3e1a73";
const STORAGE_DEDUPE = "8d58043c4c1c4d736b0350f82eebff6269b0ff1b";

test("successor is exact-source, additive, evaluation-only and fail-closed", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.wave, "2026-09-15-trl-activation-offload-successor");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.exactSourceBindingRequired, true);
  assert.equal(wave.candidate.status, "EVALUATION");
  assert.equal(wave.candidate.productionDisposition, "HOLD");
});

test("predecessor TRL compatibility evidence is not inherited", () => {
  assert.equal(wave.candidate.predecessor.wave, "2026-09-13-vllm-0-29-trl-compatibility");
  assert.equal(wave.candidate.predecessor.trlRevision, PREDECESSOR);
  assert.equal(wave.candidate.predecessor.inheritQualification, false);
  assert.equal(wave.deduplication.predecessorTrlRevision, PREDECESSOR);
});

test("both material upstream sources are bound exactly", () => {
  const revisions = wave.candidate.sourceSet.map((source) => source.revision);
  assert.deepEqual(revisions, [STREAM_RACE, STORAGE_DEDUPE]);
  assert.deepEqual(wave.deduplication.orgExactSourceSearches, [STREAM_RACE, STORAGE_DEDUPE]);
  assert.deepEqual(wave.deduplication.orgExactSourceMatchesBeforeIntake, []);
});

test("stream-race source requires live stream and copy-before-wait semantics", () => {
  const source = wave.candidate.sourceSet.find((item) => item.revision === STREAM_RACE);
  const boundary = source.materialBoundary.join("\n");
  assert.match(boundary, /resolved live instead of cached/);
  assert.match(boundary, /before the offload stream wait/);
  assert.match(boundary, /FSDP2, checkpoint recompute and custom-autograd/);
});

test("storage-dedupe source keeps single-stream and streams-mode semantics distinct", () => {
  const source = wave.candidate.sourceSet.find((item) => item.revision === STORAGE_DEDUPE);
  const boundary = source.materialBoundary.join("\n");
  assert.match(boundary, /use_streams=true/);
  assert.match(boundary, /single-stream mode independently offloads/);
  assert.match(boundary, /\[true,true\].*\[true,false\]/);
});

test("required executable cases pin correctness before performance", () => {
  const evaluation = wave.candidate.evaluation;
  const cases = evaluation.requiredCases.join("\n");
  assert.match(cases, /no-offload versus single-stream versus streams-mode forward parity/);
  assert.match(cases, /gradient parity/);
  assert.match(cases, /sharing a storage/);
  assert.match(cases, /nonzero-storage-offset/);
  assert.match(cases, /non-default accelerator compute stream/);
  assert.match(cases, /checkpoint-recompute or custom-autograd/);
  assert.match(cases, /FSDP2.*UNAVAILABLE/);
  assert.match(evaluation.acceptance.join("\n"), /Correctness gates require matched outputs and gradients/);
});

test("existing owners are reused and production mutation remains unauthorized", () => {
  const owners = wave.candidate.owners;
  assert.equal(owners.catalogAndGovernance, "szl-holdings/szl-frontier");
  assert.equal(owners.executableEvaluation, "szl-holdings/szl-forge");
  assert.equal(owners.acceleratorQualification, "szl-holdings/szl-gpu-bridge");
  assert.equal(wave.candidate.evaluation.trackingIssue, "szl-holdings/szl-frontier#153");
  assert.equal(wave.candidate.evaluation.executionIssue, "szl-holdings/szl-forge#324");
  assert.match(wave.authorityChain.huggingFaceProjection, /no new runtime or artifact projection authorized/);
  assert.match(wave.authorityChain.productRuntime, /unchanged and HOLD/);
});

test("Codex handoff requires exact identity, failure evidence and normal admission", () => {
  const handoff = wave.candidate.codexHandoff;
  const steps = handoff.steps.join("\n");
  assert.equal(handoff.mode, "EXACT_SOURCE_TRAINING_CORRECTNESS_EVALUATION");
  assert.match(steps, /without widening production dependencies/);
  assert.match(steps, /Python, Torch, CUDA or accelerator runtime, driver and device identities/);
  assert.match(steps, /Fail closed/);
  assert.match(steps, /After normal merge controls/);
  assert.match(handoff.definitionOfDone, /deterministic matched correctness evidence/);
});
