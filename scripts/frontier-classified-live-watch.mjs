// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
// Additive T28 live-watch hook. Wraps Hub snapshots with classified fingerprints.
// Does not replace release-catalog scoring or rewrite blog / model-inventory watches.

import {
  ALERTABLE,
  classifyHubFiles,
  materialArtifactDelta,
} from "../src/lib/frontier/watch-materiality.js";
import {
  catalogCandidate as baseCatalogCandidate,
  snapshotHubAsset as baseSnapshotHubAsset,
  sha256,
} from "./frontier-release-watch.mjs";

export function classifySnapshot(kind, repoId, payload, sha = sha256) {
  const base = baseSnapshotHubAsset(kind, repoId, payload);
  const classified = classifyHubFiles(payload?.siblings, sha);
  return {
    ...base,
    classifiedFingerprints: classified.fingerprints,
    inventoryComplete: classified.inventoryComplete,
    classifiedFileCount: classified.fileCount,
  };
}

function previousFromWatch(release, snapshot) {
  const previousFp = release.watch?.classifiedFingerprints;
  if (!previousFp || typeof previousFp !== "object") return null;
  return {
    id: snapshot.repoId ?? release.watch.repoId,
    kind: snapshot.kind,
    inventoryComplete: ["rights", "presentation", "substantive"].every(
      (key) => typeof previousFp[key] === "string" && /^[a-f0-9]{64}$/.test(previousFp[key]),
    ),
    fingerprints: previousFp,
    accessFlags: release.watch.classifiedAccessFlags ?? {
      private: Boolean(snapshot.private),
      gated: Boolean(snapshot.gated),
      disabled: Boolean(snapshot.disabled),
    },
    licenseMetadata: release.watch.classifiedLicense ?? snapshot.license ?? release.license ?? null,
  };
}

export function classifiedWatchDelta(release, snapshot) {
  const current = {
    id: snapshot.repoId ?? release.watch?.repoId,
    kind: snapshot.kind,
    inventoryComplete: snapshot.inventoryComplete === true,
    fingerprints: snapshot.classifiedFingerprints ?? {},
    accessFlags: {
      private: Boolean(snapshot.private),
      gated: Boolean(snapshot.gated),
      disabled: Boolean(snapshot.disabled),
    },
    licenseMetadata: snapshot.license ?? release.license ?? null,
  };
  return materialArtifactDelta(previousFromWatch(release, snapshot), current);
}

export function usesClassifiedHubWatch(release) {
  return release?.watch?.kind === "model" || release?.watch?.kind === "dataset";
}

export function classifiedCatalogCandidate(release, sourceSnapshot, cursor) {
  const candidate = baseCatalogCandidate(release, sourceSnapshot, cursor);
  if (!usesClassifiedHubWatch(release)) return { ...candidate, classifiedDelta: null };
  const classifiedDelta = classifiedWatchDelta(release, sourceSnapshot);
  const publicAndUsable = !sourceSnapshot.private && !sourceSnapshot.gated && !sourceSnapshot.disabled;
  const material = candidate.materialityScore >= 70 && publicAndUsable && ALERTABLE.has(classifiedDelta);
  return {
    ...candidate,
    classifiedDelta,
    material,
    reasons: [
      candidate.reasons[0],
      ALERTABLE.has(classifiedDelta)
        ? `classified Hub delta ${classifiedDelta}`
        : `classified Hub delta ${classifiedDelta} stays off the material-alert channel`,
      publicAndUsable ? "source is public and ungated" : "source is private, gated, disabled, or unavailable",
    ],
  };
}

export { ALERTABLE };
