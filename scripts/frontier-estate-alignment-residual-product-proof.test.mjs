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

const currentSource = '49f114dd9bdb47e0efef5caa3c3f0db3df6c2431';
const predecessor = 'ebfd70f4c6915c2640cf82a97c7f22b6c62906eb';

test('records the protected-source successor without inheriting stale runtime qualification', () => {
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.observations.githubProtectedSource.revision, currentSource);
  assert.equal(wave.observations.githubProtectedSource.parentRevision, predecessor);
  assert.equal(wave.observations.githubProtectedSource.verifiedCommit, true);
  assert.equal(wave.observations.githubProtectedSource.state, 'AUTHORITATIVE_SOURCE_MOVED');
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.lastObservedSourceRevision, predecessor);
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.expectedSourceRevision, currentSource);
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.freshRuntimeSourceReadAvailable, false);
  assert.equal(
    wave.advancement.canonicalHfRuntimeSourceDrift,
    'OPEN_FRESH_READ_REQUIRED',
  );
});

test('reopens product parity when the protected source moves', () => {
  assert.equal(wave.observations.productRuntime.observedGitSha, predecessor);
  assert.equal(wave.observations.productRuntime.expectedGitSha, currentSource);
  assert.equal(
    wave.observations.productRuntime.state,
    'SOURCE_DRIFT_AFTER_PROTECTED_MAIN_MOVED',
  );
  assert.equal(wave.observations.productRuntime.observationMethod, 'FRESH_PUBLIC_GET');
  assert.equal(
    wave.advancement.productDomainSourceDrift,
    'REOPENED_BY_NEW_PROTECTED_SOURCE',
  );
  assert.equal(wave.advancement.protectedSourceMovedSincePriorObservation, true);
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
    'STALE_AGAINST_CURRENT_PUBLIC_MEMBERSHIP_AND_NEW_SOURCE',
  );
  assert.equal(
    wave.observations.proofSurface.publicInventoryRecord.state,
    'HISTORICAL_STALE_SNAPSHOT',
  );
});

test('forbids stale repinning and destructive count forcing', () => {
  assert.match(repair, /never repin source to the older runtime, product or proof bytes/);
  assert.match(repair, /fresh exact-source read from the canonical hugging face a11oy runtime/);
  assert.match(repair, /normal source-bound deployment controls only/);
  assert.match(repair, /do not delete or hide the admitted model/);
  assert.match(repair, /historical snapshots remain historical evidence/);
});

test('keeps the residual incident fail-closed until same-window named-predicate closure', () => {
  assert.equal(wave.advancement.historicalClosurePreserved, true);
  assert.ok(
    wave.repairContract.some(
      (entry) => entry.includes('fresh same-window reconciliation') && entry.includes('zero required blockers'),
    ),
  );
  assert.equal(wave.advancement.publicMembershipDeclarationDrift, 'OPEN');
  assert.equal(wave.advancement.proofSnapshotDrift, 'OPEN');
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
