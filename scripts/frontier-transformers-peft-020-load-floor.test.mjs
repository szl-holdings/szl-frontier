/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-transformers-peft-020-load-floor.json', import.meta.url),
    'utf8',
  ),
);

test('pins the exact post-5.17 Transformers PEFT load-floor source', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.candidate.upstreamRepository, 'huggingface/transformers');
  assert.equal(wave.candidate.upstreamRevision, '75c3583e042c0765874784306fb9ace2137925d1');
  assert.equal(wave.candidate.releaseState, 'POST_5_17_UNRELEASED_WATCH');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('records exact estate 0.19.1 pins without declaring current pinned stacks broken', () => {
  assert.equal(wave.estateObservations.length, 3);
  for (const observation of wave.estateObservations) {
    assert.equal(observation.observedPin, 'peft==0.19.1');
    assert.equal(
      observation.classification,
      'PIN_REQUIRES_SUCCESSOR_COMPATIBILITY_REVIEW_NOT_CURRENT_BREAKAGE_CLAIM',
    );
  }
});

test('keeps qualification and downstream projection fail closed', () => {
  assert.equal(wave.deduplication.inheritsQualification, false);
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.projection['a-11-oy.com'], 'UNCHANGED');
  assert.match(wave.projection.huggingFace, /^NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_/u);
});

test('keeps the newer PEFT dtype-forwarding fix as separate unreleased watch evidence', () => {
  assert.equal(wave.unreleasedSuccessorWatch.repository, 'huggingface/peft');
  assert.equal(wave.unreleasedSuccessorWatch.revision, 'e99fdd275075068d093f8996a59bc0eb865f71a2');
  assert.equal(wave.unreleasedSuccessorWatch.qualification, 'SEPARATE_WATCH_NOT_STABLE_020_EVIDENCE');
});

test('binds the modules_to_save restoration fix as a separate exact-source successor', () => {
  const successor = wave.transformersModulesToSaveSuccessorWatch;
  assert.equal(successor.repository, 'huggingface/transformers');
  assert.equal(successor.revision, 'dbbd551285e9d591a5c9692154341531531dac6c');
  assert.equal(successor.upstreamPullRequest, 48595);
  assert.equal(successor.sourceVerification, 'UPSTREAM_COMMIT_SIGNATURE_VERIFIED');
  assert.equal(successor.qualification, 'SEPARATE_EXACT_SOURCE_EVALUATION_REQUIRED');
  assert.equal(successor.productionDisposition, 'HOLD');
  assert.equal(wave.deduplication.transformersModulesToSaveSuccessorPreviouslyAdmitted, false);
});

test('requires an executable modules_to_save restoration witness before promotion', () => {
  assert.ok(
    wave.requiredEvidence.some((entry) => entry.includes('modules_to_save sentinel round trip')),
  );
  assert.ok(
    wave.requiredEvidence.some(
      (entry) =>
        entry.includes('dbbd551285e9d591a5c9692154341531531dac6c') &&
        entry.includes('does not inherit'),
    ),
  );
});
