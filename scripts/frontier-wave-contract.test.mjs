// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-07.json", import.meta.url), "utf8"),
);

const expectedReleases = new Map([
  [
    "glm-5-3-family-2026-09-07",
    {
      priority: "P0",
      publisher: "zai-org",
      primaryArtifact: "https://huggingface.co/zai-org/GLM-5.3-Flash",
      licensePosture: "mixed-review-required",
    },
  ],
  [
    "deepseek-v4-flash-vision-exp-2026-09-01",
    {
      priority: "P0",
      publisher: "deepseek-ai",
      primaryArtifact: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
      licensePosture: "clear-mit",
    },
  ],
  [
    "nvidia-qwen3-8-flash-next-nvfp4-2026-09-05",
    {
      priority: "P1",
      publisher: "nvidia",
      primaryArtifact: "https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4",
      licensePosture: "review-required",
    },
  ],
]);

const requiredEvidence = new Set([
  "primary-source-pin",
  "license-posture",
  "reproducible-evaluation",
  "rollback-or-fallback",
  "exact-source-revision",
  "domain-proof-record",
]);

describe("2026-09-07 governed frontier wave", () => {
  it("preserves the authority chain and fail-closed production posture", () => {
    assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
    assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
    assert.deepEqual(wave.alignment.order, [
      "github-source",
      "hugging-face-artifact-projection",
      "a-11-oy.com-product-surface",
      "a11oy.net-proof-registry",
    ]);
    assert.equal(wave.policy.defaultEffect, "hold");
    assert.equal(wave.policy.automaticDiscovery, true);
    assert.equal(wave.policy.automaticProductionPromotion, false);
    assert.equal(wave.policy.changeTransport, "branch-and-pull-request");
    assert.deepEqual(new Set(wave.policy.requiredEvidence), requiredEvidence);
    assert.ok(
      wave.codexCompletionContract.required.includes(
        "leave production defaults unchanged until production gates are explicitly satisfied",
      ),
    );
  });

  it("contains each admitted candidate exactly once with its bounded identity", () => {
    assert.equal(wave.releases.length, expectedReleases.size);
    const ids = wave.releases.map((release) => release.id);
    assert.equal(new Set(ids).size, ids.length, "release ids must be unique");
    assert.deepEqual(new Set(ids), new Set(expectedReleases.keys()));

    for (const release of wave.releases) {
      const expected = expectedReleases.get(release.id);
      assert.ok(expected, `unexpected release ${release.id}`);
      assert.equal(release.priority, expected.priority);
      assert.equal(release.publisher, expected.publisher);
      assert.equal(release.primaryArtifact, expected.primaryArtifact);
      assert.equal(release.licensePosture, expected.licensePosture);
      assert.ok(release.artifacts.includes(release.primaryArtifact));
    }
  });

  it("deduplicates upstream artifacts and binds them to their declared publishers", () => {
    const artifacts = wave.releases.flatMap((release) => release.artifacts);
    assert.equal(new Set(artifacts).size, artifacts.length, "artifact URIs must be unique");

    for (const release of wave.releases) {
      for (const artifact of release.artifacts) {
        const url = new URL(artifact);
        const [publisher, model] = url.pathname.split("/").filter(Boolean);
        assert.equal(url.protocol, "https:");
        assert.equal(url.hostname, "huggingface.co");
        assert.equal(publisher, release.publisher);
        assert.ok(model, `missing model identity in ${artifact}`);
      }
    }

    const alreadyAdmitted = new Set(wave.alreadyAdmitted);
    for (const release of wave.releases) {
      assert.equal(alreadyAdmitted.has(release.id), false, `${release.id} is already admitted`);
    }
  });

  it("maps every implementation target to the control plane or a declared consumer", () => {
    assert.equal(wave.alignment.github.controlPlane, wave.sourceOfTruth);
    const allowedRepos = new Set([
      wave.sourceOfTruth,
      ...wave.alignment.github.consumers,
    ]);

    for (const release of wave.releases) {
      assert.ok(release.targetRepos.includes(wave.sourceOfTruth));
      assert.ok(release.targetRepos.length > 1);
      for (const target of release.targetRepos) {
        assert.ok(allowedRepos.has(target), `${release.id} has undeclared target ${target}`);
      }
    }
  });

  it("requires source pins, reproducible measurements, and fallback before promotion", () => {
    for (const release of wave.releases) {
      assert.ok(release.acceptance.length >= 5);
      const contract = release.acceptance.join(" ").toLowerCase();
      assert.match(contract, /pin/);
      assert.match(contract, /revision/);
      assert.match(contract, /benchmark|compare|measure|record/);
      assert.match(contract, /fallback|production gates/);
      assert.match(contract, /promote|bypass|default/);
    }
  });
});
