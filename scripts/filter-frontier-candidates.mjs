#!/usr/bin/env node
/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import fs from 'node:fs';
import process from 'node:process';

const REASON = Object.freeze({
  ADMITTED_BLOG_RENDER_CHURN: 'ADMITTED_BLOG_RENDER_CHURN',
  UNCHANGED_NORMALIZED_ARTIFACT_INVENTORY: 'UNCHANGED_NORMALIZED_ARTIFACT_INVENTORY',
});

function snapshotOf(candidate) {
  return candidate?.snapshot ?? candidate?.sourceSnapshot ?? null;
}

export function filterCandidates(combined, manifest) {
  if (!combined || typeof combined !== 'object' || !Array.isArray(combined.materialCandidates)) {
    throw new TypeError('combined watch output must contain materialCandidates[]');
  }
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.releases)) {
    throw new TypeError('release manifest must contain releases[]');
  }

  const admitted = new Map(manifest.releases.map((release) => [release.id, release]));
  const materialCandidates = [];
  const suppressedCandidates = [];

  for (const candidate of combined.materialCandidates) {
    const release = admitted.get(candidate?.id);
    if (!release) {
      // Newly discovered feed candidates are intentionally not suppressed merely
      // because their source shape resembles an admitted release.
      materialCandidates.push(candidate);
      continue;
    }

    const snapshot = snapshotOf(candidate);
    const watch = release.watch ?? {};
    const kind = snapshot?.kind ?? watch.kind ?? null;
    let reason = null;

    if (
      (kind === 'model' || kind === 'dataset')
      && typeof watch.baselineFingerprint === 'string'
      && typeof snapshot?.artifactFingerprint === 'string'
      && snapshot.artifactFingerprint === watch.baselineFingerprint
    ) {
      reason = REASON.UNCHANGED_NORMALIZED_ARTIFACT_INVENTORY;
    } else if (kind === 'blog') {
      // For already-admitted HF articles the rendered <main> includes dynamic
      // community/UI content. New articles are discovered independently from the
      // primary HF release feed and arrive with IDs absent from the manifest.
      reason = REASON.ADMITTED_BLOG_RENDER_CHURN;
    }

    if (reason) {
      suppressedCandidates.push({
        id: candidate.id,
        title: candidate.title ?? release.title ?? null,
        reason,
        observedRevision: snapshot?.revision ?? null,
        observedFingerprint: snapshot?.artifactFingerprint ?? null,
        baselineRevision: watch.baselineRevision ?? null,
        baselineFingerprint: watch.baselineFingerprint ?? null,
        candidate,
      });
    } else {
      materialCandidates.push(candidate);
    }
  }

  return {
    ...combined,
    materialCandidates,
    suppressedCandidates,
    suppressedCount: suppressedCandidates.length,
    candidateSignalPolicy: {
      schema: 'szl.frontier.candidate-signal-policy.v1',
      admittedModelDatasetRule: 'revision churn is non-material when normalized artifact inventory is unchanged',
      admittedBlogRule: 'rendered-page churn is observation-only; new HF articles are discovered from the primary release feed',
      preservesNewUncatalogedCandidates: true,
      productionPromotionEffect: 'NONE',
    },
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) {
    console.error('usage: filter-frontier-candidates.mjs <combined-json> <release-manifest-json>');
    return 2;
  }
  const [combinedPath, manifestPath] = argv;
  const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const filtered = filterCandidates(combined, manifest);
  fs.writeFileSync(combinedPath, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    materialCandidates: filtered.materialCandidates.length,
    suppressedCandidates: filtered.suppressedCount,
    productionPromotion: filtered.productionPromotion,
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
