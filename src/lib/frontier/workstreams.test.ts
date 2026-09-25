import assert from "node:assert/strict";
import test from "node:test";
import { FAMILIES, filterWorkstreams, WORKSTREAMS, workstreamSummary } from "./workstreams.ts";

test("catalog is exactly F01–F34 and never self-authorizes production", () => {
  assert.equal(WORKSTREAMS.length, 34);
  assert.deepEqual(
    WORKSTREAMS.map((w) => w.code),
    Array.from({ length: 34 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`),
  );
  assert.ok(WORKSTREAMS.every((w) => w.productionAuthorized === false));
  assert.ok(WORKSTREAMS.every((w) => w.productionDisposition === "HOLD"));
  assert.ok(WORKSTREAMS.every((w) => (FAMILIES as readonly string[]).includes(w.family)));
});

test("search, family, and selected filters compose", () => {
  const deepseek = filterWorkstreams(WORKSTREAMS, { q: "deepseek" });
  assert.ok(deepseek.some((w) => w.id === "F04"));
  const memory = filterWorkstreams(WORKSTREAMS, { family: "memory" });
  assert.ok(memory.every((w) => w.family === "memory"));
  const selected = filterWorkstreams(WORKSTREAMS, { selected: true });
  assert.ok(selected.length >= 1 && selected.every((w) => w.selectedForRelease));
});

test("summary does not promote HOLD into authorization", () => {
  const summary = workstreamSummary();
  assert.equal(summary.total, 34);
  assert.equal(summary.productionAuthorized, 0);
  assert.ok(summary.selectedForRelease < summary.total);
});
