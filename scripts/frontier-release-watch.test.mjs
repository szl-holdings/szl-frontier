// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogCandidate,
  editorialMateriality,
  feedCandidate,
  hasCompleteSourceCoverage,
  parseHuggingFaceFeed,
  snapshotHuggingFaceBlog,
  snapshotHubAsset,
  stableStringify,
} from "./frontier-release-watch.mjs";
import { productionDisposition } from "../src/lib/frontier/release-catalog.js";

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

  it("fingerprints a bounded official blog page without executing its content", () => {
    const snapshot = snapshotHuggingFaceBlog(
      {
        releasedAt: "2026-09-03",
        watch: { kind: "blog", repoId: "funes" },
      },
      "<!doctype html><html><head><title>Funes - Hugging Face</title></head><body><main>portable memory</main></body></html>",
      {
        finalUrl: "https://huggingface.co/blog/funes",
      },
    );
    assert.equal(snapshot.kind, "blog");
    assert.equal(snapshot.repoId, "funes");
    assert.equal(snapshot.title, "Funes - Hugging Face");
    assert.equal(snapshot.catalogReleasedAt, "2026-09-03");
    assert.match(snapshot.artifactFingerprint, /^[a-f0-9]{64}$/);
    const noisyShell = snapshotHuggingFaceBlog(
      { releasedAt: "2026-09-03", watch: { kind: "blog", repoId: "funes" } },
      "<!doctype html><html><head><title>Funes - Hugging Face</title><script>volatile()</script></head><body><main>portable memory</main></body></html>",
    );
    assert.equal(noisyShell.artifactFingerprint, snapshot.artifactFingerprint);
  });

  it("treats changed admitted blog content as a material candidate", () => {
    const release = {
      id: "funes",
      title: "Funes",
      publisher: "Hugging Face community",
      category: "agent-memory",
      primarySource: "https://huggingface.co/blog/funes",
      artifactSource: "https://huggingface.co/blog/funes",
      targetOrgans: ["szl-frontier"],
      whyItMatters: "Portable memory",
      operationalTarget: "Review only",
      maturity: "released",
      license: "review-required",
      licensePosture: "review-required",
      posture: "ARCHITECTURE_WATCH",
      signals: { impact: 25, estateFit: 25, evidenceQuality: 20, integrationReadiness: 15, riskPenalty: 5 },
      gates: [{ scope: "production", state: "pending" }],
      watch: { kind: "blog", repoId: "funes", baselineFingerprint: "0".repeat(64) },
    };
    const snapshot = snapshotHuggingFaceBlog(
      release,
      '<html><head><title>Funes</title><script type="application/ld+json">{"datePublished":"2026-09-03T00:00:00Z"}</script></head><body><main>changed article</main></body></html>',
      { finalUrl: release.artifactSource },
    );
    const candidate = catalogCandidate(release, snapshot, "2026-09-04T00:00:00Z");
    assert.equal(candidate.material, true);
    assert.ok(candidate.reasons.includes("blog content fingerprint changed from the admitted baseline"));
  });

  it("requires every declared source to succeed before the watch is complete", () => {
    const complete = {
      live: true,
      sourceCount: 2,
      successfulSources: 2,
      sourceResults: [{ status: "ok" }, { status: "ok" }],
      errors: [],
    };
    assert.equal(hasCompleteSourceCoverage(complete), true);
    assert.equal(hasCompleteSourceCoverage({ ...complete, errors: [{ error: "upstream failed" }] }), false);
    assert.equal(hasCompleteSourceCoverage({ ...complete, successfulSources: 1 }), false);
  });

  it("requires a sealed production authorization receipt before promotion", () => {
    const release = {
      maturity: "released",
      licensePosture: "clear",
      gates: [{ scope: "production", state: "pass" }],
    };
    assert.equal(productionDisposition(release), "HOLD");
    assert.equal(
      productionDisposition({
        ...release,
        productionReceipt: {
          sealed: true,
          subject: "hugging-face-frontier-production-authorization",
          digest: "a".repeat(64),
        },
      }),
      "PROMOTE",
    );
  });
});
