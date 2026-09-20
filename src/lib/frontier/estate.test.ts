import assert from "node:assert/strict";
import test from "node:test";
import {
  displayCount,
  filterNamedItems,
  freshnessLabel,
  isHttpsUrl,
  paginate,
} from "./estate.ts";

test("UNKNOWN is not a measured zero", () => {
  assert.equal(displayCount(null), "UNKNOWN");
  assert.equal(displayCount(undefined), "UNKNOWN");
  assert.equal(displayCount(0), "0");
  assert.equal(displayCount(117), "117");
});

test("search matches repository ids only", () => {
  const rows = [{ id: "szl-holdings/szl-frontier" }, { id: "szl-holdings/szl-forge" }];
  assert.deepEqual(
    filterNamedItems(rows, "FRONTIER").map((r) => r.id),
    ["szl-holdings/szl-frontier"],
  );
  assert.equal(filterNamedItems(rows, "  ").length, 2);
});

test("paginate does not invent extra pages or wrap past the end", () => {
  const items = [1, 2, 3, 4, 5];
  const first = paginate(items, 0, 2);
  assert.deepEqual(first.slice, [1, 2]);
  assert.equal(first.pages, 3);
  const overflow = paginate(items, 99, 2);
  assert.deepEqual(overflow.slice, [5]);
  assert.equal(overflow.page, 2);
  assert.equal(paginate([], 0, 12).pages, 1);
});

test("only https evidence URLs are treated as links", () => {
  assert.equal(isHttpsUrl("https://github.com/szl-holdings/szl-frontier/issues/134"), true);
  assert.equal(isHttpsUrl("http://github.com/szl-holdings/szl-frontier"), false);
  assert.equal(isHttpsUrl("javascript:alert(1)"), false);
  assert.equal(isHttpsUrl("Intake lead only."), false);
});

test("freshness does not refresh historical timestamps", () => {
  assert.equal(
    freshnessLabel("2026-09-17T10:01:00Z", new Date("2026-09-20T11:00:00Z")),
    "HISTORICAL_REQUIRES_REOBSERVATION",
  );
  assert.equal(
    freshnessLabel("2026-09-20T10:50:00Z", new Date("2026-09-20T11:00:00Z")),
    "RECORDED_NOT_LIVE",
  );
});
