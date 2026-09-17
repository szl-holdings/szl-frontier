/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-cosmos3-modelopt-fp8-policy.json', import.meta.url),
    'utf8',
  ),
);

test('pins the exact Diffusers Cosmos3 mixed-precision source', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#147');
  assert.equal(wave.candidate.upstreamRepository, 'huggingface/diffusers');
  assert.equal(wave.candidate.upstreamRevision, '759164b7ad116e091e9d3e222211c9aa27d835f6');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('does not treat a moving fp8 ref or generic ModelOpt qualification as evidence', () => {
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.genericModelOptQualificationInherited, false);
  assert.equal(wave.deduplication.inheritsQualification, false);
  assert.equal(wave.artifactBoundary.movingFp8RevisionIsEvidenceKey, false);
  assert.equal(wave.artifactBoundary.requireImmutableHubRevision, true);
  assert.equal(wave.artifactBoundary.requireCheckpointAndConfigDigests, true);
  assert.equal(wave.artifactBoundary.rehostWeightsForInventory, false);
});

test('keeps checkpoint-owned precision policy fail closed', () => {
  assert.equal(wave.runtimeContract.policyField, 'transformer/config.json:diffusion_step_policy');
  assert.match(wave.runtimeContract.videoMixedPolicy, /W8A16/u);
  assert.match(wave.runtimeContract.videoMixedPolicy, /W8A8/u);
  assert.equal(wave.runtimeContract.noPolicyBehavior, 'native W8A8 for every step');
  assert.match(wave.runtimeContract.cfgPrecisionInvariant, /same precision/u);
  assert.equal(wave.runtimeContract.nonModelOptBehavior, 'no-op; retain native quantizer forward');
  assert.equal(wave.runtimeContract.malformedOrIncompletePolicy, 'fail-closed');
});

test('does not inherit upstream performance or missing test evidence', () => {
  assert.equal(wave.runtimeContract.upstreamFocusedUnitTestsPresent, false);
  assert.equal(
    wave.upstreamEvidenceBoundary.classification,
    'UPSTREAM_IMPLEMENTATION_REQUIRES_SZL_DETERMINISTIC_REPRODUCTION',
  );
  assert.equal(
    wave.upstreamEvidenceBoundary.performanceClaims,
    'UPSTREAM_REPORTED_NOT_SZL_MEASURED',
  );
});

test('keeps downstream projection and promotion closed', () => {
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.match(wave.projection.huggingFace, /^NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_/u);
  assert.equal(wave.projection['a-11-oy.com'], 'UNCHANGED');
  assert.equal(wave.projection['a11oy.net'], 'MEASURED_RECEIPTS_ONLY_AFTER_EVALUATION');
});
