import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(
  readFileSync(
    new URL("../frontier/handoffs/2026-09-14-tencent-auk-speech.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(receipt.schema, "szl.frontier.execution-handoffs.v1");
assert.equal(receipt.wave, "2026-09-14-tencent-auk-speech");
assert.equal(receipt.disposition, "HOLD");
assert.equal(receipt.productionAuthorization, false);
assert.equal(receipt.automaticPromotion, false);

assert.deepEqual(receipt.handoffs.evaluation, {
  repository: "szl-holdings/szl-forge",
  issue: 311,
  pullRequest: 313,
  responsibility: "task-separated source-bound evaluation and consent/provenance contract",
});
assert.deepEqual(receipt.handoffs.serving, {
  repository: "szl-holdings/szl-serve",
  issue: 10,
  responsibility: "exact-runtime task support, session failure handling and rollback",
});
assert.deepEqual(receipt.handoffs.hardware, {
  repository: "szl-holdings/szl-gpu-bridge",
  issue: 103,
  responsibility: "accelerator, memory, codec/runtime closure and bounded failure evidence",
});

assert.match(receipt.productGate, /a11oy and a-11-oy\.com remain unchanged/);
assert.match(receipt.proofGate, /measured non-sensitive receipts/);
assert.match(receipt.proofGate, /no raw reference audio/);

console.log("Tencent AuK execution handoff contract: PASS");
