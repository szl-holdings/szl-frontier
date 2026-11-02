import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "../frontier/receipt-envelope.ts";
import { verifyReceiptChain } from "./verify-chain.ts";
import type { Receipt } from "./types";

const genesis = "0".repeat(64);
async function fixture(): Promise<Receipt[]> {
  const out: Receipt[] = [];
  for (let seq = 1; seq <= 2; seq++) {
    const partial: Omit<Receipt, "id" | "seq" | "prevHash" | "hash" | "createdAt"> = { kind: "policy-decision", operation: "fixture", effect: "deny", allowed: false,
      identity: { agentId: "synthetic", tenantId: "synthetic", purpose: "evidence-write",
        securityDomain: "synthetic", subjectId: "synthetic", runId: "test" },
      memoryIds: [], rejectedIds: [], reason: "synthetic" };
    const id = `test-${seq}`, prevHash = out.at(-1)?.hash ?? genesis, createdAt = "2026-11-01T00:00:00Z";
    const hash = await sha256Hex(JSON.stringify({ ...partial, id, seq, prevHash, createdAt }));
    out.push({ ...partial, id, seq, prevHash, hash, createdAt });
  }
  return out;
}
test("recomputes the existing producer body format", async () => {
  assert.equal((await verifyReceiptChain(await fixture(), genesis)).ok, true);
});
test("body tampering fails even when every prevHash still links", async () => {
  const rows = await fixture(); rows[0].allowed = true;
  assert.equal((await verifyReceiptChain(rows, genesis)).reason, "BODY_HASH_MISMATCH");
});
test("linkage, sequence and digest substitution fail", async () => {
  for (const change of [(r: Receipt[]) => r.reverse(), (r: Receipt[]) => r[1].seq = 4,
    (r: Receipt[]) => r[0].hash = "f".repeat(64)]) {
    const rows = await fixture(); change(rows);
    assert.equal((await verifyReceiptChain(rows, genesis)).ok, false);
  }
});
test("empty and lossy inputs do not verify", async () => {
  assert.equal((await verifyReceiptChain([], genesis)).reason, "EMPTY_CHAIN");
  const rows = await fixture(); Object.assign(rows[0], { hidden: undefined });
  assert.equal((await verifyReceiptChain(rows, genesis)).reason, "INVALID_RECEIPT");
});
