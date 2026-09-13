import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-13-vllm-0-29-trl.json", import.meta.url), "utf8"),
);

const SHA40 = /^[0-9a-f]{40}$/;

test("vLLM 0.29 wave is exact-pinned and fail-closed", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.noWeightRehostingForInventory, true);
  assert.equal(wave.deduplication.canonicalCatalogChecked, true);
  assert.equal(wave.deduplication.result, "one non-duplicate runtime evaluation candidate");
  assert.equal(wave.candidate.status, "EVALUATION");
  assert.equal(wave.candidate.productionDisposition, "HOLD");
});

test("runtime and Hugging Face integration use immutable source revisions", () => {
  const candidate = wave.candidate;
  assert.equal(candidate.runtime.tag, "v0.29.0");
  assert.equal(candidate.runtime.revision, "98dff2a81d747d1dba01a47f939f48c3526d4206");
  assert.match(candidate.runtime.revision, SHA40);
  assert.equal(candidate.runtime.license, "Apache-2.0");
  assert.equal(candidate.huggingFaceIntegration.repository, "huggingface/trl");
  assert.equal(candidate.huggingFaceIntegration.revision, "488a0d34be07c7cb2c130e8ba44cb9a4103717b2");
  assert.match(candidate.huggingFaceIntegration.revision, SHA40);
  assert.equal(candidate.huggingFaceIntegration.declaredSupportedRange, ">=0.19.1,<=0.29.0");
});

test("evaluation cannot confuse Model Runner V2 with fallback", () => {
  const gates = wave.candidate.acceptance;
  assert.ok(gates.some((gate) => gate.includes("Model Runner V2 explicitly")));
  assert.ok(gates.some((gate) => gate.includes("fallback result cannot be labeled as a V2 pass")));
  assert.ok(gates.some((gate) => gate.includes("UNAVAILABLE instead of simulating unsupported hardware")));
  assert.ok(gates.some((gate) => gate.includes("No benchmark result") && gate.includes("production authority")));
});

test("existing AsyncGRPO adapter-sync issue remains the semantic owner", () => {
  assert.ok(wave.candidate.relatedFrontierIssues.includes(76));
  assert.ok(wave.candidate.relatedFrontierIssues.includes(121));
  assert.ok(wave.candidate.acceptance.some((gate) => gate.includes("issue 76")));
  assert.ok(wave.codexCompletionContract.required.some((gate) => gate.includes("reuse issue 76")));
});

test("runtime ownership is routed without product-side shortcut", () => {
  assert.equal(wave.routing.catalogOwner, "szl-holdings/szl-frontier");
  assert.equal(wave.routing.runtimeQualificationOwner, "szl-holdings/szl-forge");
  assert.equal(wave.routing.servingOwner, "szl-holdings/szl-serve");
  assert.equal(wave.routing.gpuInfrastructureOwner, "szl-holdings/szl-gpu-bridge");
  assert.equal(wave.routing.productOwner, "szl-holdings/a11oy");
  assert.equal(wave.routing.proofOwner, "szl-holdings/a11oy-net");
});

test("independent estate-alignment blocker remains visible", () => {
  const alignment = wave.alignmentObservation;
  assert.equal(alignment.a11oySourceRevision, "4845411b81f6aa32c9802dae0b851928fc4f36c6");
  assert.equal(alignment.hfSyncRun, 34733618642);
  assert.equal(alignment.ownerIssue, "szl-holdings/a11oy#2143");
  assert.equal(alignment.frontierAlignmentIssue, "szl-holdings/szl-frontier#96");
  assert.equal(alignment.productionDisposition, "HOLD");
  assert.match(alignment.blockingPredicate, /readiness refused compact verdict/);
});
