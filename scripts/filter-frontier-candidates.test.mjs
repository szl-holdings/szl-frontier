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

const pythonCatalog = [
  {
    id: 'trl-grpo-ifstruct-2026-09-03',
    title: 'TRL GRPO structured-output post-training recipe',
    origin: 'python-admission',
    primarySource: 'https://huggingface.co/blog/grpo-with-trl-ifstruct',
  },
  {
    id: 'vlm-run-gateway-2026-09-04',
    title: 'VLM Run Gateway unified OCR/VLM evaluation API',
    origin: 'python-admission',
    primarySource: 'https://huggingface.co/blog/vlm-run/introducing-gateway',
  },
];

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

test('suppresses Python-curated admitted blogs before alert publication', () => {
  const candidates = [
    {
      id: 'trl-grpo-ifstruct-2026-09-03',
      primarySource: 'https://huggingface.co/blog/grpo-with-trl-ifstruct',
      snapshot: { kind: 'blog', revision: 'render-a', artifactFingerprint: 'render-a' },
    },
    {
      id: 'vlm-run-gateway-2026-09-04',
      primarySource: 'https://huggingface.co/blog/vlm-run/introducing-gateway',
      snapshot: { kind: 'blog', revision: 'render-b', artifactFingerprint: 'render-b' },
    },
  ];
  const result = filterCandidates(combined(candidates), manifest, pythonCatalog);
  assert.equal(result.materialCandidates.length, 0);
  assert.equal(result.suppressedCount, 2);
  assert.deepEqual(result.suppressedCandidates.map((row) => row.reason), [
    'ADMITTED_BLOG_RENDER_CHURN',
    'ADMITTED_BLOG_RENDER_CHURN',
  ]);
  assert.equal(result.candidateSignalPolicy.admittedCatalogRule, 'deduplication covers every canonical admission source before issue publication');
});

test('keeps newly discovered release-feed article absent from every admitted catalog', () => {
  const candidate = { id: 'hf-blog-new-release-2026-09-14', sourceSnapshot: { kind: 'blog', artifactFingerprint: 'new' } };
  const result = filterCandidates(combined([candidate]), manifest, pythonCatalog);
  assert.deepEqual(result.materialCandidates, [candidate]);
  assert.equal(result.suppressedCount, 0);
});

test('fails closed on a malformed admitted catalog', () => {
  assert.throws(
    () => filterCandidates(combined([]), manifest, { rows: [] }),
    /admitted catalog must be a release array or contain releases\[\]/u,
  );
});

test('keeps unrelated non-blog candidates and does not mutate input', () => {
  const input = combined([{ id: 'inventory-growth', snapshot: { kind: 'model-inventory', artifactFingerprint: 'x' } }]);
  const before = structuredClone(input);
  const result = filterCandidates(input, manifest, pythonCatalog);
  assert.deepEqual(input, before);
  assert.equal(result.materialCandidates.length, 1);
  assert.equal(result.productionPromotion, false);
  assert.equal(result.candidateSignalPolicy.productionPromotionEffect, 'NONE');
});
