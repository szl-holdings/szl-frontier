import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(
  readFileSync(
    new URL("../frontier/handoffs/2026-09-14-deepseek-v4-1-flash.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(receipt.schema, "szl.frontier.execution-handoffs.v1");
assert.equal(receipt.wave, "2026-09-14-deepseek-v4-1-flash");
assert.equal(receipt.disposition, "HOLD");
assert.equal(receipt.productionAuthorization, false);
assert.equal(receipt.automaticPromotion, false);

assert.deepEqual(receipt.handoffs.evaluation, {
  repository: "szl-holdings/szl-forge",
  issue: 310,
  pullRequest: 312,
  responsibility: "exact-source qualification, protocol evidence and bounded model/runtime observations",
});
assert.deepEqual(receipt.handoffs.serving, {
  repository: "szl-holdings/szl-serve",
  issue: 9,
  responsibility: "prompt/protocol compatibility, exact-engine support states, failure handling and rollback",
});
assert.deepEqual(receipt.handoffs.hardware, {
  repository: "szl-holdings/szl-gpu-bridge",
  issue: 102,
  responsibility: "accelerator identity, checkpoint feasibility, memory/KV measurements and bounded context closure",
});

assert.match(receipt.productGate, /a11oy and a-11-oy\.com remain unchanged/);
assert.match(receipt.proofGate, /exact-source measured receipts/);
assert.match(receipt.proofGate, /upstream-only 1M-context, KV or quality claims are not proof/);

console.log("DeepSeek V4.1 execution handoff contract: PASS");
