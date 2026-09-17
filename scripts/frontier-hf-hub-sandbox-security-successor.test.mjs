/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-hf-hub-sandbox-security-successor.json', import.meta.url),
    'utf8',
  ),
);

const expectedConstituents = [
  '1fb5b3b3216c9d164e78a7e0312b3c2b1ffbdbc0',
  'ef2662fac2bca2e4c0d2aaadbcc2b99a05b3922a',
  '40efc5e89b4f3881059f72cefcc0550f33a86cc1',
  '0613ead586fb5897052db1edf26da49caa2a83b8',
  'c7e60d81a4959841ea9008191841d632510056b4',
  'ec619930857c9eefbc7b21d5646b55e209cf13db',
  '0219ad56d42318411bb04f6f95688ead7f78568f',
  '1173050bc71b78c95a7a441796f07d49e8bc7b87',
];

test('pins the exact unreleased Hugging Face Hub sandbox security cluster', () => {
  assert.equal(wave.schema, 'szl.frontier.wave/v1');
  assert.equal(wave.candidate.repository, 'huggingface/huggingface_hub');
  assert.equal(wave.candidate.releasePublished, false);
  assert.equal(wave.candidate.clusterStartCommit, expectedConstituents[0]);
  assert.equal(wave.candidate.exactHeadCommit, expectedConstituents.at(-1));
  assert.equal(wave.candidate.headCommitSignatureVerified, true);
  assert.equal(wave.candidate.ancestry.status, 'ahead');
  assert.equal(wave.candidate.ancestry.headAheadOfClusterStartBy, 7);
  assert.equal(wave.candidate.ancestry.headBehindClusterStartBy, 0);
  assert.deepEqual(
    wave.constituentCommits.map(({ revision }) => revision),
    expectedConstituents,
  );
});

test('deduplicates stable 1.31 and checkpoint hardening without inheriting qualification', () => {
  assert.equal(wave.deduplication.stableTrackingIssue, 74);
  assert.equal(wave.deduplication.stableVersion, '1.31.0');
  assert.equal(
    wave.deduplication.stableReleaseCommit,
    '495b17c8529614759ae0f1ccf1ebe9a61c148b7c',
  );
  assert.equal(
    wave.deduplication.stableToSuccessorComparison,
    'DIVERGED_DO_NOT_INHERIT_QUALIFICATION',
  );
  assert.match(wave.deduplication.checkpointSecurityWave, /checkpoint-deserialization-hardening/u);
  assert.equal(wave.deduplication.trackingIssue, 145);
  assert.equal(wave.deduplication.implementationOwner.repository, 'szl-holdings/szl-forge');
  assert.equal(wave.deduplication.implementationOwner.issue, 322);
  assert.equal(wave.deduplication.exactSuccessorPreviouslyCataloged, false);
});

test('keeps provider, production and moving-main authority fail closed', () => {
  assert.equal(wave.disposition, 'EVALUATION');
  assert.equal(wave.productionAuthorized, false);
  assert.equal(wave.automaticPromotionAuthorized, false);
  assert.equal(wave.policy.billableSandboxJobCreationAuthorized, false);
  assert.equal(wave.policy.liveSandboxProbeAuthorized, false);
  assert.equal(wave.policy.hubPublicationAuthorized, false);
  assert.equal(wave.policy.providerWriteAuthorized, false);
  assert.equal(wave.policy.productionRouteChangeAuthorized, false);
  assert.equal(wave.policy.productionDependencyUpgradeAuthorized, false);
  assert.equal(wave.policy.movingMainProductionPinAuthorized, false);
  assert.equal(wave.policy.secretFixtureUseAuthorized, false);
  assert.equal(wave.policy.weightRehostingAuthorized, false);
  assert.equal(wave.policy.branchProtectionMutationAuthorized, false);
  assert.equal(wave.policy.preserveStable131Rollback, true);
});

test('keeps downstream authority chain unchanged until exact-cluster qualification', () => {
  assert.match(wave.authorityChain.huggingFaceProjection, /^NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_/u);
  assert.match(wave.authorityChain.productRuntime, /^UNCHANGED:/u);
  assert.match(wave.authorityChain.proofEvidence, /^HOLD:/u);
});

test('requires executable security witnesses instead of source-only confidence', () => {
  const evidence = wave.requiredEvidence.join('\n');
  for (const fragment of [
    'all eight security-significant constituent commits',
    'one sandbox capability cannot operate on another sandbox',
    'rejected before credential transmission',
    'bounded-output and bounded-read',
    'opaque-process-id kill',
    'ownership-aware close witness',
    'corrupted digest',
    'avoid secret values in argv',
    'stable 1.31 evaluation baseline',
  ]) {
    assert.match(evidence, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
});
