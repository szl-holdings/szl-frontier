/** Offline guard for the Hugging Face Kernels v0.17.0 intake. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(
  readFileSync(join(here, "..", "frontier", "waves", "2026-09-15-hf-kernels-0-17.json"), "utf8"),
);
const REV = "7a11103e4a85074344de419993d48c1ff3064baf";

test("release is exact, evaluation-only and fail-closed", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.candidate.tag, "v0.17.0");
  assert.equal(wave.candidate.revision, REV);
  assert.equal(wave.candidate.publishedAt, "2026-09-14T09:20:23Z");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.candidate.status, "EVALUATION");
  assert.equal(wave.candidate.productionDisposition, "HOLD");
});

test("deduplication establishes a new released boundary", () => {
  assert.equal(wave.deduplication.exactTagCommitSearch, REV);
  assert.equal(wave.deduplication.exactTagCommitMatchBeforeIntake, false);
  assert.equal(wave.deduplication.helionCatalogMatchBeforeIntake, false);
  assert.equal(wave.deduplication.frontierIssue, 155);
  assert.equal(wave.deduplication.forgeIssue, 325);
});

test("material release changes include trust, compatibility, packaging and accelerator scope", () => {
  const changes = wave.candidate.materialChanges.join("\n");
  assert.match(changes, /kernels-data.*integrated into the kernels package/);
  assert.match(changes, /Helion/);
  assert.match(changes, /explicit trusted repository IDs/);
  assert.match(changes, /minimum-version and capability validation/);
  assert.match(changes, /conditional use_kernel_forward_from_hub/);
  assert.match(changes, /ROCm 7\.14/);
  assert.match(changes, /Crescent Island/);
});

test("evaluation forbids blanket trust and requires fallback/reference distinction", () => {
  const required = wave.candidate.evaluation.required.join("\n");
  assert.match(required, /without blanket remote-code trust/);
  assert.match(required, /fail-closed behavior/);
  assert.match(required, /reference fallback from kernelized execution/);
  assert.match(required, /reference-output parity/);
  assert.match(required, /preserve rollback/);
});

test("unsupported accelerators remain unavailable instead of becoming inferred passes", () => {
  const scope = wave.candidate.evaluation.acceleratorScope;
  assert.match(scope.cuda, /actually available/);
  assert.match(scope.rocm714, /UNAVAILABLE/);
  assert.match(scope.xpuCrescentIsland, /UNAVAILABLE/);
});

test("owners and Codex handoff preserve source-first admission", () => {
  assert.equal(wave.candidate.owners.governance, "szl-holdings/szl-frontier");
  assert.equal(wave.candidate.owners.execution, "szl-holdings/szl-forge");
  assert.equal(wave.candidate.owners.acceleratorQualification, "szl-holdings/szl-gpu-bridge");
  const steps = wave.candidate.codexHandoff.steps.join("\n");
  assert.match(steps, /Fail closed/);
  assert.match(steps, /Do not publish a remote kernel/);
  assert.match(steps, /after normal repository controls/);
  assert.match(wave.authorityChain.huggingFaceProjection, /no new SZL artifact\/runtime projection authorized/);
});
