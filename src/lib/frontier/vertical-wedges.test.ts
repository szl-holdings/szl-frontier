import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REQUIRED_VERTICAL_WEDGES, VerticalWedgeError, readVerticalWedges } from "./vertical-wedges.ts";

const REGISTER_URL = new URL("../../../public/frontier/competitive-research-register.v1.json", import.meta.url);

function register(): Record<string, unknown> {
  return JSON.parse(readFileSync(REGISTER_URL, "utf8")) as Record<string, unknown>;
}

test("checked-in vertical wedges stay HOLD with comparison NOT_RUN", () => {
  const wedges = readVerticalWedges(readFileSync(REGISTER_URL, "utf8"));
  assert.deepEqual(
    wedges.map((wedge) => wedge.id),
    [...REQUIRED_VERTICAL_WEDGES],
  );
  assert.equal(wedges.length, 17);
  assert.ok(wedges.every((wedge) => wedge.status === "HOLD" && wedge.comparison === "NOT_RUN"));
  assert.ok(wedges.every((wedge) => wedge.incumbent.length > 0 && wedge.refused.length > 0));
});

test("a vertical wedge cannot leave HOLD or claim superiority", () => {
  const payload = register();
  const entries = payload.entries as Array<Record<string, unknown>>;
  const target = entries.find((entry) => entry.id === "vertical-a11oy-langgraph");
  assert.ok(target);
  target.status = "ADAPTED_PATTERN";
  assert.throws(() => readVerticalWedges(JSON.stringify(payload)), VerticalWedgeError);

  const again = register();
  const claim = (again.entries as Array<Record<string, unknown>>).find(
    (entry) => entry.id === "vertical-a11oy-langgraph",
  );
  assert.ok(claim);
  claim.claim = "This row beats the incumbent";
  assert.throws(() => readVerticalWedges(JSON.stringify(again)), VerticalWedgeError);
});
