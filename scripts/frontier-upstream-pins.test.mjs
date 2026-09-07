// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const wave = readJson("../frontier/waves/2026-09-07.json");
const pinSet = readJson("../frontier/evidence/2026-09-07-upstream-model-pins.json");

const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
};

const canonical = (value) => Buffer.from(JSON.stringify(normalize(value)), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const repoIdFromArtifact = (artifact) => new URL(artifact).pathname.split("/").filter(Boolean).join("/");

describe("2026-09-07 upstream model pin set", () => {
  it("verifies its canonical receipt", () => {
    assert.equal(pinSet.schema, "szl.frontier.upstream-model-pin-set.v1");
    assert.equal(pinSet.authority, "PUBLIC_METADATA_ONLY");
    const { receipt, ...body } = pinSet;
    const bytes = canonical(body);
    assert.equal(receipt.algorithm, "sha256");
    assert.equal(receipt.scope, "canonical-json(body-without-receipt)");
    assert.equal(receipt.canonicalBytes, bytes.length);
    assert.equal(receipt.digest, sha256(bytes));
  });

  it("pins every wave artifact to one exact public Hugging Face revision", () => {
    const artifactRepos = new Set(
      wave.releases.flatMap((release) => release.artifacts.map(repoIdFromArtifact)),
    );
    const pinsByRepo = new Map(pinSet.models.map((model) => [model.repoId, model]));

    for (const repoId of artifactRepos) {
      const pin = pinsByRepo.get(repoId);
      assert.ok(pin, `missing upstream pin for ${repoId}`);
      assert.match(pin.revision, /^[a-f0-9]{40}$/);
      assert.equal(pin.private, false);
      assert.equal(pin.gated, false);
      assert.equal(pin.disabled, false);
    }
  });

  it("binds primary pins and observed licenses to each release posture", () => {
    for (const release of wave.releases) {
      const releasePins = pinSet.models.filter((model) => model.releaseId === release.id);
      assert.ok(releasePins.length > 0, `missing pin set for ${release.id}`);
      const primaryRepo = repoIdFromArtifact(release.primaryArtifact);
      assert.ok(
        releasePins.some(
          (model) => model.repoId === primaryRepo && model.role.startsWith("primary"),
        ),
        `missing primary revision for ${release.id}`,
      );

      const artifactRepos = new Set(release.artifacts.map(repoIdFromArtifact));
      const artifactLicenses = releasePins
        .filter((model) => artifactRepos.has(model.repoId))
        .map((model) => model.license);

      if (release.licensePosture === "clear-mit") {
        assert.ok(artifactLicenses.length > 0);
        assert.ok(artifactLicenses.every((license) => license === "mit"));
      } else {
        assert.ok(
          artifactLicenses.some((license) => license !== "mit"),
          `${release.id} must not widen a non-MIT observation`,
        );
      }
    }
  });

  it("pins the NVIDIA quantized artifact and its declared base model separately", () => {
    const quantized = pinSet.models.find(
      (model) => model.repoId === "nvidia/Qwen3.8-Flash-Next-NVFP4",
    );
    const base = pinSet.models.find((model) => model.repoId === "Qwen/Qwen3.8-Flash-Next");
    assert.ok(quantized);
    assert.ok(base);
    assert.deepEqual(quantized.baseModel, [base.repoId]);
    assert.equal(quantized.role, "primary-quantized");
    assert.equal(base.role, "base-model");
    assert.match(base.revision, /^[a-f0-9]{40}$/);
  });

  it("records bounded, reproducible collector identity without claiming capability", () => {
    assert.deepEqual(pinSet.collector.client, {
      name: "huggingface_hub",
      version: "1.30.0",
    });
    assert.equal(pinSet.collector.namespace, "SZLHOLDINGS");
    assert.equal(pinSet.collector.jobs.length, 2);
    assert.equal(new Set(pinSet.collector.jobs.map((job) => job.id)).size, 2);
    for (const job of pinSet.collector.jobs) {
      assert.equal(job.flavor, "cpu-basic");
      assert.equal(job.python, "3.12");
      assert.match(job.url, new RegExp(`/jobs/SZLHOLDINGS/${job.id}$`));
      assert.ok(Date.parse(job.finishedAt) >= Date.parse(job.createdAt));
    }
    assert.ok(pinSet.caveats.some((caveat) => caveat.includes("No model weights")));
    assert.ok(pinSet.caveats.some((caveat) => caveat.includes("Production promotion remains HOLD")));
  });
});
