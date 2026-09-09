import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-09-hf-kernel-0161-migration.json", import.meta.url), "utf8"),
);

const candidate = wave.candidate;
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

test("Kernel Hub migration wave is fail-closed and non-duplicate", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.noWeightRehostingForInventory, true);
  assert.equal(wave.deduplication.canonicalCatalogChecked, true);
  assert.equal(wave.deduplication.result, "one material non-duplicate migration contract");
  assert.ok(wave.deduplication.excludedAlreadyRepresented.some((item) => item.includes("TRL GRPO")));
  assert.ok(wave.deduplication.excludedAlreadyRepresented.some((item) => item.includes("VLM Run Gateway")));
});

test("v0.16.1 release and package provenance are exact-pinned", () => {
  assert.equal(candidate.release.version, "0.16.1");
  assert.equal(candidate.release.tag, "v0.16.1");
  assert.equal(candidate.release.revision, "1dc5c9d05683e8a594bb6d7a1ab18318b89e2caa");
  assert.match(candidate.release.revision, SHA40);
  assert.equal(candidate.release.license, "Apache-2.0");
  assert.match(candidate.release.packageProvenance.sdistSha256, SHA256);
  assert.match(candidate.release.packageProvenance.wheelSha256, SHA256);
});

test("first-class repository migration deadline and type are explicit", () => {
  assert.equal(candidate.migrationDeadline, "2026-09-13");
  assert.equal(candidate.requiredRepositoryType, "kernel");
  assert.equal(candidate.forbiddenLegacyRepositoryType, "model");
  assert.equal(candidate.runtimeBinding.requireVersionOrExactRevision, true);
  assert.ok(candidate.acceptance.some((gate) => gate.includes("exact 40-character main and v1")));
  assert.ok(candidate.acceptance.some((gate) => gate.includes("Reject legacy model-type")));
});

test("SZL Forge implementation is exact-head bound but not production-qualified", () => {
  const implementation = candidate.estateImplementation;
  assert.equal(implementation.owner, "szl-holdings/szl-forge");
  assert.equal(implementation.pullRequest, "https://github.com/szl-holdings/szl-forge/pull/203");
  assert.equal(implementation.headRevision, "0707fa9e8767becccfac640432017b56d35e031c");
  assert.match(implementation.headRevision, SHA40);
  assert.equal(implementation.migrationWorkflowRun, 34355675248);
  assert.equal(implementation.migrationWorkflowJob, 102479607786);
  assert.equal(implementation.migrationWorkflowConclusion, "success");
  assert.equal(implementation.observedChecksConclusion, "PASS");
  assert.ok(implementation.qualificationBoundary.includes("not production"));
});

test("unreleased upstream main remains watch-only", () => {
  assert.equal(candidate.upstreamMainWatch.revision, "65ad13efcf490d1a3b4f06172a01f9823a013b90");
  assert.match(candidate.upstreamMainWatch.revision, SHA40);
  assert.equal(candidate.upstreamMainWatch.disposition, "WATCH_UNRELEASED");
  assert.ok(candidate.upstreamMainWatch.qualificationBoundary.includes("does not replace"));
});

test("authority and promotion boundaries remain intact", () => {
  assert.equal(candidate.status, "EVALUATION");
  assert.equal(wave.alignment.productionDisposition, "HOLD");
  assert.equal(wave.routing.catalogOwner, "szl-holdings/szl-frontier");
  assert.equal(wave.routing.migrationAndRuntimeQualificationOwner, "szl-holdings/szl-forge");
  assert.equal(wave.routing.kernelSourceOwner, "szl-holdings/szl-kernels");
  assert.equal(wave.routing.huggingFaceProjection, "SZLHOLDINGS/szl-kernels");
  assert.ok(wave.alignment.knownIndependentDrift.some((item) => item.includes(".github#728")));
  assert.ok(wave.alignment.knownIndependentDrift.some((item) => item.includes("lyte-services#18")));
  assert.ok(candidate.acceptance.some((gate) => gate.includes("Do not change production routes")));
});
