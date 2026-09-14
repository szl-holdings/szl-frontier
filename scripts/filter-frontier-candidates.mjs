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

function releasesFromCatalog(catalog) {
  if (Array.isArray(catalog)) return catalog;
  if (catalog && typeof catalog === 'object' && Array.isArray(catalog.releases)) {
    return catalog.releases;
  }
  throw new TypeError('admitted catalog must be a release array or contain releases[]');
}

export function filterCandidates(combined, ...catalogs) {
  if (!combined || typeof combined !== 'object' || !Array.isArray(combined.materialCandidates)) {
    throw new TypeError('combined watch output must contain materialCandidates[]');
  }
  if (catalogs.length === 0) {
    throw new TypeError('at least one admitted catalog is required');
  }

  const admitted = new Map();
  for (const catalog of catalogs) {
    for (const release of releasesFromCatalog(catalog)) {
      if (!release || typeof release !== 'object' || typeof release.id !== 'string' || !release.id) {
        throw new TypeError('every admitted release must contain a non-empty id');
      }
      admitted.set(release.id, release);
    }
  }

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
      // For any already-admitted HF article, including Python-curated admissions,
      // rendered <main> churn is observation-only. New articles are discovered
      // independently and arrive with IDs absent from the complete admitted catalog.
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
      admittedCatalogRule: 'deduplication covers every canonical admission source before issue publication',
      admittedModelDatasetRule: 'revision churn is non-material when normalized artifact inventory is unchanged',
      admittedBlogRule: 'rendered-page churn is observation-only; new HF articles are discovered from the primary release feed',
      preservesNewUncatalogedCandidates: true,
      productionPromotionEffect: 'NONE',
    },
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length < 2) {
    console.error('usage: filter-frontier-candidates.mjs <combined-json> <admitted-catalog-json> [additional-admitted-catalog-json ...]');
    return 2;
  }
  const [combinedPath, ...catalogPaths] = argv;
  const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
  const catalogs = catalogPaths.map((catalogPath) => JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
  const filtered = filterCandidates(combined, ...catalogs);
  fs.writeFileSync(combinedPath, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    materialCandidates: filtered.materialCandidates.length,
    suppressedCandidates: filtered.suppressedCount,
    admittedCatalogs: catalogs.length,
    productionPromotion: filtered.productionPromotion,
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
