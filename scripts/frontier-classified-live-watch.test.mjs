// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRST_OBSERVATION,
  NO_MATERIAL,
  SUBSTANTIVE_CHANGE,
} from "../src/lib/frontier/watch-materiality.js";
import {
  classifiedCatalogCandidate,
  classifiedWatchDelta,
  classifySnapshot,
} from "./frontier-classified-live-watch.mjs";

const hubPayload = (readmeOid, weightOid) => ({
  sha: "a".repeat(40),
  lastModified: "2026-09-19T00:00:00Z",
  private: false,
  gated: false,
  disabled: false,
  cardData: { license: "apache-2.0" },
  siblings: [
    { rfilename: "README.md", size: 30, blobId: readmeOid },
    { rfilename: "LICENSE", size: 31, blobId: "c".repeat(40) },
    { rfilename: "config.json", size: 32, blobId: "d".repeat(40) },
    { rfilename: "model.safetensors", size: 100, lfs: { oid: weightOid, size: 100 } },
  ],
});

const release = {
  id: "granite-patchtst-fm-r2",
  title: "Granite PatchTST-FM-r2",
  publisher: "IBM",
  category: "models",
  primarySource: "https://huggingface.co/ibm-granite/granite-timeseries-patchtst-fm-r2",
  artifactSource: "https://huggingface.co/ibm-granite/granite-timeseries-patchtst-fm-r2",
  targetOrgans: ["szl-frontier"],
  whyItMatters: "Pinned Granite adapter is the optional Lyte challenger.",
  operationalTarget: "Review classified fingerprints only.",
  maturity: "released",
  license: "apache-2.0",
  licensePosture: "clear",
  posture: "EVALUATE_NOW",
  signals: { impact: 25, estateFit: 25, evidenceQuality: 24, integrationReadiness: 20, riskPenalty: 4 },
  gates: [{ scope: "production", state: "pending" }],
  watch: { kind: "model", repoId: "ibm-granite/granite-timeseries-patchtst-fm-r2" },
};

describe("classified live watch hook (T28)", () => {
  it("does not treat first observation or card churn as a material release", () => {
    const first = classifySnapshot("model", release.watch.repoId, hubPayload("b".repeat(40), "e".repeat(64)));
    assert.equal(first.inventoryComplete, true);
    assert.match(first.classifiedFingerprints.substantive, /^[a-f0-9]{64}$/);
    assert.equal(classifiedWatchDelta(release, first), FIRST_OBSERVATION);
    assert.equal(classifiedCatalogCandidate(release, first, "2026-09-01T00:00:00Z").material, false);

    const seeded = { ...release, watch: { ...release.watch, classifiedFingerprints: first.classifiedFingerprints } };
    const cardChurn = classifySnapshot("model", release.watch.repoId, hubPayload("f".repeat(40), "e".repeat(64)));
    assert.notEqual(cardChurn.artifactFingerprint, first.artifactFingerprint);
    assert.equal(classifiedWatchDelta(seeded, cardChurn), NO_MATERIAL);
    assert.equal(classifiedCatalogCandidate(seeded, cardChurn, "2026-09-01T00:00:00Z").material, false);
  });

  it("alerts once on a substantive weight identity change", () => {
    const first = classifySnapshot("model", release.watch.repoId, hubPayload("b".repeat(40), "e".repeat(64)));
    const seeded = { ...release, watch: { ...release.watch, classifiedFingerprints: first.classifiedFingerprints } };
    const weights = classifySnapshot("model", release.watch.repoId, hubPayload("b".repeat(40), "f".repeat(64)));
    assert.equal(classifiedWatchDelta(seeded, weights), SUBSTANTIVE_CHANGE);
    assert.equal(classifiedCatalogCandidate(seeded, weights, "2026-09-01T00:00:00Z").material, true);
  });
});
