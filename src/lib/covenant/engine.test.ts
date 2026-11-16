import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { CovenantEngine } from "./engine.ts";
import { GATE_SPECS, runGates } from "./gates.ts";
import { sha256Hex } from "./sha256.ts";
import { verifyReceiptChain } from "./verify-chain.ts";
import type { AgentProfile, Identity, Receipt } from "./types";

function identity(purpose: Identity["purpose"] = "evidence-write"): Identity {
  return {
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    subjectId: "test-subject",
    agentId: "test-writer",
    runId: "test-run",
    purpose,
  };
}

function writeInput(content = "Atomic receipt test evidence") {
  return {
    identity: identity(),
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    memoryClass: "evidence_memory" as const,
    sensitivity: "internal" as const,
    content,
    sourceRefs: ["test://original"],
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function pauseNextReceipt(t: TestContext) {
  const entered = deferred();
  const release = deferred();
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let paused = false;
  t.mock.method(crypto.subtle, "digest", (algorithm: AlgorithmIdentifier, data: BufferSource) => {
    if (!paused && new TextDecoder().decode(data).startsWith('{"kind":')) {
      paused = true;
      entered.resolve();
      return release.promise.then(() => digest(algorithm, data));
    }
    return digest(algorithm, data);
  });
  return { entered: entered.promise, release: release.resolve };
}

function rejectNextReceipt(t: TestContext) {
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let rejected = false;
  t.mock.method(crypto.subtle, "digest", (algorithm: AlgorithmIdentifier, data: BufferSource) => {
    if (!rejected && new TextDecoder().decode(data).startsWith('{"kind":')) {
      rejected = true;
      return Promise.reject(new Error("injected receipt digest failure"));
    }
    return digest(algorithm, data);
  });
}

test("concurrent denials have one contiguous, verifiable receipt chain", async () => {
  const engine = new CovenantEngine();
  const results = await Promise.all(Array.from({ length: 20 }, () => engine.write(writeInput(""))));
  assert.deepEqual(results.map((result) => result.receipt.seq), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(engine.memories.length, 0);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("concurrent duplicate writes commit one record and preserve receipt order", async () => {
  const engine = new CovenantEngine();
  const results = await Promise.all(Array.from({ length: 12 }, () => engine.write(writeInput())));
  assert.equal(new Set(results.map((result) => result.memory?.id)).size, 1);
  assert.equal(engine.memories.length, 1);
  assert.deepEqual(results.map((result) => result.receipt.seq), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal((await engine.verifyChain()).ok, true);
});

test("write, recall and verification observe earlier submitted operations", async () => {
  const engine = new CovenantEngine();
  const written = engine.write(writeInput());
  const searched = engine.search({ identity: identity("governed-recall"), query: "" });
  const verified = engine.verifyChain();
  const [write, search, check] = await Promise.all([written, searched, verified]);
  assert.deepEqual(search.hits.map((hit) => hit.memory.id), [write.memory!.id]);
  assert.equal(search.receipt.seq, 2);
  assert.equal(check.ok, true);
});

test("unsealed writes are invisible to snapshots and queued recall", async (t) => {
  const engine = new CovenantEngine();
  const pause = pauseNextReceipt(t);
  const pendingWrite = engine.write(writeInput());
  await pause.entered;
  const pendingSearch = engine.search({ identity: identity("governed-recall"), query: "" });
  try {
    assert.equal(engine.snapshot().memories.length, 0);
    assert.equal(engine.snapshot().receipts.length, 0);
  } finally {
    pause.release();
    await Promise.all([pendingWrite, pendingSearch]);
  }
  const [write, search] = await Promise.all([pendingWrite, pendingSearch]);
  assert.deepEqual(search.hits.map((hit) => hit.memory.id), [write.memory!.id]);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("recall and deletion serialize state together with their receipts", async (t) => {
  const engine = new CovenantEngine();
  const written = await engine.write(writeInput());
  const pause = pauseNextReceipt(t);
  const pendingSearch = engine.search({ identity: identity("governed-recall"), query: "" });
  await pause.entered;
  const pendingDelete = engine.mutateLifecycle(identity(), written.memory!.id, "tombstoned", "memory.delete");
  try {
    assert.equal(engine.memories[0].lifecycle, "active");
  } finally {
    pause.release();
    await Promise.all([pendingSearch, pendingDelete]);
  }
  const [search, deleted] = await Promise.all([pendingSearch, pendingDelete]);
  assert.equal(search.hits[0].memory.lifecycle, "active");
  assert.equal(search.receipt.seq, 2);
  assert.equal(deleted.receipt.seq, 3);
  assert.equal(engine.memories[0].lifecycle, "tombstoned");
  assert.equal((await engine.search({ identity: identity("governed-recall"), query: "" })).hits.length, 0);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("a rejected write seal rolls back its state and does not poison the queue", async (t) => {
  const engine = new CovenantEngine();
  const before = JSON.stringify(engine.snapshot());
  rejectNextReceipt(t);
  const failed = engine.write(writeInput("failed content"));
  const rejection = assert.rejects(failed, /injected receipt digest failure/);
  await rejection;
  assert.equal(JSON.stringify(engine.snapshot()), before);
  const recovered = await engine.write(writeInput("recovery content"));
  assert.equal(recovered.receipt.seq, 1);
  assert.equal(engine.memories.length, 1);
  assert.equal(engine.memories[0].envelope.content, "recovery content");
  assert.equal((await engine.verifyChain()).ok, true);
});

for (const operation of ["delete", "reindex", "expiry"] as const) {
  test(`a rejected ${operation} seal leaves committed state unchanged`, async (t) => {
    const engine = new CovenantEngine();
    const written = await engine.write({
      ...writeInput(),
      expiresAt: operation === "expiry" ? "2000-01-01T00:00:00.000Z" : null,
    });
    if (operation === "reindex") {
      engine.memories[0].indexed = false;
      engine.memories[0].tokens = [];
      engine.memories[0].vector = [];
      engine.memories[0].envelope.embeddingRevision = "obsolete";
    }
    const before = JSON.stringify(engine.snapshot());
    rejectNextReceipt(t);
    const pending = operation === "delete"
      ? engine.mutateLifecycle(identity(), written.memory!.id, "tombstoned", "memory.delete")
      : operation === "reindex"
        ? engine.reindex(identity())
        : engine.search({ identity: identity("governed-recall"), query: "" });
    await assert.rejects(pending, /injected receipt digest failure/);
    assert.equal(JSON.stringify(engine.snapshot()), before);
    assert.equal((await engine.verifyChain()).ok, true);
  });
}

test("write owns identity, content and provenance before its first await", async () => {
  const engine = new CovenantEngine();
  const input = writeInput();
  const originalContent = input.content;
  const pending = engine.write(input);
  input.identity.tenantId = "other-tenant";
  input.identity.agentId = "other-agent";
  input.tenantId = "other-tenant";
  input.content = "caller replaced the authorized content";
  input.sourceRefs[0] = "test://replaced";
  const result = await pending;
  assert.equal(result.allowed, true);
  assert.equal(result.memory!.envelope.tenantId, "szl-core");
  assert.equal(result.memory!.envelope.agentId, "test-writer");
  assert.equal(result.memory!.envelope.content, originalContent);
  assert.equal(result.memory!.envelope.contentSha256, await sha256Hex(originalContent));
  assert.deepEqual(result.memory!.envelope.sourceRefs, ["test://original"]);
  assert.equal(result.receipt.identity.tenantId, "szl-core");
  assert.equal((await engine.verifyChain()).ok, true);
});

test("queued recall owns its identity and filters at submission", async (t) => {
  const engine = new CovenantEngine();
  const pause = pauseNextReceipt(t);
  const pendingWrite = engine.write(writeInput());
  await pause.entered;
  const input = {
    identity: identity("governed-recall"),
    query: "",
    memoryClasses: ["evidence_memory" as const],
  };
  const pendingSearch = engine.search(input);
  input.identity.tenantId = "other-tenant";
  input.memoryClasses.length = 0;
  input.query = "unrelated replacement";
  pause.release();
  const [written, search] = await Promise.all([pendingWrite, pendingSearch]);
  assert.deepEqual(search.hits.map((hit) => hit.memory.id), [written.memory!.id]);
  assert.equal(search.receipt.identity.tenantId, "szl-core");
  assert.equal((await engine.verifyChain()).ok, true);
});

test("returned records and receipts cannot mutate committed authority", async () => {
  const engine = new CovenantEngine();
  const result = await engine.write(writeInput());
  const afterWrite = JSON.stringify(engine.snapshot());
  result.receipt.identity.agentId = "forged";
  result.receipt.memoryIds.push("forged");
  result.memory!.envelope.content = "forged";
  result.memory!.envelope.sourceRefs.push("test://forged");
  assert.equal(JSON.stringify(engine.snapshot()), afterWrite);

  const search = await engine.search({ identity: identity("governed-recall"), query: "" });
  const afterSearch = JSON.stringify(engine.snapshot());
  search.hits[0].memory.lifecycle = "tombstoned";
  search.receipt.rejectedIds.push("forged");
  assert.equal(JSON.stringify(engine.snapshot()), afterSearch);

  const changed = await engine.mutateLifecycle(identity(), engine.memories[0].id, "tombstoned", "memory.delete");
  const afterDelete = JSON.stringify(engine.snapshot());
  changed.memory!.lifecycle = "active";
  changed.receipt.allowed = false;
  assert.equal(JSON.stringify(engine.snapshot()), afterDelete);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("snapshots, loaded state and constructor profiles are owned copies", async () => {
  const agents: AgentProfile[] = [{
    id: "test-writer", name: "Test writer", mandate: "test",
    tenantId: "szl-core", securityDomain: "memory-plane",
    clearance: "internal", status: "idle", lastAction: "",
  }];
  const engine = new CovenantEngine({ agents, policySha: "a".repeat(64) });
  agents[0].clearance = "secret";
  assert.equal(engine.clearance("test-writer"), "internal");
  await engine.write(writeInput());
  const before = JSON.stringify(engine.snapshot());
  const exported = engine.snapshot();
  exported.memories[0].envelope.content = "snapshot edit";
  exported.receipts[0].identity.agentId = "snapshot edit";
  assert.equal(JSON.stringify(engine.snapshot()), before);

  const toLoad = engine.snapshot();
  const restored = new CovenantEngine();
  restored.load(toLoad);
  const restoredBefore = JSON.stringify(restored.snapshot());
  toLoad.memories[0].envelope.content = "load input edit";
  toLoad.receipts[0].reason = "load input edit";
  assert.equal(JSON.stringify(restored.snapshot()), restoredBefore);
  assert.equal((await restored.verifyChain()).ok, true);
});

test("load refuses to replace state while an operation is pending", async (t) => {
  const engine = new CovenantEngine();
  const initial = engine.snapshot();
  const pause = pauseNextReceipt(t);
  const pending = engine.write(writeInput());
  await pause.entered;
  try {
    assert.throws(() => engine.load(initial), /pending/i);
  } finally {
    pause.release();
    await pending;
  }
  assert.equal(engine.memories.length, 1);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("optional undefined fields retain the existing write and search defaults", async () => {
  const engine = new CovenantEngine();
  const written = await engine.write({
    ...writeInput(), retentionPolicy: undefined, expiresAt: undefined, requestId: undefined,
  });
  assert.equal(written.memory!.envelope.retentionPolicy, "policy-default");
  const search = await engine.search({
    identity: identity("governed-recall"), query: "",
    memoryClasses: undefined, topK: undefined, minProvenance: undefined,
  });
  assert.equal(search.hits.length, 1);
  assert.equal((await engine.verifyChain()).ok, true);
});

test("legacy producer receipts remain byte-compatible when loaded and extended", async () => {
  const partial: Omit<Receipt, "id" | "seq" | "prevHash" | "hash" | "createdAt"> = {
    kind: "policy-decision", operation: "legacy.fixture", effect: "none", allowed: false,
    identity: identity(), memoryIds: [], rejectedIds: [], reason: "historical denial",
  };
  const id = "legacy-1", seq = 1, prevHash = "0".repeat(64), createdAt = "2026-11-01T00:00:00Z";
  const hash = await sha256Hex(JSON.stringify({ ...partial, id, seq, prevHash, createdAt }));
  const legacy: Receipt = { ...partial, id, seq, prevHash, hash, createdAt };
  const engine = new CovenantEngine();
  engine.load({ memories: [], receipts: [legacy], mesh: [], genesisHash: prevHash, policyBundleSha256: "" });
  const next = await engine.write(writeInput(""));
  assert.equal(JSON.stringify(engine.receipts[0]), JSON.stringify(legacy));
  assert.equal(next.receipt.prevHash, hash);
  assert.equal(next.receipt.seq, 2);
  assert.equal((await verifyReceiptChain(engine.receipts, engine.genesisHash)).ok, true);
});

test("all existing governance gates still exercise their intended invariants", async () => {
  const results = await runGates();
  assert.deepEqual(results.map((result) => result.id), GATE_SPECS.map((gate) => gate.id));
  assert.deepEqual(results.filter((result) => !result.passed), []);
});

test("committing agent activity preserves concurrent dispatch status for other agents", async (t) => {
  const writer: AgentProfile = {
    id: "test-writer", name: "Test writer", mandate: "test",
    tenantId: "szl-core", securityDomain: "memory-plane",
    clearance: "internal", status: "idle", lastAction: "",
  };
  const engine = new CovenantEngine({
    agents: [writer, { ...writer, id: "other-agent" }], policySha: "",
  });
  await engine.write(writeInput());
  await engine.write(writeInput()); // Establish the identical idempotent activity summary.
  const pause = pauseNextReceipt(t);
  const pending = engine.write(writeInput());
  await pause.entered;
  engine.agents[0].status = "running";
  engine.agents[0].clearance = "secret";
  engine.agents[1].status = "running";
  pause.release();
  await pending;
  assert.equal(engine.agents[0].status, "idle");
  assert.equal(engine.agents[0].clearance, "secret");
  assert.equal(engine.agents[1].status, "running");
});
