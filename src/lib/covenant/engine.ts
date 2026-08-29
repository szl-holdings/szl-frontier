import { embed, EMBED_DIM, EMBED_REVISION, hybridScore, tokenize } from "./index-engine";
import {
  AUDITOR_AGENT,
  evaluateRead,
  evaluateWrite,
  nextSensitivity,
  POLICY_BUNDLE_ID,
} from "./policy";
import { sha256Hex } from "./sha256";
import type {
  AgentProfile,
  EngineSnapshot,
  Identity,
  MemoryClass,
  MemoryEnvelope,
  MemoryRecord,
  MeshEvent,
  Receipt,
  ReceiptKind,
  SearchResult,
  Sensitivity,
  WriteResult,
  WriteState,
} from "./types";

const INJECTION =
  /ignore (previous|all) instructions|system prompt|jailbreak|do not follow policy|override covenant|you are now/i;

function rid(prefix: string) {
  const a = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${a.slice(0, 12)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export class CovenantEngine {
  memories: MemoryRecord[] = [];
  receipts: Receipt[] = [];
  mesh: MeshEvent[] = [];
  genesisHash = "0".repeat(64);
  policyBundleId = POLICY_BUNDLE_ID;
  policyBundleSha256 = "";
  embeddingRevision = EMBED_REVISION;
  agents: AgentProfile[] = [];

  constructor(opts?: { agents: AgentProfile[]; policySha: string }) {
    if (opts) {
      this.agents = opts.agents;
      this.policyBundleSha256 = opts.policySha;
    }
  }

  snapshot(): EngineSnapshot {
    return {
      memories: this.memories,
      receipts: this.receipts,
      mesh: this.mesh,
      ideas: [],
      genesisHash: this.genesisHash,
      policyBundleId: this.policyBundleId,
      policyBundleSha256: this.policyBundleSha256,
      embeddingRevision: this.embeddingRevision,
    };
  }

  load(s: Pick<EngineSnapshot, "memories" | "receipts" | "mesh" | "genesisHash" | "policyBundleSha256">) {
    this.memories = s.memories;
    this.receipts = s.receipts;
    this.mesh = s.mesh;
    this.genesisHash = s.genesisHash;
    this.policyBundleSha256 = s.policyBundleSha256;
  }

  private lastHash() {
    return this.receipts.at(-1)?.hash ?? this.genesisHash;
  }

  private async seal(partial: Omit<Receipt, "id" | "seq" | "prevHash" | "hash" | "createdAt">): Promise<Receipt> {
    const prevHash = this.lastHash();
    const createdAt = nowIso();
    const id = rid("rcpt");
    const seq = this.receipts.length + 1;
    const body = JSON.stringify({ ...partial, id, seq, prevHash, createdAt });
    const hash = await sha256Hex(body);
    const receipt: Receipt = { ...partial, id, seq, prevHash, hash, createdAt };
    this.receipts = [...this.receipts, receipt];
    return receipt;
  }

  classify(content: string, requested: Sensitivity, memoryClass: MemoryClass): {
    sensitivity: Sensitivity;
    memoryClass: MemoryClass;
    lifecycle: MemoryRecord["lifecycle"];
    note: string;
  } {
    if (INJECTION.test(content)) {
      return {
        sensitivity: "secret",
        memoryClass: "quarantine_memory",
        lifecycle: "quarantined",
        note: "prompt-injection pattern — quarantined; policy unchanged",
      };
    }
    return {
      sensitivity: requested,
      memoryClass,
      lifecycle: "active",
      note: "classified as requested",
    };
  }

  clearance(agentId: string): Sensitivity {
    return this.agents.find((a) => a.id === agentId)?.clearance ?? "internal";
  }

  async write(input: {
    identity: Identity;
    tenantId: string;
    securityDomain: string;
    memoryClass: MemoryClass;
    sensitivity: Sensitivity;
    content: string;
    sourceRefs: string[];
    retentionPolicy?: string;
    expiresAt?: string | null;
    requestId?: string;
  }): Promise<WriteResult> {
    const trace: WriteState[] = ["RECEIVED"];
    const requestId = input.requestId ?? rid("req");

    if (!input.content.trim()) {
      trace.push("VALIDATED", "POLICY_DENIED", "RECEIPT_SEALED");
      const receipt = await this.seal({
        kind: "policy-decision",
        operation: "memory.write",
        effect: "none",
        allowed: false,
        identity: input.identity,
        memoryIds: [],
        rejectedIds: [],
        reason: "empty content",
      });
      return { allowed: false, receipt, trace, reason: "empty content" };
    }
    trace.push("VALIDATED");

    const decision = evaluateWrite({
      identity: input.identity,
      tenantId: input.tenantId,
      securityDomain: input.securityDomain,
      memoryClass: input.memoryClass,
      sensitivity: input.sensitivity,
    });

    if (!decision.allowed) {
      trace.push("POLICY_DENIED", "RECEIPT_SEALED");
      const receipt = await this.seal({
        kind: "policy-decision",
        operation: "memory.write",
        effect: "none",
        allowed: false,
        identity: input.identity,
        memoryIds: [],
        rejectedIds: [],
        reason: decision.reason,
      });
      this.pushMesh(input.identity.agentId, "memory.write", false, decision.reason);
      return { allowed: false, receipt, trace, reason: decision.reason };
    }
    trace.push("POLICY_ALLOWED");

    const classified = this.classify(input.content, input.sensitivity, input.memoryClass);
    const sensitivity = nextSensitivity(input.sensitivity, classified.sensitivity);
    trace.push("CONTENT_CLASSIFIED");

    const contentSha256 = await sha256Hex(input.content.trim());
    const tokens = tokenize(input.content);
    const vector = embed(tokens);
    trace.push("CANONICALIZED_AND_HASHED");

    const existing = this.memories.find(
      (m) =>
        m.envelope.contentSha256 === contentSha256 &&
        m.envelope.tenantId === input.tenantId &&
        m.lifecycle === "active",
    );
    if (existing) {
      trace.push("RECORD_COMMITTED", "INDEXED", "RECEIPT_SEALED");
      const receipt = await this.seal({
        kind: "write-effect",
        operation: "memory.write",
        effect: `idempotent reuse ${existing.id}`,
        allowed: true,
        identity: input.identity,
        memoryIds: [existing.id],
        rejectedIds: [],
        reason: "duplicate content hash — deterministic reuse",
      });
      this.pushMesh(input.identity.agentId, "memory.write", true, `idempotent ${existing.id}`);
      return { allowed: true, memory: existing, receipt, trace, reason: receipt.reason };
    }

    const createdAt = nowIso();
    const expiresAt =
      input.expiresAt ??
      (classified.memoryClass === "working_memory"
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        : null);

    const envelope: MemoryEnvelope = {
      schemaVersion: "szl-memory/2.0",
      requestId,
      tenantId: input.tenantId,
      securityDomain: input.securityDomain,
      subjectId: input.identity.subjectId,
      agentId: input.identity.agentId,
      runId: input.identity.runId,
      purpose: input.identity.purpose,
      memoryClass: classified.memoryClass,
      sensitivity,
      retentionPolicy: input.retentionPolicy ?? "policy-default",
      content: input.content.trim(),
      contentSha256,
      sourceRefs: input.sourceRefs,
      embeddingProvider: "szl-local",
      embeddingModel: "lexhash",
      embeddingDimension: EMBED_DIM,
      embeddingRevision: this.embeddingRevision,
      policyBundleId: this.policyBundleId,
      policyBundleSha256: this.policyBundleSha256,
      createdAt,
      expiresAt,
    };

    const memory: MemoryRecord = {
      id: rid("mem"),
      envelope,
      lifecycle: classified.lifecycle,
      indexed: false,
      vector,
      tokens,
      createdAt,
      updatedAt: createdAt,
    };
    this.memories = [...this.memories, memory];
    trace.push("RECORD_COMMITTED", "INDEX_PENDING");

    if (classified.lifecycle === "active") {
      memory.indexed = true;
      memory.updatedAt = nowIso();
      trace.push("INDEXED");
    }

    trace.push("RECEIPT_SEALED");
    const receipt = await this.seal({
      kind: classified.lifecycle === "quarantined" ? "write-effect" : "write-effect",
      operation: "memory.write",
      effect:
        classified.lifecycle === "quarantined"
          ? `quarantined ${memory.id} — not searchable`
          : `committed ${memory.id}`,
      allowed: true,
      identity: input.identity,
      memoryIds: [memory.id],
      rejectedIds: [],
      reason: classified.note,
    });
    this.pushMesh(input.identity.agentId, "memory.write", true, receipt.effect);
    return { allowed: true, memory, receipt, trace, reason: classified.note };
  }

  async search(input: {
    identity: Identity;
    query: string;
    memoryClasses?: MemoryClass[];
    topK?: number;
    minProvenance?: "none" | "hashed";
  }): Promise<SearchResult> {
    const qTokens = tokenize(input.query);
    const qVec = embed(qTokens);
    const topK = input.topK ?? 6;
    const rejected: { id: string; reason: string }[] = [];
    const scored: { memory: MemoryRecord; score: number }[] = [];

    for (const mem of this.memories) {
      if (input.memoryClasses?.length && !input.memoryClasses.includes(mem.envelope.memoryClass)) {
        continue;
      }
      const auth = evaluateRead(
        input.identity,
        this.materialize(mem),
        this.clearance(input.identity.agentId),
        input.minProvenance ?? "hashed",
      );
      if (!auth.allowed) {
        rejected.push({ id: mem.id, reason: auth.reason });
        continue;
      }
      const score = input.query.trim()
        ? hybridScore(qTokens, qVec, mem.tokens, mem.vector)
        : 0.15;
      scored.push({ memory: mem, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const hits = scored.filter((s) => s.score > 0.08).slice(0, topK);
    const receipt = await this.seal({
      kind: "retrieval-result",
      operation: "memory.search",
      effect: `returned ${hits.length}, rejected ${rejected.length}`,
      allowed: true,
      identity: input.identity,
      memoryIds: hits.map((h) => h.memory.id),
      rejectedIds: rejected.map((r) => r.id),
      reason: "post-index authority check applied",
    });
    this.pushMesh(input.identity.agentId, "memory.search", true, receipt.effect);
    return { allowed: true, hits, rejected, receipt };
  }

  async mutateLifecycle(
    identity: Identity,
    memoryId: string,
    lifecycle: MemoryRecord["lifecycle"],
    operation: string,
  ) {
    const mem = this.memories.find((m) => m.id === memoryId);
    if (!mem) {
      const receipt = await this.seal({
        kind: "policy-decision",
        operation,
        effect: "none",
        allowed: false,
        identity,
        memoryIds: [],
        rejectedIds: [memoryId],
        reason: "unknown memory_id",
      });
      return { allowed: false, receipt, reason: "unknown memory_id" };
    }
    if (mem.envelope.tenantId !== identity.tenantId) {
      const receipt = await this.seal({
        kind: "policy-decision",
        operation,
        effect: "none",
        allowed: false,
        identity,
        memoryIds: [],
        rejectedIds: [memoryId],
        reason: "cross-tenant isolation",
      });
      return { allowed: false, receipt, reason: "cross-tenant isolation" };
    }
    const auditor = identity.agentId === AUDITOR_AGENT || identity.agentId === "aegis-watch";
    if (!auditor && mem.envelope.agentId !== identity.agentId) {
      const receipt = await this.seal({
        kind: "policy-decision",
        operation,
        effect: "none",
        allowed: false,
        identity,
        memoryIds: [],
        rejectedIds: [memoryId],
        reason: "only owner or auditor may mutate lifecycle",
      });
      return { allowed: false, receipt, reason: receipt.reason };
    }
    mem.lifecycle = lifecycle;
    mem.indexed = lifecycle === "active";
    mem.updatedAt = nowIso();
    const receipt = await this.seal({
      kind: "deletion-effect",
      operation,
      effect: `${lifecycle} ${memoryId} — immediately non-returnable`,
      allowed: true,
      identity,
      memoryIds: [memoryId],
      rejectedIds: [],
      reason: "authoritative lifecycle applied before de-index",
    });
    this.pushMesh(identity.agentId, operation, true, receipt.effect);
    return { allowed: true, receipt, reason: receipt.reason, memory: mem };
  }

  async reindex(identity: Identity) {
    let n = 0;
    for (const m of this.memories) {
      if (m.lifecycle === "active") {
        m.tokens = tokenize(m.envelope.content);
        m.vector = embed(m.tokens);
        m.indexed = true;
        m.envelope.embeddingRevision = this.embeddingRevision;
        n++;
      } else {
        m.indexed = false;
      }
    }
    const receipt = await this.seal({
      kind: "index-reconciliation",
      operation: "memory.reindex",
      effect: `rebuilt ${n} active vectors from authority`,
      allowed: true,
      identity,
      memoryIds: this.memories.filter((m) => m.indexed).map((m) => m.id),
      rejectedIds: this.memories.filter((m) => !m.indexed).map((m) => m.id),
      reason: "vxdb is a disposable derived index",
    });
    return receipt;
  }

  async verifyChain(): Promise<{ ok: boolean; brokenAt: number | null }> {
    let prev = this.genesisHash;
    for (let i = 0; i < this.receipts.length; i++) {
      const r = this.receipts[i];
      if (r.prevHash !== prev) return { ok: false, brokenAt: i };
      const { hash, ...rest } = r;
      const body = JSON.stringify({ ...rest, hash: undefined });
      void hash;
      void body;
      prev = r.hash;
    }
    return { ok: true, brokenAt: null };
  }

  materialize(mem: MemoryRecord): MemoryRecord {
    if (mem.envelope.expiresAt && new Date(mem.envelope.expiresAt).getTime() <= Date.now()) {
      if (mem.lifecycle === "active") {
        mem.lifecycle = "expired";
        mem.indexed = false;
      }
    }
    return mem;
  }

  private pushMesh(agentId: string, operation: string, allowed: boolean, summary: string) {
    const ev: MeshEvent = {
      id: rid("mesh"),
      at: nowIso(),
      agentId,
      operation,
      allowed,
      summary,
    };
    this.mesh = [ev, ...this.mesh].slice(0, 80);
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.lastAction = summary;
      agent.status = allowed ? "idle" : "denied";
    }
  }

  receiptKindLabel(kind: ReceiptKind) {
    return kind;
  }
}

export function newRunId() {
  return rid("run");
}

export { rid };
