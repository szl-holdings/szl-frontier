/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-vllm-adaptive-acceptance-estimator.json', import.meta.url),
    'utf8',
  ),
);

test('pins the exact vLLM adaptive acceptance estimator source', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#134');
  assert.equal(wave.candidate.upstreamRepository, 'vllm-project/vllm');
  assert.equal(wave.candidate.upstreamRevision, '3bb0a03f35269185b6358753e64932bb946cc531');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('deduplicates into the existing DeepSeek V4.1 governance chain', () => {
  assert.equal(wave.deduplication.deepSeekV41CanonicalOwner, 'szl-holdings/szl-frontier#134');
  assert.equal(wave.deduplication.executionHandoffMergedPr, 'szl-holdings/szl-frontier#138');
  assert.equal(wave.deduplication.forgeOwner, 'szl-holdings/szl-forge#310');
  assert.equal(wave.deduplication.serveOwner, 'szl-holdings/szl-serve#9');
  assert.equal(wave.deduplication.gpuBridgeOwner, 'szl-holdings/szl-gpu-bridge#102');
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.inheritsDeepSeekQualification, false);
  assert.equal(wave.deduplication.inheritsVllm029Qualification, false);
});

test('keeps adaptive verification limitations explicit', () => {
  assert.equal(wave.runtimeContract.estimator, 'OnlineAcceptanceEstimator');
  assert.equal(wave.runtimeContract.fullCudagraphRequired, true);
  assert.equal(wave.runtimeContract.loraSupported, false);
  assert.equal(wave.runtimeContract.pipelineParallelSupported, false);
  assert.equal(wave.runtimeContract.attentionBackendMustSupportDeviceDecidedQueryLengths, true);
});

test('treats upstream doc-code disagreement as an evidence gap', () => {
  assert.equal(wave.upstreamDocCodeDrift.observed, true);
  assert.match(wave.upstreamDocCodeDrift.documentationStatement, /confidence head/u);
  assert.match(wave.upstreamDocCodeDrift.codeObservation, /acceptance-estimator/u);
  assert.equal(
    wave.upstreamDocCodeDrift.classification,
    'UPSTREAM_DOC_CODE_DRIFT_REQUIRES_EXACT_SOURCE_BEHAVIOR_TEST_NOT_CAPABILITY_CLAIM',
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
