// Copyright 2026 SZL Holdings - SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import { openFrontierAlerts, validateAlertReport } from "./open-frontier-alerts.mjs";

const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

function candidate(fingerprint = fingerprintA, overrides = {}) {
  return {
    fingerprint,
    title: "Bounded inference release",
    primarySource: "https://huggingface.co/blog/bounded-inference",
    materialityScore: 85,
    material: true,
    productionDisposition: "HOLD",
    reasons: ["trusted publisher", "new release signal"],
    ...overrides,
  };
}

function report(materialCandidates, overrides = {}) {
  return {
    schema: "szl.frontier.watch-output.v1",
    live: true,
    productionPromotion: false,
    materialCandidates,
    ...overrides,
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("a live report with no candidates is a credential-free no-op", async () => {
  const result = await openFrontierAlerts(report([]), {
    fetchImpl: async () => assert.fail("no GitHub request should be made"),
  });
  assert.deepEqual(result, {
    schema: "szl.frontier.alert-result.v1",
    candidates: 0,
    created: 0,
    duplicates: 0,
    issues: [],
  });
});

test("existing fingerprints are skipped and new candidates create guarded issues", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === "GET") {
      return jsonResponse([{ body: `prior evidence\n<!-- szl-frontier-candidate:${fingerprintA} -->` }]);
    }
    return jsonResponse({
      number: 42,
      html_url: "https://github.com/szl-holdings/szl-frontier/issues/42",
    }, 201);
  };
  const result = await openFrontierAlerts(
    report([
      candidate(fingerprintA),
      candidate(fingerprintB, { title: "Release @all <!-- injected -->" }),
    ]),
    {
      token: "test-token",
      repository: "szl-holdings/szl-frontier",
      fetchImpl,
    },
  );
  assert.equal(result.created, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.issues[0].fingerprint, fingerprintB);
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].options.body);
  assert.match(payload.body, /Production promotion:\*\* false/u);
  assert.match(payload.body, /authorizes no code execution/u);
  assert.doesNotMatch(payload.title, /@all/u);
  assert.doesNotMatch(payload.body, /<!-- injected -->/u);
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-token");
});

test("duplicate candidates inside one report cannot create duplicate issues", () => {
  assert.equal(
    validateAlertReport(report([candidate(), candidate()])).length,
    1,
  );
});

test("non-Hugging Face sources and promotion-capable reports fail closed", async () => {
  assert.throws(
    () => validateAlertReport(report([candidate(fingerprintA, { primarySource: "https://example.com/model" })])),
    /provider-owned Hugging Face HTTPS/u,
  );
  await assert.rejects(
    openFrontierAlerts(report([], { productionPromotion: true })),
    /prohibit production promotion/u,
  );
});
