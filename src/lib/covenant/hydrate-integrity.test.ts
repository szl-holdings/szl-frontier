import assert from "node:assert/strict";
import test from "node:test";
import { CovenantEngine } from "./engine.ts";
import { verifyHydratedPlane } from "./hydrate-integrity.ts";

const genesis = "0".repeat(64);
const identity = {
  tenantId: "szl-core", securityDomain: "memory-plane",
  subjectId: "fixture", agentId: "fixture",
  runId: "fixture", purpose: "evidence-write" as const,
};

async function fixture() {
  const engine = new CovenantEngine();
  const write = await engine.write({
    identity, tenantId: "szl-core", securityDomain: "memory-plane",
    memoryClass: "evidence_memory", sensitivity: "internal",
    content: "Persisted content integrity witness",
    sourceRefs: ["fixture://source"],
  });
  assert.equal(write.allowed, true);
  return engine.snapshot();
}

test("legitimate persisted content and chain are readable", async () => {
  const plane = await fixture();
  const result = await verifyHydratedPlane(plane.memories, plane.receipts, genesis);
  assert.deepEqual(result, { ok: true, state: "LOCAL_CHAIN_VERIFIED", count: 1 });
});

test("altered persisted memory content blocks restoration", async () => {
  const plane = await fixture();
  plane.memories[0].envelope.content = "forged persisted content";
  const result = await verifyHydratedPlane(plane.memories, plane.receipts, genesis);
  assert.deepEqual(result, {
    ok: false, state: "BLOCKED", reason: "MEMORY_CONTENT_HASH_MISMATCH",
  });
});

test("tampered receipt body blocks restoration", async () => {
  const plane = await fixture();
  plane.receipts[0].reason = "forged receipt reason";
  const result = await verifyHydratedPlane(plane.memories, plane.receipts, genesis);
  assert.deepEqual(result, {
    ok: false, state: "BLOCKED", reason: "BODY_HASH_MISMATCH",
  });
});

test("missing receipt chain with populated memory blocks restoration", async () => {
  const plane = await fixture();
  const result = await verifyHydratedPlane(plane.memories, [], genesis);
  assert.deepEqual(result, {
    ok: false, state: "BLOCKED", reason: "MISSING_RECEIPT_CHAIN",
  });
});

test("duplicate memory IDs cannot be accepted", async () => {
  const plane = await fixture();
  plane.memories.push(structuredClone(plane.memories[0]));
  assert.equal(
    (await verifyHydratedPlane(plane.memories, plane.receipts, genesis)).state,
    "BLOCKED",
  );
});

test("invalid persisted shape and genesis never produce a green result", async () => {
  const plane = await fixture();
  assert.equal((await verifyHydratedPlane(plane.memories, plane.receipts, "forged")).state, "BLOCKED");
  assert.equal((await verifyHydratedPlane(null as never, plane.receipts, genesis)).state, "BLOCKED");
});

test("denial-only receipt sequence requires no memory records", async () => {
  const engine = new CovenantEngine();
  const result = await engine.write({
    identity, tenantId: "szl-core", securityDomain: "memory-plane",
    memoryClass: "evidence_memory", sensitivity: "internal",
    content: "", sourceRefs: ["fixture://source"],
  });
  assert.equal(result.allowed, false);
  const check = await verifyHydratedPlane([], engine.receipts, genesis);
  assert.equal(check.ok, true);
});

test("memory with no allowed creation receipt is blocked", async () => {
  const plane = await fixture();
  plane.memories[0].id = "ghost-memory-id";
  const check = await verifyHydratedPlane(plane.memories, plane.receipts, genesis);
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.reason, "UNRECEIPTED_OR_REACTIVATED_MEMORY");
});

test("a tombstoned memory cannot be reactivated by persisted state editing", async () => {
  const engine = new CovenantEngine();
  const record = await engine.write({
    identity, tenantId: "szl-core", securityDomain: "memory-plane",
    memoryClass: "evidence_memory", sensitivity: "internal",
    content: "Bound lifecycle fixture", sourceRefs: ["fixture://source"],
  });
  assert.equal(record.allowed, true);
  const deleted = await engine.mutateLifecycle(identity, record.memory!.id, "tombstoned", "memory.delete");
  assert.equal(deleted.allowed, true);
  const plane = engine.snapshot();
  assert.equal((await verifyHydratedPlane(plane.memories, plane.receipts, genesis)).ok, true);
  plane.memories[0].lifecycle = "active";
  const check = await verifyHydratedPlane(plane.memories, plane.receipts, genesis);
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.reason, "UNRECEIPTED_OR_REACTIVATED_MEMORY");
});
