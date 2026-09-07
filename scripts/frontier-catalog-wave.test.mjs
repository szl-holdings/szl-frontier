// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  FRONTIER_CATALOG_EVALUATED_AT,
  FRONTIER_RELEASES,
  buildFrontierReleaseManifest,
  evaluationDecision,
  isMaterialRelease,
  productionDisposition,
} from "../src/lib/frontier/release-catalog.js";

const pins = JSON.parse(
  readFileSync(
    new URL("../frontier/evidence/2026-09-07-upstream-model-pins.json", import.meta.url),
    "utf8",
  ),
);

const expected = new Map([
  ["glm-5-3-family-2026-09-07", "EVALUATE"],
  ["deepseek-v4-flash-vision-exp-2026-09-01", "EVALUATE"],
  ["nvidia-qwen3-8-flash-next-nvfp4-2026-09-05", "BENCHMARK"],
]);

describe("canonical catalog 2026-09-07 wave", () => {
  it("admits all three source-pinned candidates once", () => {
    assert.equal(FRONTIER_CATALOG_EVALUATED_AT, "2026-09-07T23:26:13Z");
    const releases = FRONTIER_RELEASES.filter((release) => expected.has(release.id));
    assert.equal(releases.length, expected.size);
    assert.equal(new Set(releases.map((release) => release.id)).size, expected.size);

    for (const release of releases) {
      assert.equal(release.artifactPins?.length > 0, true);
      assert.match(release.artifactRevision ?? "", /^[a-f0-9]{40}$/);
      assert.ok(release.primarySource.endsWith(`/tree/${release.artifactRevision}`));
      assert.equal(isMaterialRelease(release), true);
      assert.equal(evaluationDecision(release), expected.get(release.id));
      assert.equal(productionDisposition(release), "HOLD");
      assert.ok(
        release.gates.some(
          (gate) => gate.scope === "evaluation" && gate.state === "pass" && gate.id.endsWith("source"),
        ),
      );
      assert.ok(release.gates.some((gate) => gate.scope === "production" && gate.state !== "pass"));
    }
  });

  it("binds every catalog artifact pin to the independent metadata receipt", () => {
    const receiptPins = new Map(
      pins.models.map((model) => [`${model.repoId}@${model.revision}`, model]),
    );

    for (const release of FRONTIER_RELEASES.filter((item) => expected.has(item.id))) {
      for (const pin of release.artifactPins ?? []) {
        const receipt = receiptPins.get(`${pin.repoId}@${pin.revision}`);
        assert.ok(receipt, `missing receipt pin ${pin.repoId}@${pin.revision}`);
        assert.equal(receipt.releaseId, release.id);
        assert.equal(receipt.license, pin.license);
      }
    }
  });

  it("regenerates a ten-release manifest with zero production promotions", () => {
    const manifest = buildFrontierReleaseManifest();
    assert.equal(manifest.releaseCount, 10);
    assert.equal(manifest.materialReleaseCount, 10);
    assert.equal(manifest.productionPromotionCount, 0);
    assert.equal(manifest.policy.defaultEffect, "hold");
    assert.deepEqual(
      new Set(manifest.releases.filter((release) => expected.has(release.id)).map((release) => release.id)),
      new Set(expected.keys()),
    );
  });
});
