/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-15-vllm-kvcr-secondary-tier.json', import.meta.url),
    'utf8',
  ),
);

const evidence = wave.requiredEvidence.join('\n').toLowerCase();

test('pins the exact vLLM feature source and KVCR release identity', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#157');
  assert.equal(wave.candidate.upstreamRepository, 'vllm-project/vllm');
  assert.equal(
    wave.candidate.upstreamRevision,
    '000c7df9ffd3e470980fd4cd6b8ec1b0585500ff',
  );
  assert.equal(wave.dependencyBinding.repository, 'ai-dynamo/kvcr');
  assert.equal(wave.dependencyBinding.tag, 'v0.1.0');
  assert.equal(
    wave.dependencyBinding.annotatedTagObject,
    '5db29e54f05be36d2afd691ba93878a99658bfe6',
  );
  assert.equal(
    wave.dependencyBinding.revision,
    '1b790eff53edcdc6398121b6e6ee48ba43cf2579',
  );
  assert.equal(wave.dependencyBinding.tagVerified, true);
});

test('does not inherit unrelated runtime or model qualification', () => {
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.inheritsVllm029Qualification, false);
  assert.equal(wave.deduplication.inheritsAnyModelQualification, false);
  assert.equal(wave.runtimeContract.tierType, 'kvcr');
  assert.equal(wave.runtimeContract.manager, 'KVCRSecondaryTierManager');
  assert.equal(wave.runtimeContract.optionalDependency, true);
});

test('requires correctness, isolation and failure evidence before performance', () => {
  assert.equal(wave.runtimeContract.correctnessBeforePerformance, true);
  assert.match(evidence, /byte-for-byte/);
  assert.match(evidence, /partial remote hit/);
  assert.match(evidence, /timeout before transport submission/);
  assert.match(evidence, /cancellation/);
  assert.match(evidence, /cross-request kv/);
  assert.match(evidence, /rollback/);
  assert.match(evidence, /license\/provenance/);
});

test('keeps router hints outside authorization and fallback fail-closed', () => {
  assert.equal(wave.runtimeContract.routerHintsAreCacheLocationEvidenceOnly, true);
  assert.equal(wave.runtimeContract.routerHintsCannotAuthorizeModelProviderTenantOrTool, true);
  assert.equal(wave.runtimeContract.silentCrossModelOrProviderFallbackForbidden, true);
  assert.equal(wave.runtimeContract.failClosedOnUnboundRuntimeIdentity, true);
});

test('binds concrete execution ownership without opening projections', () => {
  assert.equal(wave.evaluationOwners.canonicalGovernance, 'szl-holdings/szl-frontier#157');
  assert.equal(wave.evaluationOwners.runtimeCorrectness, 'szl-holdings/szl-forge#329');
  assert.equal(wave.evaluationOwners.servingIsolationAndRollback, 'szl-holdings/szl-serve#11');
  assert.equal(wave.evaluationOwners.acceleratorAndTransport, 'szl-holdings/szl-gpu-bridge#104');
  assert.equal(
    wave.projection.huggingFace,
    'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED',
  );
  assert.equal(wave.projection['a-11-oy.com'], 'UNCHANGED');
  assert.match(wave.projection['a11oy.net'], /MEASURED_RECEIPTS/);
});

test('preserves the HOLD and governance boundary', () => {
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
