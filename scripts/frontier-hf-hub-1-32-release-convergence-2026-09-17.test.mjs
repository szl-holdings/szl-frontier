import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-17-hf-hub-1-32-release-convergence.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

test('Hub 1.32 stable source is exact and non-inheriting', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#74');
  assert.equal(wave.securitySuccessorIssue, 'szl-holdings/szl-frontier#145');
  assert.equal(wave.executionOwner, 'szl-holdings/szl-forge#322');
  assert.equal(wave.release.version, '1.32.0');
  assert.equal(wave.release.annotatedTagObject, '917e4c271db593cd0f5e019d7da35620acd69573');
  assert.equal(wave.release.releaseCommit, '8814aabc81298df547bece9e71e4e88d3e513928');
  assert.equal(wave.release.tagVerification, 'UNSIGNED');
  assert.equal(wave.release.releaseCommitVerification, 'UNSIGNED');
  assert.equal(wave.release.inheritsQualification, false);
  assert.equal(wave.release.productionDisposition, 'HOLD');
  assert.match(wave.release.rollbackBaseline, /1\.31\.0/);
});

test('post-release symlink repair cannot be smuggled into 1.32 qualification', () => {
  const watch = wave.postReleaseWatch;
  assert.equal(watch.upstreamRevision, '618250b65875d388dc269752b111d5e4bf4ffb61');
  assert.equal(watch.upstreamPullRequest, 4923);
  assert.equal(watch.sourceVerification, 'GITHUB_VERIFIED_SIGNATURE');
  assert.equal(watch.containedInRelease1320, false);
  assert.equal(watch.inheritsQualification, false);
  assert.equal(watch.productionDisposition, 'WATCH_HOLD');
  assert.match(watch.materiality, /symlink/i);
  assert.match(watch.requiredEvidence.join(' '), /known-bad control/i);
});

test('release evaluation keeps security, cache and provenance boundaries explicit', () => {
  const required = wave.release.requiredEvidence.join(' ');
  assert.match(required, /Sandbox security contract/);
  assert.match(required, /shared-blob cache/);
  assert.match(required, /checkpoint loading/);
  assert.match(required, /kernel-repo cache/);
  assert.match(required, /synthetic secrets/);
  assert.match(required, /rollback/);
});

test('provider, cost, projection and production authority remain closed', () => {
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.providerWriteAuthorized, false);
  assert.equal(wave.billableJobOrSandboxAuthorized, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.projection.huggingFace, 'NO_PROVIDER_WRITE_OR_RUNTIME_PROJECTION_FROM_RELEASE_DISCOVERY');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_UNTIL_EXACT_DEPENDENCY_AND_RUNTIME_READBACK');
  assert.equal(wave.projection.a11oy.net, 'MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
