/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-sglang-deepseek-v4-native-renderer.json', import.meta.url),
    'utf8',
  ),
);

test('pins the exact SGLang native-renderer source', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#134');
  assert.equal(wave.candidate.upstreamRepository, 'sgl-project/sglang');
  assert.equal(wave.candidate.upstreamRevision, '07e1918924b11223c185544507669f9eb02c9b65');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('reuses the existing DeepSeek V4.1 serving governance chain', () => {
  assert.equal(wave.deduplication.deepSeekV41CanonicalOwner, 'szl-holdings/szl-frontier#134');
  assert.equal(wave.deduplication.executionHandoffMergedPr, 'szl-holdings/szl-frontier#138');
  assert.equal(wave.deduplication.serveOwner, 'szl-holdings/szl-serve#9');
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.inheritsDeepSeekQualification, false);
  assert.equal(wave.deduplication.inheritsSglangQualification, false);
});

test('keeps no-template fallback explicit and fail closed', () => {
  assert.equal(wave.runtimeContract.renderer, 'dynamo_renderer::native_formatter_for');
  assert.equal(wave.runtimeContract.dynamoRendererVersion, '5.1.2');
  assert.equal(wave.runtimeContract.explicitTemplateOverridesNativeFallback, true);
  assert.equal(wave.runtimeContract.missingNativeFormatterMustRefuse, true);
  assert.equal(wave.runtimeContract.genericJinjaFallbackAuthorized, false);
});

test('keeps source-owned DeepSeek protocol authoritative', () => {
  assert.equal(wave.protocolBoundary.deepSeekV41HasNoJinjaTemplate, true);
  assert.equal(wave.protocolBoundary.sourceOwnedEncodingReferenceRemainsAuthority, true);
  assert.equal(wave.protocolBoundary.nativeRendererIsImplementationCandidateNotProtocolAuthority, true);
  assert.ok(wave.protocolBoundary.requiredParity.includes('tool-call encode/decode'));
  assert.ok(wave.protocolBoundary.requiredParity.includes('streamed parsing and termination'));
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
