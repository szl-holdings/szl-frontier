/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json', import.meta.url),
    'utf8',
  ),
);

const repair = wave.repairContract.join('\n').toLowerCase();
const currentSource = '43058398fb8ea346a7bd977f1a35391aeec1bf1a';

test('binds the latest protected source without inheriting predecessor qualification', () => {
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.observations.githubProtectedSource.revision, currentSource);
  assert.equal(wave.observations.githubProtectedSource.verifiedCommit, true);
  assert.equal(wave.observations.githubProtectedSource.state, 'AUTHORITATIVE_SOURCE_MOVED_AGAIN');
  assert.equal(wave.advancement.protectedSourceMovedSincePriorObservation, true);
});

test('records fresh exact-source convergence for canonical HF and product runtimes', () => {
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.observedSourceRevision, currentSource);
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.expectedSourceRevision, currentSource);
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.freshRuntimeSourceReadAvailable, true);
  assert.equal(wave.observations.huggingFaceCanonicalRuntime.state, 'ALIGNED_FOR_CURRENT_SOURCE_PREDICATE');
  assert.equal(wave.observations.productRuntime.observedGitSha, currentSource);
  assert.equal(wave.observations.productRuntime.expectedGitSha, currentSource);
  assert.equal(wave.observations.productRuntime.state, 'ALIGNED_FOR_CURRENT_SOURCE_PREDICATE');
  assert.equal(wave.advancement.canonicalHfRuntimeSourceDrift, 'REPAIRED_FRESH_EXACT_READ');
  assert.equal(wave.advancement.productDomainSourceDrift, 'REPAIRED_FRESH_EXACT_READ');
  assert.equal(wave.advancement.currentSourceLegsAligned, true);
});

test('does not turn source convergence into stale membership or proof closure', () => {
  assert.equal(wave.observations.publicHfMembership.freshSameWindowObservationAvailable, false);
  assert.equal(wave.observations.publicHfMembership.state, 'FRESH_CURRENT_MEMBERSHIP_RECONCILIATION_REQUIRED');
  assert.equal(wave.observations.proofSurface.modelsRecord.capturedAt, '2026-09-12T01:25:04Z');
  assert.equal(wave.observations.proofSurface.modelsRecord.state, 'DATED_RECORD_REQUIRES_CURRENT_MEMBERSHIP_RECONCILIATION');
  assert.equal(wave.advancement.publicMembershipDeclarationDrift, 'OPEN_FRESH_RECONCILIATION_REQUIRED');
  assert.equal(wave.advancement.proofSnapshotDrift, 'OPEN');
});

test('preserves non-destructive exact-source repair rules', () => {
  assert.match(repair, /never repin source to older runtime or proof bytes/);
  assert.match(repair, /do not delete, hide or reclassify admitted assets/);
  assert.match(repair, /preserve historical snapshots/);
  assert.match(repair, /fresh same-window reconciliation/);
  assert.match(repair, /three-way exact-source parity alone is not whole-estate readiness/);
});

test('keeps residual incident fail closed until named predicates also close', () => {
  assert.equal(wave.advancement.historicalClosurePreserved, true);
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
