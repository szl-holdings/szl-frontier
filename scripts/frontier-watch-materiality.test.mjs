// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  FIRST_OBSERVATION,
  NO_MATERIAL,
  RIGHTS_CHANGE,
  SUBSTANTIVE_CHANGE,
  UNKNOWN_IDENTITIES,
  classifyFile,
  classifyHubFiles,
  materialArtifactDelta,
  shouldDeliverAlert,
} from "../src/lib/frontier/watch-materiality.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const ROWS = [
  { name: "README.md", oid: "b".repeat(40), size: 30 },
  { name: "LICENSE", oid: "c".repeat(40), size: 31 },
  { name: "config.json", oid: "d".repeat(40), size: 32 },
  { name: "model.safetensors", oid: "e".repeat(64), size: 100 },
];

function classified(rows = ROWS, extra = {}) {
  const parts = classifyHubFiles(rows, sha256);
  return {
    id: "org/model",
    kind: "model",
    accessFlags: { private: false, gated: false, disabled: false },
    licenseMetadata: "apache-2.0",
    ...parts,
    ...extra,
  };
}

describe("frontier watch materiality (T28)", () => {
  it("classifies presentation versus weights", () => {
    assert.equal(classifyFile("README.md"), "presentation");
    assert.equal(classifyFile("LICENSE"), "rights");
    assert.equal(classifyFile("model.safetensors"), "substantive");
  });

  it("does not treat a seeded first observation as a new release", () => {
    const current = classified();
    assert.equal(materialArtifactDelta(null, current), FIRST_OBSERVATION);
    assert.equal(
      shouldDeliverAlert({
        delta: FIRST_OBSERVATION,
        seeded: true,
        alreadyAlertedKey: null,
        lastAlertKey: null,
      }),
      false,
    );
  });

  it("keeps card-only churn quiet", () => {
    const before = classified();
    const after = classified([
      { name: "README.md", oid: "f".repeat(40), size: 44 },
      ROWS[1],
      ROWS[2],
      ROWS[3],
    ]);
    assert.equal(materialArtifactDelta(before, after), NO_MATERIAL);
  });

  it("alerts on substantive and rights changes", () => {
    const before = classified();
    const weights = classified([ROWS[0], ROWS[1], ROWS[2], { name: "model.safetensors", oid: "f".repeat(64), size: 100 }]);
    const rights = classified([ROWS[0], { name: "LICENSE", oid: "f".repeat(40), size: 31 }, ROWS[2], ROWS[3]]);
    assert.equal(materialArtifactDelta(before, weights), SUBSTANTIVE_CHANGE);
    assert.equal(materialArtifactDelta(before, rights), RIGHTS_CHANGE);
    assert.equal(
      shouldDeliverAlert({
        delta: SUBSTANTIVE_CHANGE,
        seeded: true,
        alreadyAlertedKey: null,
        lastAlertKey: "k",
      }),
      true,
    );
  });

  it("records incomplete identities as UNKNOWN", () => {
    const before = classified();
    const incomplete = classified([ROWS[0], ROWS[1], ROWS[2], { name: "model.safetensors", oid: null, size: 100 }]);
    assert.equal(incomplete.inventoryComplete, false);
    assert.equal(materialArtifactDelta(before, incomplete), UNKNOWN_IDENTITIES);
  });
});
