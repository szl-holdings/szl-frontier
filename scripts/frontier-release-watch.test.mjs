// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorialMateriality,
  feedCandidate,
  parseHuggingFaceFeed,
  snapshotHubAsset,
  stableStringify,
} from "./frontier-release-watch.mjs";

describe("frontier release watch", () => {
  it("canonicalizes object keys deterministically", () => {
    assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
  });

  it("parses Hugging Face blog feed items", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Introducing a new inference runtime</title><link>https://huggingface.co/blog/huggingface/runtime-x</link><pubDate>Fri, 04 Sep 2026 12:00:00 GMT</pubDate><description>Released inference engine for deployment</description></item></channel></rss>`;
    const items = parseHuggingFaceFeed(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0].author, "huggingface");
  });

  it("marks a recent trusted frontier release material", () => {
    const item = {
      title: "Introducing a new inference engine for agents",
      description: "Released runtime with deployment, retrieval, and multimodal support",
      primarySource: "https://huggingface.co/blog/huggingface/runtime-x",
      publishedAt: "2026-09-04T12:00:00Z",
      author: "huggingface",
    };
    const assessment = editorialMateriality(item, "2026-09-03T00:00:00Z");
    assert.ok(assessment.score >= 70, assessment);
    assert.equal(assessment.recent, true);
    assert.equal(feedCandidate(item, "2026-09-03T00:00:00Z").material, true);
  });

  it("fingerprints Hub artifact inventories without downloading weights", () => {
    const snapshot = snapshotHubAsset("model", "org/model", {
      sha: "abc123",
      lastModified: "2026-09-04T00:00:00Z",
      private: false,
      gated: false,
      disabled: false,
      cardData: { license: "apache-2.0" },
      siblings: [
        { rfilename: "model.safetensors", size: 10, lfs: { oid: "sha256:one", size: 10 } },
        { rfilename: "config.json", size: 2, blobId: "two" },
      ],
    });
    assert.equal(snapshot.revision, "abc123");
    assert.equal(snapshot.license, "apache-2.0");
    assert.match(snapshot.artifactFingerprint, /^[a-f0-9]{64}$/);
  });
});
