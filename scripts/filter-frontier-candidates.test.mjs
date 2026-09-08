/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCandidates } from './filter-frontier-candidates.mjs';

const manifest = {
  releases: [
    { id: 'k2', title: 'K2', watch: { kind: 'model', baselineRevision: 'old', baselineFingerprint: 'same' } },
    { id: 'data', title: 'Dataset', watch: { kind: 'dataset', baselineRevision: 'd0', baselineFingerprint: 'data0' } },
    { id: 'article', title: 'Article', watch: { kind: 'blog', baselineFingerprint: 'article0' } },
  ],
};

function combined(candidates) {
  return { schema: 'szl.frontier.combined-watch-output.v1', materialCandidates: candidates, productionPromotion: false };
}

test('suppresses revision-only churn when normalized model inventory is unchanged', () => {
  const result = filterCandidates(combined([{ id: 'k2', snapshot: { kind: 'model', revision: 'new', artifactFingerprint: 'same' } }]), manifest);
  assert.equal(result.materialCandidates.length, 0);
  assert.equal(result.suppressedCount, 1);
  assert.equal(result.suppressedCandidates[0].reason, 'UNCHANGED_NORMALIZED_ARTIFACT_INVENTORY');
});

test('keeps admitted model when normalized inventory fingerprint changes', () => {
  const candidate = { id: 'k2', snapshot: { kind: 'model', revision: 'new', artifactFingerprint: 'changed' } };
  const result = filterCandidates(combined([candidate]), manifest);
  assert.deepEqual(result.materialCandidates, [candidate]);
  assert.equal(result.suppressedCount, 0);
});

test('suppresses admitted dataset revision churn when content inventory is unchanged', () => {
  const result = filterCandidates(combined([{ id: 'data', snapshot: { kind: 'dataset', revision: 'd1', artifactFingerprint: 'data0' } }]), manifest);
  assert.equal(result.materialCandidates.length, 0);
  assert.equal(result.suppressedCandidates[0].reason, 'UNCHANGED_NORMALIZED_ARTIFACT_INVENTORY');
});

test('suppresses dynamic rendered-page churn for an already admitted HF blog', () => {
  const result = filterCandidates(combined([{ id: 'article', sourceSnapshot: { kind: 'blog', revision: 'dynamic', artifactFingerprint: 'dynamic' } }]), manifest);
  assert.equal(result.materialCandidates.length, 0);
  assert.equal(result.suppressedCandidates[0].reason, 'ADMITTED_BLOG_RENDER_CHURN');
});

test('keeps newly discovered release-feed article absent from the admitted manifest', () => {
  const candidate = { id: 'hf-blog-new-release-2026-09-08', sourceSnapshot: { kind: 'blog', artifactFingerprint: 'new' } };
  const result = filterCandidates(combined([candidate]), manifest);
  assert.deepEqual(result.materialCandidates, [candidate]);
  assert.equal(result.suppressedCount, 0);
});

test('keeps unrelated non-blog candidates and does not mutate input', () => {
  const input = combined([{ id: 'inventory-growth', snapshot: { kind: 'model-inventory', artifactFingerprint: 'x' } }]);
  const before = structuredClone(input);
  const result = filterCandidates(input, manifest);
  assert.deepEqual(input, before);
  assert.equal(result.materialCandidates.length, 1);
  assert.equal(result.productionPromotion, false);
  assert.equal(result.candidateSignalPolicy.productionPromotionEffect, 'NONE');
});
