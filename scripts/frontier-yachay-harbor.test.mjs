import assert from "node:assert/strict";
import { evaluateHarborBatch } from "../src/lib/harbor/evaluate.ts";

const batch = evaluateHarborBatch();
assert.equal(batch.length, 3);
const hold = batch.find((v) => v.sourceId === "harbor-estate-covenant");
const fail = batch.find((v) => v.sourceId === "harbor-private-uncred");
const deny = batch.find((v) => v.sourceId === "harbor-foreign");
assert.equal(hold?.disposition, "EVALUATION");
assert.equal(hold?.promotion, "NONE");
assert.equal(hold?.allowed, true);
assert.equal(fail?.disposition, "FAIL_CLOSED");
assert.equal(fail?.allowed, false);
assert.equal(deny?.disposition, "DENIED");
assert.equal(deny?.allowed, false);
assert.ok(!batch.some((v) => v.promotion !== "NONE"));
console.log("harbor batch HOLD/FAIL_CLOSED/DENIED pinned");
