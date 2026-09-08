import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-08-runtime-retrieval.json", import.meta.url), "utf8"),
);

const byId = new Map(wave.candidates.map((candidate) => [candidate.id, candidate]));

const SHA40 = /^[0-9a-f]{40}$/;

test("wave is fail-closed and deduplicated", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.noWeightRehostingForInventory, true);
  assert.equal(wave.deduplication.canonicalCatalogChecked, true);
  assert.equal(wave.deduplication.result, "three non-duplicate evaluation candidates");
  assert.equal(wave.candidates.length, 3);
});

test("SGLang v0.5.19 is exact-pinned but not runtime-qualified", () => {
  const candidate = byId.get("sglang-v0-5-19-2026-09-05");
  assert.ok(candidate);
  assert.equal(candidate.kind, "inference-engine");
  assert.equal(candidate.tag, "v0.5.19");
  assert.equal(candidate.revision, "0bcd822377da7b5718e674eaf9c870d349424dd1");
  assert.match(candidate.revision, SHA40);
  assert.equal(candidate.licensePosture, "Apache-2.0");
  assert.equal(candidate.status, "EVALUATION");
  assert.ok(candidate.acceptance.some((gate) => gate.includes("immutable runtime image digest")));
  assert.ok(candidate.acceptance.some((gate) => gate.includes("production HOLD")));
});

test("CORE retrieval family binds exact Hub revisions and attribution", () => {
  const candidate = byId.get("alibaba-core-multimodal-retrieval-2026-09-04");
  assert.ok(candidate);
  assert.equal(candidate.kind, "retrieval-reranking");
  assert.deepEqual(
    candidate.artifacts.map((artifact) => [artifact.repoId, artifact.revision, artifact.license]),
    [
      ["Alibaba-NLP/core-reranker-8b", "d95d36a34300e34b87cc1793827ac798642c4488", "cc-by-4.0"],
      ["Alibaba-NLP/core-emb-8b", "123aef9e5e9e76fb686420f077fce3ef3b580c2b", "cc-by-4.0"],
    ],
  );
  for (const artifact of candidate.artifacts) assert.match(artifact.revision, SHA40);
  assert.equal(candidate.status, "EVALUATION");
  assert.ok(candidate.acceptance.some((gate) => gate.includes("attribution obligations")));
  assert.ok(candidate.acceptance.some((gate) => gate.includes("cannot expand principal/tenant authority")));
});

test("Dynamo preview retains upstream experimental boundary", () => {
  const candidate = byId.get("dynamo-deepseek-v4-pro-0813-dev1-2026-09-04");
  assert.ok(candidate);
  assert.equal(candidate.releaseRevision, "28f9c307dcff4130412ac04e4ea07c96b0cde6f5");
  assert.equal(candidate.model.revision, "72e1d3230f6c080a530b0a1d46f8eb4602340597");
  assert.match(candidate.releaseRevision, SHA40);
  assert.match(candidate.model.revision, SHA40);
  assert.equal(candidate.upstreamMaturity, "experimental-snapshot-not-QA-gated");
  assert.equal(candidate.status, "WATCH_EVALUATION_ONLY");
  assert.ok(candidate.acceptance.some((gate) => gate.includes("cost ceiling")));
  assert.ok(candidate.acceptance.some((gate) => gate.includes("stable/QA-gated")));
});

test("authority-chain drift stays visible and cannot promote", () => {
  const alignment = wave.alignmentObservation;
  assert.equal(alignment.github.revision, wave.sourceRevisionObserved);
  assert.equal(alignment.huggingFace.runtimeDeploymentSourceRevision, wave.sourceRevisionObserved);
  assert.equal(alignment.huggingFace.state, "EXACT_SOURCE_WITNESSED");
  assert.equal(alignment.product.claimGate, "FAILED_CLOSED");
  assert.equal(alignment.product.equivalenceState, "UNAVAILABLE");
  assert.deepEqual(alignment.product.criticalFailures, ["github_inventory_unavailable"]);
  assert.equal(alignment.proof.state, "STALE_SOURCE_POINTER");
  assert.notEqual(alignment.proof.liveRecordSourceRevision, alignment.github.revision);
  assert.equal(alignment.productionDisposition, "HOLD");
});

test("ownership routes changes to the repository that owns the responsibility", () => {
  assert.equal(wave.routing.catalogOwner, "szl-holdings/szl-frontier");
  assert.equal(wave.routing.runtimeQualificationOwner, "szl-holdings/szl-forge");
  assert.equal(wave.routing.servingOwner, "szl-holdings/szl-serve");
  assert.equal(wave.routing.gpuInfrastructureOwner, "szl-holdings/szl-gpu-bridge");
  assert.equal(wave.routing.retrievalOwner, "szl-holdings/szl-second-brain");
  assert.equal(wave.routing.proofOwner, "szl-holdings/a11oy-net");
});
