// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogCandidate,
  classifiedWatchDelta,
  editorialMateriality,
  feedCandidate,
  hasCompleteSourceCoverage,
  parseHuggingFaceFeed,
  readClassifiedLedgerSync,
  runWatch,
  snapshotHuggingFaceBlog,
  snapshotHubAsset,
  stableStringify,
} from "./frontier-release-watch.mjs";
import { FIRST_OBSERVATION, NO_MATERIAL, SUBSTANTIVE_CHANGE } from "../src/lib/frontier/watch-materiality.js";
import { FRONTIER_RELEASES, productionDisposition } from "../src/lib/frontier/release-catalog.js";

function completeCoverageReport() {
  const rows = FRONTIER_RELEASES.map(({ id, artifactSource }) => ({ id, source: artifactSource, status: "ok" }));
  rows.push({ id: "hugging-face-blog-feed", source: "https://huggingface.co/blog/feed.xml", status: "ok" });
  return {
    schema: "szl.frontier.watch-output.v1",
    live: true,
    productionPromotion: false,
    sourceCount: rows.length,
    successfulSources: rows.length,
    sourceResults: rows,
    errors: [],
  };
}

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
    assert.equal(typeof snapshot.classifiedFingerprints.substantive, "string");
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
    const complete = completeCoverageReport();
    assert.equal(hasCompleteSourceCoverage(complete), true);
    assert.equal(hasCompleteSourceCoverage({ ...complete, errors: [{ error: "upstream failed" }] }), false);
    assert.equal(hasCompleteSourceCoverage({ ...complete, successfulSources: 1 }), false);
  });

  it("rejects duplicate identities concealing a missing admitted source at equal counts", () => {
    const report = completeCoverageReport();
    report.sourceResults[1] = { ...report.sourceResults[0] };
    assert.equal(hasCompleteSourceCoverage(report), false);
  });

  it("rejects equal-count substitution by an unknown source", () => {
    const report = completeCoverageReport();
    report.sourceResults[0] = { id: "unadmitted", source: "https://huggingface.co/unadmitted", status: "ok" };
    assert.equal(hasCompleteSourceCoverage(report), false);
  });

  it("rejects a known identity paired with the wrong URL", () => {
    const report = completeCoverageReport();
    report.sourceResults[0].source = report.sourceResults[1].source;
    assert.equal(hasCompleteSourceCoverage(report), false);
  });

  it("requires the feed identity and exact feed URL", () => {
    for (const change of [{ id: "another-feed" }, { source: "https://example.invalid/feed.xml" }]) {
      const report = completeCoverageReport();
      Object.assign(report.sourceResults.at(-1), change);
      assert.equal(hasCompleteSourceCoverage(report), false);
    }
  });

  it("rejects missing and extra rows even when declared counts are adjusted", () => {
    for (const add of [false, true]) {
      const report = completeCoverageReport();
      if (add) report.sourceResults.push({ ...report.sourceResults[0] });
      else report.sourceResults.pop();
      report.sourceCount = report.sourceResults.length;
      report.successfulSources = report.sourceResults.length;
      assert.equal(hasCompleteSourceCoverage(report), false);
    }
  });

  it("rejects wrong schema, dry or non-boolean live state, and promotion", () => {
    const report = completeCoverageReport();
    for (const change of [
      { schema: "szl.frontier.combined-watch-output.v1" },
      { live: false }, { live: "true" }, { live: 1 },
      { productionPromotion: true }, { productionPromotion: undefined },
    ]) assert.equal(hasCompleteSourceCoverage({ ...report, ...change }), false);
  });

  it("rejects coerced counts and malformed report containers without throwing", () => {
    const report = completeCoverageReport();
    for (const change of [
      { sourceCount: String(report.sourceCount) },
      { successfulSources: String(report.successfulSources) },
      { sourceCount: true }, { sourceCount: NaN },
      { sourceResults: null }, { errors: null }, { errors: {} },
    ]) assert.equal(hasCompleteSourceCoverage({ ...report, ...change }), false);
    for (const malformed of [null, undefined, true, 1, "report", []]) {
      assert.equal(hasCompleteSourceCoverage(malformed), false);
    }
  });

  it("rejects malformed, identity-free, and unsuccessful source rows", () => {
    for (const row of [null, [], {}, { status: "ok" }, { ...completeCoverageReport().sourceResults[0], status: "dry" }]) {
      const report = completeCoverageReport();
      report.sourceResults[0] = row;
      assert.equal(hasCompleteSourceCoverage(report), false);
    }
  });

  it("accepts reordered complete rows without altering evidence", () => {
    const report = completeCoverageReport();
    report.sourceResults.reverse();
    const before = JSON.stringify(report);
    assert.equal(hasCompleteSourceCoverage(report), true);
    assert.equal(JSON.stringify(report), before);
  });

  it("accepts the real producer with offline simulated transport", async () => {
    let calls = 0;
    const fetchImpl = async (input) => {
      calls += 1;
      const url = new URL(input);
      let body;
      if (url.pathname === "/blog/feed.xml") body = "<rss><channel></channel></rss>";
      else if (url.pathname.startsWith("/blog/")) body = "<html><main>synthetic article</main></html>";
      else if (url.pathname === "/api/models") body = "[]";
      else body = JSON.stringify({ sha: "a".repeat(40), siblings: [], cardData: { license: "apache-2.0" } });
      return new Response(body, { status: 200 });
    };
    const report = await runWatch({ live: true, fetchImpl });
    assert.equal(calls, FRONTIER_RELEASES.length + 1);
    assert.equal(hasCompleteSourceCoverage(report), true);
    assert.equal(report.productionPromotion, false);
  });

  it("keeps dry producer output incomplete", async () => {
    const report = await runWatch({ fetchImpl: () => { throw new Error("unexpected transport"); } });
    assert.equal(hasCompleteSourceCoverage(report), false);
    assert.equal(report.productionPromotion, false);
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

  it("does not treat first Hub observation or card churn as a material model release", () => {
    const release = {
      id: "granite-watch",
      title: "Granite PatchTST",
      publisher: "IBM",
      category: "time-series",
      primarySource: "https://huggingface.co/ibm-granite/granite-timeseries-patchtst-fm-r2",
      artifactSource: "https://huggingface.co/ibm-granite/granite-timeseries-patchtst-fm-r2",
      targetOrgans: ["szl-frontier"],
      whyItMatters: "Optional Lyte challenger",
      operationalTarget: "Review only",
      maturity: "released",
      license: "apache-2.0",
      licensePosture: "clear",
      posture: "EVALUATION",
      signals: { impact: 25, estateFit: 25, evidenceQuality: 20, integrationReadiness: 15, riskPenalty: 0 },
      gates: [{ scope: "production", state: "pending" }],
      watch: { kind: "model", repoId: "ibm-granite/granite-timeseries-patchtst-fm-r2" },
    };
    const payload = (readmeOid, weightOid) => ({
      sha: "a".repeat(40),
      lastModified: "2026-09-24T00:00:00Z",
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
    const first = snapshotHubAsset("model", release.watch.repoId, payload("b".repeat(40), "e".repeat(64)));
    assert.equal(classifiedWatchDelta(release, first), FIRST_OBSERVATION);
    assert.equal(catalogCandidate(release, first, "2026-09-01T00:00:00Z").material, false);

    const seeded = {
      ...release,
      watch: { ...release.watch, classifiedFingerprints: first.classifiedFingerprints },
    };
    const cardChurn = snapshotHubAsset("model", release.watch.repoId, payload("f".repeat(40), "e".repeat(64)));
    assert.equal(classifiedWatchDelta(seeded, cardChurn), NO_MATERIAL);
    assert.equal(catalogCandidate(seeded, cardChurn, "2026-09-01T00:00:00Z").material, false);

    const weights = snapshotHubAsset("model", release.watch.repoId, payload("b".repeat(40), "f".repeat(64)));
    assert.equal(classifiedWatchDelta(seeded, weights), SUBSTANTIVE_CHANGE);
    assert.equal(catalogCandidate(seeded, weights, "2026-09-01T00:00:00Z").material, true);
  });

  it("rejects a production-promoting classified ledger", () => {
    assert.throws(
      () => readClassifiedLedgerSync({ schema: "szl.frontier.watch-classified-ledger.v1", productionPromotion: true, assets: {} }),
      /cannot authorize production/,
    );
  });
});
