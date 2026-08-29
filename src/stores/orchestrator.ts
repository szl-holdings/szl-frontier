import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CovenantEngine, newRunId, rid } from "@/lib/covenant/engine";
import { runGates } from "@/lib/covenant/gates";
import { AGENTS, PROJECTS, SEED_MEMORIES, TENANTS } from "@/lib/covenant/seed";
import { sha256Hex } from "@/lib/covenant/sha256";
import type {
  ActionKind,
  ActionRequest,
  AdversaryRun,
  AgentProfile,
  BrainTrace,
  FrontierIdea,
  GateResult,
  Identity,
  IngestJob,
  IntelTasking,
  MemoryClass,
  MemoryRecord,
  ModelRoute,
  OutcomeNode,
  Purpose,
  Receipt,
  SearchResult,
  Sensitivity,
  WriteResult,
  WriteState,
} from "@/lib/covenant/types";
import { generateFrontierPayload } from "@/lib/frontier/kernel";
import { INGEST_CATALOG } from "@/lib/ingest/catalog";
import { evaluateIntelAction } from "@/lib/intel/feed";
import { INTEL_FEED } from "@/lib/intel/feed";
import { MODELS, routeModel } from "@/lib/models/registry";
import { EMBED_REVISION } from "@/lib/covenant/index-engine";
import { ACTIONS, evaluateAction } from "@/lib/actions/adapter";
import { runScenario as execScenario, SCENARIOS } from "@/lib/adversary/campaign";
import { CURRICULUM, fetchPublicCorpus, SecondBrainIndex } from "@/lib/brain";

export type Session = Omit<Identity, "runId">;

interface OrchestratorState {
  ready: boolean;
  session: Session;
  agents: AgentProfile[];
  memories: MemoryRecord[];
  receipts: Receipt[];
  mesh: import("@/lib/covenant/types").MeshEvent[];
  ideas: FrontierIdea[];
  lastGates: GateResult[] | null;
  gatesRunning: boolean;
  lastWriteTrace: WriteState[] | null;
  lastSearch: SearchResult | null;
  ingestJobs: IngestJob[];
  modelRoutes: ModelRoute[];
  taskings: IntelTasking[];
  outcomes: OutcomeNode[];
  actions: ActionRequest[];
  adversaryRuns: AdversaryRun[];
  brainReady: boolean;
  brainAlive: boolean;
  brainError: string | null;
  brainCorpusN: number;
  brainTraces: BrainTrace[];
  brainCitations: Record<string, number>;
  lastBrainPlan: { query: string; decision: "NAVIGATE" | "ABSTAIN"; reason: string; handles: { nodeId: string; note: string }[] } | null;
  genesisHash: string;
  policyBundleSha256: string;
  hydrate: () => Promise<void>;
  setSession: (patch: Partial<Session>) => void;
  writeMemory: (input: {
    content: string;
    memoryClass: MemoryClass;
    sensitivity: Sensitivity;
    sourceRefs: string[];
    tenantId?: string;
  }) => Promise<WriteResult>;
  searchMemory: (query: string, memoryClasses?: MemoryClass[]) => Promise<SearchResult>;
  tombstone: (id: string) => Promise<void>;
  quarantine: (id: string) => Promise<void>;
  expire: (id: string) => Promise<void>;
  dispatchAgent: (agentId: string, op: "write" | "search" | "probe") => Promise<string>;
  generateIdeas: () => void;
  setIdeaExpansion: (id: string, expansion: string) => void;
  runReleaseGates: () => Promise<GateResult[]>;
  resetPlane: () => Promise<void>;
  ingestSource: (input: { title: string; sourceUri: string; excerpt: string }) => Promise<IngestJob>;
  routeTask: (
    task: ModelRoute["task"],
    requestedModel: string,
  ) => Promise<ModelRoute>;
  requestTasking: (observationId: string) => IntelTasking;
  decideTasking: (id: string, approved: boolean) => Promise<IntelTasking>;
  requestAction: (kind: ActionKind) => ActionRequest;
  decideAction: (id: string, approved: boolean) => Promise<ActionRequest>;
  fireScenario: (scenarioId: string) => Promise<AdversaryRun>;
  fireCampaign: () => Promise<AdversaryRun[]>;
  bootBrain: () => Promise<void>;
  setBrainAlive: (on: boolean) => void;
  askBrain: (query: string, seal?: boolean) => Promise<BrainTrace>;
  pulseBrain: () => Promise<BrainTrace | null>;
}

let engine: CovenantEngine | null = null;
let hydrating: Promise<void> | null = null;
let brain: SecondBrainIndex | null = null;
let pulseCursor = 0;

function identity(session: Session): Identity {
  return { ...session, runId: newRunId() };
}

function pull(set: (p: Partial<OrchestratorState>) => void) {
  if (!engine) return;
  set({
    memories: engine.memories.map((m) => ({ ...m, envelope: { ...m.envelope } })),
    receipts: [...engine.receipts],
    mesh: [...engine.mesh],
    agents: engine.agents.map((a) => ({ ...a })),
    genesisHash: engine.genesisHash,
    policyBundleSha256: engine.policyBundleSha256,
  });
}

async function seedEngine(e: CovenantEngine, session: Session) {
  const writer = identity({
    ...session,
    tenantId: "szl-core",
    securityDomain: "memory-plane",
    agentId: "covenant-auditor",
    purpose: "policy-review",
  });
  for (const row of SEED_MEMORIES) {
    const idn: Identity = {
      tenantId: row.tenantId,
      securityDomain: row.securityDomain,
      subjectId: "seed",
      agentId: row.agentId,
      runId: "seed-run",
      purpose: row.memoryClass === "policy_memory" ? "policy-review" : "evidence-write",
    };
    await e.write({
      identity: row.agentId === "covenant-auditor" ? { ...writer, ...idn, purpose: "policy-review" } : idn,
      tenantId: row.tenantId,
      securityDomain: row.securityDomain,
      memoryClass: row.memoryClass,
      sensitivity: row.sensitivity,
      content: row.content,
      sourceRefs: row.sourceRefs,
    });
  }
  const ideas = generateFrontierPayload(PROJECTS).ideas;
  return ideas;
}

export const useOrchestrator = create<OrchestratorState>()(
  persist(
    (set, get) => ({
      ready: false,
      session: {
        tenantId: "szl-core",
        securityDomain: "memory-plane",
        subjectId: "operator.szl",
        agentId: "alloy-planner",
        purpose: "evidence-write",
      },
      agents: AGENTS.map((a) => ({ ...a })),
      memories: [],
      receipts: [],
      mesh: [],
      ideas: [],
      lastGates: null,
      gatesRunning: false,
      lastWriteTrace: null,
      lastSearch: null,
      ingestJobs: [],
      modelRoutes: [],
      taskings: [],
      outcomes: [],
      actions: [],
      adversaryRuns: [],
      brainReady: false,
      brainAlive: true,
      brainError: null,
      brainCorpusN: 0,
      brainTraces: [],
      brainCitations: {},
      lastBrainPlan: null,
      genesisHash: "0".repeat(64),
      policyBundleSha256: "",

      hydrate: async () => {
        if (engine) {
          set({ ready: true });
          void get().bootBrain();
          return;
        }
        if (hydrating) {
          await hydrating;
          return;
        }
        hydrating = (async () => {
        const policySha = await sha256Hex("covenant-v0.1:deny-by-default");
        const genesis = await sha256Hex("szl-frontier-orchestrator:genesis");
        engine = new CovenantEngine({
          agents: AGENTS.map((a) => ({ ...a })),
          policySha,
        });
        engine.genesisHash = genesis;
        engine.policyBundleSha256 = policySha;
        const { memories, receipts, ideas } = get();
        if (memories.length > 0 && receipts.length > 0) {
          engine.load({
            memories,
            receipts,
            mesh: get().mesh,
            genesisHash: get().genesisHash || genesis,
            policyBundleSha256: policySha,
          });
          set({ ready: true, policyBundleSha256: policySha });
          return;
        }
        const seededIdeas = await seedEngine(engine, get().session);
        pull(set);
        set({ ready: true, ideas: ideas.length ? ideas : seededIdeas, policyBundleSha256: policySha });
        })();
        try {
          await hydrating;
        } finally {
          hydrating = null;
        }
        void get().bootBrain();
      },

      setSession: (patch) => {
        const session = { ...get().session, ...patch };
        if (patch.agentId) {
          const agent = AGENTS.find((a) => a.id === patch.agentId);
          if (agent) {
            session.tenantId = agent.tenantId;
            session.securityDomain = agent.securityDomain;
          }
        } else if (patch.tenantId) {
          const agent = AGENTS.find((a) => a.tenantId === patch.tenantId);
          if (agent) {
            session.agentId = agent.id;
            session.securityDomain = agent.securityDomain;
          }
        }
        set({ session });
      },

      writeMemory: async (input) => {
        if (!engine) await get().hydrate();
        const result = await engine!.write({
          identity: identity(get().session),
          tenantId: input.tenantId ?? get().session.tenantId,
          securityDomain: get().session.securityDomain,
          memoryClass: input.memoryClass,
          sensitivity: input.sensitivity,
          content: input.content,
          sourceRefs: input.sourceRefs.filter(Boolean),
        });
        pull(set);
        set({ lastWriteTrace: result.trace });
        return result;
      },

      searchMemory: async (query, memoryClasses) => {
        if (!engine) await get().hydrate();
        const result = await engine!.search({
          identity: identity({ ...get().session, purpose: "governed-recall" }),
          query,
          memoryClasses,
        });
        pull(set);
        set({ lastSearch: result });
        return result;
      },

      tombstone: async (id) => {
        if (!engine) return;
        await engine.mutateLifecycle(identity(get().session), id, "tombstoned", "memory.delete");
        pull(set);
      },
      quarantine: async (id) => {
        if (!engine) return;
        await engine.mutateLifecycle(identity(get().session), id, "quarantined", "memory.quarantine");
        pull(set);
      },
      expire: async (id) => {
        if (!engine) return;
        await engine.mutateLifecycle(identity(get().session), id, "expired", "memory.expire");
        pull(set);
      },

      dispatchAgent: async (agentId, op) => {
        if (!engine) await get().hydrate();
        const agent = AGENTS.find((a) => a.id === agentId);
        if (!agent || !engine) return "unknown agent";
        const prev = get().session;
        const session: Session = {
          tenantId: agent.tenantId,
          securityDomain: agent.securityDomain,
          subjectId: `dispatch.${agentId}`,
          agentId,
          purpose: op === "write" ? "mesh-dispatch" : op === "probe" ? "adversarial-test" : "governed-recall",
        };
        engine.agents = engine.agents.map((a) =>
          a.id === agentId ? { ...a, status: "running" } : a,
        );
        pull(set);
        await new Promise((r) => setTimeout(r, 280));
        let summary = "";
        if (op === "write") {
          const res = await engine.write({
            identity: identity(session),
            tenantId: agent.tenantId,
            securityDomain: agent.securityDomain,
            memoryClass: "working_memory",
            sensitivity: "internal",
            content: `${agent.name} mesh dispatch at ${new Date().toISOString()}: heartbeat against ${agent.mandate}`,
            sourceRefs: [`mesh://${agentId}`],
          });
          summary = res.reason;
        } else if (op === "search") {
          const res = await engine.search({
            identity: identity(session),
            query: "covenant vxdb memory isolation provenance",
          });
          summary = `recall ${res.hits.length} · rejected ${res.rejected.length}`;
        } else {
          const res = await engine.write({
            identity: identity(session),
            tenantId: "szl-core",
            securityDomain: "memory-plane",
            memoryClass: "evidence_memory",
            sensitivity: "secret",
            content: "probe: attempt to write into szl-core from foreign principal",
            sourceRefs: ["mesh://probe"],
          });
          summary = res.allowed ? "unexpected allow" : `denied: ${res.reason}`;
        }
        engine.agents = engine.agents.map((a) =>
          a.id === agentId ? { ...a, status: "idle", lastAction: summary } : a,
        );
        pull(set);
        set({ session: prev });
        return summary;
      },

      generateIdeas: () => {
        const payload = generateFrontierPayload(PROJECTS);
        const existing = new Set(get().ideas.map((i) => i.id));
        const merged = [
          ...get().ideas,
          ...payload.ideas.filter((i) => !existing.has(i.id)).map((i) => ({
            ...i,
            id: `${i.id}-${Date.now().toString(36)}`,
          })),
        ];
        set({ ideas: merged.length ? merged : payload.ideas });
      },

      setIdeaExpansion: (id, expansion) => {
        set({
          ideas: get().ideas.map((i) => (i.id === id ? { ...i, expansion } : i)),
        });
      },

      runReleaseGates: async () => {
        set({ gatesRunning: true });
        const results = await runGates();
        set({ lastGates: results, gatesRunning: false });
        return results;
      },

      resetPlane: async () => {
        const policySha = await sha256Hex("covenant-v0.1:deny-by-default");
        const genesis = await sha256Hex("szl-frontier-orchestrator:genesis");
        engine = new CovenantEngine({
          agents: AGENTS.map((a) => ({ ...a })),
          policySha,
        });
        engine.genesisHash = genesis;
        engine.policyBundleSha256 = policySha;
        const ideas = await seedEngine(engine, get().session);
        pull(set);
        set({
          ideas,
          lastGates: null,
          lastSearch: null,
          lastWriteTrace: null,
          ingestJobs: [],
          modelRoutes: [],
          taskings: [],
          outcomes: [],
          actions: [],
          adversaryRuns: [],
          brainTraces: [],
          brainCitations: {},
          lastBrainPlan: null,
          ready: true,
        });
      },

      ingestSource: async (input) => {
        if (!engine) await get().hydrate();
        const createdAt = new Date().toISOString();
        const ident = identity({ ...get().session, purpose: "ingest" });
        const res = await engine!.write({
          identity: ident,
          tenantId: ident.tenantId,
          securityDomain: ident.securityDomain,
          memoryClass: "evidence_memory",
          sensitivity: "confidential",
          content: `${input.title}\n\n${input.excerpt}`,
          sourceRefs: [input.sourceUri],
        });
        pull(set);
        const status: IngestJob["status"] =
          res.memory?.lifecycle === "quarantined"
            ? "quarantined"
            : res.allowed
              ? "committed"
              : "denied";
        const job: IngestJob = {
          id: rid("ing"),
          title: input.title,
          sourceUri: input.sourceUri,
          excerpt: input.excerpt,
          status,
          memoryId: res.memory?.id,
          receiptId: res.receipt.id,
          reason: res.reason,
          createdAt,
        };
        const outcomes = res.allowed && status === "committed"
          ? [
              {
                id: rid("out"),
                title: `Ingested ${input.title}`,
                status: "reconciled" as const,
                linkedMemoryIds: res.memory ? [res.memory.id] : [],
                note: res.reason,
                at: createdAt,
              },
              ...get().outcomes,
            ]
          : get().outcomes;
        set({ ingestJobs: [job, ...get().ingestJobs], outcomes, lastWriteTrace: res.trace });
        return job;
      },

      routeTask: async (task, requestedModel) => {
        const decision = routeModel({
          task,
          requestedModel,
          embedRevision: EMBED_REVISION,
        });
        const rec: ModelRoute = {
          id: rid("rte"),
          at: new Date().toISOString(),
          task,
          requestedModel,
          selectedModel: decision.selected?.id ?? requestedModel,
          allowed: decision.allowed,
          reason: decision.reason,
        };
        if (decision.allowed && (task === "evaluate" || task === "classify") && engine) {
          const ident = identity({ ...get().session, purpose: "evaluation" });
          await engine.write({
            identity: ident,
            tenantId: ident.tenantId,
            securityDomain: ident.securityDomain,
            memoryClass: "decision_memory",
            sensitivity: "internal",
            content: `Model route ${task} → ${rec.selectedModel}. ${decision.reason}`,
            sourceRefs: [`model://${rec.selectedModel}`],
          });
          pull(set);
        }
        set({ modelRoutes: [rec, ...get().modelRoutes].slice(0, 40) });
        return rec;
      },

      requestTasking: (observationId) => {
        const obs = INTEL_FEED.find((o) => o.id === observationId);
        const t: IntelTasking = {
          id: rid("tsk"),
          observationId,
          requestedBy: get().session.agentId,
          status: "pending",
          reason: obs ? `Request ingest of ${obs.title}` : "unknown observation",
          createdAt: new Date().toISOString(),
        };
        set({ taskings: [t, ...get().taskings] });
        return t;
      },

      decideTasking: async (id, approved) => {
        const current = get().taskings.find((t) => t.id === id);
        if (!current) {
          return {
            id,
            observationId: "",
            requestedBy: get().session.agentId,
            status: "denied",
            reason: "unknown tasking",
            createdAt: new Date().toISOString(),
          };
        }
        if (!approved) {
          const denied: IntelTasking = { ...current, status: "denied", reason: "operator denied" };
          set({ taskings: get().taskings.map((t) => (t.id === id ? denied : t)) });
          return denied;
        }
        const gate = evaluateIntelAction({
          action: "ingest",
          purpose: "ingest",
          tasking: { status: "approved" },
        });
        const obs = INTEL_FEED.find((o) => o.id === current.observationId);
        if (!gate.allowed || !obs || !engine) {
          const blocked: IntelTasking = { ...current, status: "denied", reason: gate.reason };
          set({ taskings: get().taskings.map((t) => (t.id === id ? blocked : t)) });
          return blocked;
        }
        const ident = identity({
          tenantId: "szl-research",
          securityDomain: "research",
          subjectId: get().session.subjectId,
          agentId: "lyte-ops",
          purpose: "ingest",
        });
        const res = await engine.write({
          identity: ident,
          tenantId: "szl-research",
          securityDomain: "research",
          memoryClass: "evidence_memory",
          sensitivity: "confidential",
          content: `${obs.title} (${obs.region}). ${obs.summary}`,
          sourceRefs: [obs.source, `tasking://${id}`],
        });
        pull(set);
        const next: IntelTasking = {
          ...current,
          status: res.allowed ? "ingested" : "denied",
          reason: res.reason,
          memoryId: res.memory?.id,
        };
        set({ taskings: get().taskings.map((t) => (t.id === id ? next : t)) });
        return next;
      },

      requestAction: (kind) => {
        const def = ACTIONS.find((a) => a.id === kind);
        const rec: ActionRequest = {
          id: rid("act"),
          kind,
          requestedBy: get().session.agentId,
          status: "pending",
          reason: def ? `Request ${def.name}` : "unknown action",
          hard: def?.class === "hard-deny",
          createdAt: new Date().toISOString(),
        };
        set({ actions: [rec, ...get().actions] });
        return rec;
      },

      decideAction: async (id, approved) => {
        if (!engine) await get().hydrate();
        const current = get().actions.find((a) => a.id === id);
        if (!current) {
          return {
            id,
            kind: "weaponize",
            requestedBy: get().session.agentId,
            status: "denied",
            reason: "unknown action",
            hard: true,
            createdAt: new Date().toISOString(),
          };
        }
        if (!approved) {
          const denied: ActionRequest = { ...current, status: "denied", reason: "operator denied" };
          set({ actions: get().actions.map((a) => (a.id === id ? denied : a)) });
          return denied;
        }
        const gate = evaluateAction({
          kind: current.kind,
          purpose: "action-execute",
          approval: "approved",
        });
        if (!gate.allowed) {
          const denied: ActionRequest = {
            ...current,
            status: "denied",
            reason: gate.reason,
            hard: gate.hard,
          };
          set({ actions: get().actions.map((a) => (a.id === id ? denied : a)) });
          return denied;
        }
        let memoryId: string | undefined;
        let reason = gate.reason;
        if (current.kind === "collect-observation") {
          const ident = identity({
            tenantId: "szl-research",
            securityDomain: "research",
            subjectId: get().session.subjectId,
            agentId: "lyte-ops",
            purpose: "action-execute",
          });
          const res = await engine!.write({
            identity: ident,
            tenantId: "szl-research",
            securityDomain: "research",
            memoryClass: "evidence_memory",
            sensitivity: "internal",
            content: "Bounded collect: simulated public observation admitted as evidence.",
            sourceRefs: [`action://${id}`, "shadowbroker://sim/bounded-collect"],
          });
          memoryId = res.memory?.id;
          reason = res.reason;
        } else if (current.kind === "rebuild-index") {
          const ident = identity({
            tenantId: "szl-core",
            securityDomain: "memory-plane",
            subjectId: get().session.subjectId,
            agentId: "covenant-auditor",
            purpose: "policy-review",
          });
          const rcpt = await engine!.reindex(ident);
          reason = rcpt.effect;
        } else if (current.kind === "mesh-probe") {
          const ident = identity({
            tenantId: "adversary-sim",
            securityDomain: "testnet",
            subjectId: get().session.subjectId,
            agentId: "red-team-sim",
            purpose: "adversarial-test",
          });
          const res = await engine!.write({
            identity: ident,
            tenantId: "szl-core",
            securityDomain: "memory-plane",
            memoryClass: "evidence_memory",
            sensitivity: "secret",
            content: "mesh-probe: foreign principal write into szl-core",
            sourceRefs: [`action://${id}`],
          });
          reason = res.allowed ? "unexpected allow" : `denied as expected: ${res.reason}`;
        }
        pull(set);
        const next: ActionRequest = {
          ...current,
          status: "executed",
          reason,
          memoryId,
        };
        set({ actions: get().actions.map((a) => (a.id === id ? next : a)) });
        return next;
      },

      fireScenario: async (scenarioId) => {
        if (!engine) await get().hydrate();
        const rec = await execScenario(scenarioId, engine!);
        pull(set);
        set({ adversaryRuns: [rec, ...get().adversaryRuns].slice(0, 40) });
        return rec;
      },

      fireCampaign: async () => {
        const out: AdversaryRun[] = [];
        for (const s of SCENARIOS) {
          out.push(await get().fireScenario(s.id));
        }
        return out;
      },

      bootBrain: async () => {
        if (brain?.built) {
          set({ brainReady: true, brainCorpusN: brain.n, brainError: null });
          return;
        }
        try {
          const raw = await fetchPublicCorpus();
          brain = new SecondBrainIndex();
          brain.loadText(raw);
          if (!brain.built) throw new Error(brain.loadError ?? "corpus empty");
          set({ brainReady: true, brainCorpusN: brain.n, brainError: null });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "corpus UNAVAILABLE";
          set({ brainReady: false, brainError: msg, brainCorpusN: 0 });
        }
      },

      setBrainAlive: (on) => set({ brainAlive: on }),

      askBrain: async (query, seal = true) => {
        if (!brain?.built) await get().bootBrain();
        if (!brain?.built) {
          const t: BrainTrace = {
            id: rid("brn"),
            at: new Date().toISOString(),
            query,
            decision: "ABSTAIN",
            citedNodeIds: [],
            handleCount: 0,
            reason: get().brainError ?? "index UNAVAILABLE — no LIVE retrieval fabricated",
            sealed: false,
          };
          set({ brainTraces: [t, ...get().brainTraces].slice(0, 80), lastBrainPlan: { query, decision: "ABSTAIN", reason: t.reason, handles: [] } });
          return t;
        }
        const hit = brain.search(query, 6);
        const plan = brain.plan(query, hit.handles);
        const citations = { ...get().brainCitations };
        for (const id of plan.citedNodeIds) citations[id] = (citations[id] ?? 0) + 1;
        let sealed = false;
        if (seal && engine) {
          const ident = identity({
            tenantId: "szl-core",
            securityDomain: "memory-plane",
            subjectId: get().session.subjectId,
            agentId: "yachay-navigator",
            purpose: "evaluation",
          });
          const res = await engine.write({
            identity: ident,
            tenantId: "szl-core",
            securityDomain: "memory-plane",
            memoryClass: plan.decision === "NAVIGATE" ? "outcome_memory" : "decision_memory",
            sensitivity: "internal",
            content: `Yachay ${plan.decision} «${query}». ${plan.decision === "NAVIGATE" ? `cited ${plan.citedNodeIds.join(",")}` : plan.abstainReason}. SOFTWARE handles-only. Index is DATA, never weights.`,
            sourceRefs: [
              "szl://second-brain/public-projection",
              ...plan.citedNodeIds.map((id) => `handle://${id}`),
            ],
          });
          sealed = res.allowed;
          pull(set);
        }
        const t: BrainTrace = {
          id: rid("brn"),
          at: new Date().toISOString(),
          query,
          decision: plan.decision,
          citedNodeIds: plan.citedNodeIds,
          handleCount: hit.handles.length,
          reason: plan.abstainReason ?? `NAVIGATE ${plan.citedNodeIds[0] ?? ""}`,
          sealed,
        };
        set({
          brainTraces: [t, ...get().brainTraces].slice(0, 80),
          brainCitations: citations,
          lastBrainPlan: {
            query,
            decision: plan.decision,
            reason: t.reason,
            handles: hit.handles.map((h) => ({ nodeId: h.nodeId, note: h.note })),
          },
        });
        return t;
      },

      pulseBrain: async () => {
        if (!get().brainAlive) return null;
        if (!brain?.built) await get().bootBrain();
        const q = CURRICULUM[pulseCursor % CURRICULUM.length];
        pulseCursor += 1;
        return get().askBrain(q, pulseCursor % 5 === 0);
      },
    }),
    {
      name: "szl-frontier-orchestrator",
      partialize: (s) => ({
        session: s.session,
        memories: s.memories,
        receipts: s.receipts,
        mesh: s.mesh,
        ideas: s.ideas,
        lastGates: s.lastGates,
        genesisHash: s.genesisHash,
        policyBundleSha256: s.policyBundleSha256,
        ingestJobs: s.ingestJobs,
        modelRoutes: s.modelRoutes,
        taskings: s.taskings,
        outcomes: s.outcomes,
        actions: s.actions,
        adversaryRuns: s.adversaryRuns,
        brainAlive: s.brainAlive,
        brainTraces: s.brainTraces,
        brainCitations: s.brainCitations,
      }),
    },
  ),
);

export { PROJECTS, TENANTS, AGENTS, INGEST_CATALOG, INTEL_FEED, MODELS, ACTIONS, SCENARIOS };
