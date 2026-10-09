// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { healthResponse } from "../src/lib/frontier/source.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("/healthz liveness route", () => {
  it("answers 200 JSON liveness that never claims readiness or authorization", async () => {
    const response = healthResponse();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-szl-production-authorization"), "false");
    const body = await response.json();
    assert.equal(body.schema, "szl.frontier.health/v1");
    assert.equal(body.ok, true);
    assert.equal(body.organ, "szl-holdings/szl-frontier");
    assert.equal(body.operational, true);
    assert.equal(body.softwareState, "OPERATIONAL");
    assert.equal(body.productionDisposition, "HOLD");
    assert.equal(body.productionAuthorization, false);
    assert.equal(body.runtimeVerified, false);
  });

  it("serves /healthz and /api/health from the same response builder", () => {
    for (const [file, path] of [
      ["../src/routes/healthz.ts", "/healthz"],
      ["../src/routes/api/health.ts", "/api/health"],
    ]) {
      const source = read(file);
      assert.ok(source.includes(`createFileRoute("${path}")`), `${file} registers ${path}`);
      assert.match(source, /GET: async \(\) => healthResponse\(\)/);
    }
  });

  it("is registered in the committed route tree that typecheck reads", () => {
    const tree = read("../src/routeTree.gen.ts");
    assert.match(tree, /import \{ Route as HealthzRouteImport \} from '\.\/routes\/healthz'/);
    assert.match(tree, /'\/healthz': typeof HealthzRoute/);
  });
});
