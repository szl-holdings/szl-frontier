/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL(
      '../frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const repair = wave.repairContract.join('\n').toLowerCase();

test('records the later exact protected source and repaired HF predicate', () => {
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(
    wave.observations.githubProtectedSource.revision,
    'ebfd70f4c6915c2640cf82a97c7f22b6c62906eb',
  );
  assert.equal(
    wave.observations.huggingFaceCanonicalRuntime.observedSourceRevision,
    'ebfd70f4c6915c2640cf82a97c7f22b6c62906eb',
  );
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.sourceBound, true);
  assert.equal(wave.advancement.canonicalHfRuntimeSourceDrift, 'REPAIRED');
});

test('keeps the stale product source as an explicit blocker', () => {
  assert.equal(
    wave.observations.productRuntime.observedGitSha,
    'a7bf14a576bc79b4db1945384c55a3c56b109670',
  );
  assert.equal(
    wave.observations.productRuntime.expectedGitSha,
    'ebfd70f4c6915c2640cf82a97c7f22b6c62906eb',
  );
  assert.equal(wave.observations.productRuntime.state, 'SOURCE_DRIFT');
  assert.equal(wave.advancement.productDomainSourceDrift, 'OPEN');
});

test('preserves separate current public-membership and proof predicates', () => {
  assert.equal(wave.observations.publicHfMembership.observed.models, 47);
  assert.equal(wave.observations.publicHfMembership.expected.models, 46);
  assert.equal(
    wave.observations.publicHfMembership.state,
    'ADMITTED_PUBLISHED_DECLARATION_STALE',
  );
  assert.equal(wave.observations.proofSurface.modelsRecord.reportedModels, 46);
  assert.equal(
    wave.observations.proofSurface.modelsRecord.state,
    'STALE_AGAINST_CURRENT_PUBLIC_MEMBERSHIP',
  );
  assert.equal(
    wave.observations.proofSurface.publicInventoryRecord.state,
    'HISTORICAL_STALE_SNAPSHOT',
  );
});

test('forbids rollback-to-stale and destructive count forcing', () => {
  assert.match(repair, /never repin source to stale product bytes/);
  assert.match(repair, /do not delete or hide the admitted model/);
  assert.match(repair, /historical snapshots remain historical evidence/);
  assert.match(repair, /reachability alone is never source parity or readiness/);
});

test('keeps the residual incident fail-closed', () => {
  assert.equal(wave.advancement.historicalClosurePreserved, true);
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
