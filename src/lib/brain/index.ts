import { sha256Hex } from "@/lib/covenant/sha256";

export const PUBLIC_CHUNK_COUNT = 575;
export const PRIVATE_GRAPH_NODES = 9464;
export const SCHEMA_RETRIEVE = "szl.second-brain.retrieve/v1";
export const SCHEMA_NAV = "szl.brain.navigator-context/v1";
export const CORPUS_URL = "/brain-corpus.public.jsonl";

const TOKEN = /[a-z0-9λ]+/gi;
const STOP = new Set([
  "the", "is", "a", "an", "of", "and", "or", "to", "in", "for", "on", "at",
  "by", "as", "what", "which", "who", "how", "why", "does", "did", "are",
  "was", "be", "it", "this", "that", "with", "from", "into", "over", "not",
]);

export function brainTokenize(text: string): string[] {
  return (text.match(TOKEN) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export interface CorpusRow {
  id: string;
  title: string;
  source: string;
  sourceId?: string;
  sha256: string;
  text: string;
}

export interface BrainHandle {
  nodeId: string;
  nodeKind: "INDEX";
  label: "DECLARED";
  note: string;
  source?: string;
  sha256?: string;
}

export interface RetrieveResult {
  schema: string;
  query: string;
  handles: BrainHandle[];
  scores: number[];
  corpus_n: number;
  ready: boolean;
  kind: "SOFTWARE";
  content_access: "HANDLES_ONLY";
  honesty: string;
  index_is_model_weights: false;
  raw_graph_nodes_admitted_to_gradients: 0;
}

export interface PlanResult {
  decision: "NAVIGATE" | "ABSTAIN";
  citedNodeIds: string[];
  abstainReason: string | null;
  query: string;
  handles: BrainHandle[];
  planner: string;
  kind: "SOFTWARE";
  lambda: "Conjecture 1";
}

const ABSTAIN_HINTS = [
  "secret launch",
  "physical effector",
  "unpublished earnings",
  "private 9464",
  "9464-node",
  "owner-setup.md",
  "invent a nodeid",
  "sovereign-citizen",
  "nvml joule",
];

type IndexedRow = CorpusRow & { toks: string[]; tf: Map<string, number> };

export class SecondBrainIndex {
  rows: IndexedRow[] = [];
  df = new Map<string, number>();
  loadError: string | null = null;

  get n() {
    return this.rows.length;
  }
  get built() {
    return !this.loadError && this.n > 0;
  }

  loadText(raw: string) {
    this.rows = [];
    this.df = new Map();
    this.loadError = null;
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let row: CorpusRow;
      try {
        row = JSON.parse(line) as CorpusRow;
      } catch {
        continue;
      }
      if (!row?.id) continue;
      const toks = brainTokenize(`${row.title ?? ""} ${row.text ?? ""}`);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      const digest = typeof row.sha256 === "string" && row.sha256.length === 64 ? row.sha256 : "";
      this.rows.push({
        id: String(row.id),
        title: String(row.title ?? ""),
        source: String(row.source ?? "unknown"),
        sourceId: row.sourceId,
        sha256: digest,
        text: "",
        toks,
        tf,
      });
      const seen = new Set(toks);
      for (const t of seen) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    if (!this.rows.length) this.loadError = "public corpus empty";
  }

  handle(row: { id: string; title: string; source: string; sha256: string }): BrainHandle {
    return {
      nodeId: row.id,
      nodeKind: "INDEX",
      label: "DECLARED",
      note: (row.title || "").slice(0, 160),
      source: row.source,
      sha256: row.sha256,
    };
  }

  search(query: string, k = 6): RetrieveResult {
    const honestyBase =
      "Lexical rank over the PUBLIC in-repo projection. Score is overlap, never correctness. Content stays in the controller. Not LIVE retrieval. Private 9464-node graph is not here. Index is DATA, never weights.";
    if (!this.built) {
      return {
        schema: SCHEMA_RETRIEVE,
        query,
        handles: [],
        scores: [],
        corpus_n: 0,
        ready: false,
        kind: "SOFTWARE",
        content_access: "HANDLES_ONLY",
        honesty: `Index UNAVAILABLE (${this.loadError ?? "empty"}). No LIVE retrieval fabricated.`,
        index_is_model_weights: false,
        raw_graph_nodes_admitted_to_gradients: 0,
      };
    }
    const q = brainTokenize(query);
    if (!q.length) {
      return {
        schema: SCHEMA_RETRIEVE,
        query,
        handles: [],
        scores: [],
        corpus_n: this.n,
        ready: false,
        kind: "SOFTWARE",
        content_access: "HANDLES_ONLY",
        honesty: "empty query — no ranking fabricated",
        index_is_model_weights: false,
        raw_graph_nodes_admitted_to_gradients: 0,
      };
    }
    const scored: Array<{ s: number; row: IndexedRow }> = [];
    const idfN = Math.max(1, this.n);
    const qf = new Map<string, number>();
    for (const t of q) qf.set(t, (qf.get(t) ?? 0) + 1);
    for (const row of this.rows) {
      let score = 0;
      for (const [term, qCount] of qf) {
        const tf = row.tf.get(term) ?? 0;
        if (!tf) continue;
        const idf = Math.log((idfN + 1) / (1 + (this.df.get(term) ?? 0))) + 1;
        score += (tf / (tf + 1.2)) * idf * qCount;
      }
      if (score > 0) scored.push({ s: score, row });
    }
    scored.sort((a, b) => b.s - a.s);
    const top = scored.slice(0, Math.max(1, Math.min(k, 12)));
    const handles = top.map((x) => this.handle(x.row));
    return {
      schema: SCHEMA_RETRIEVE,
      query,
      handles,
      scores: top.map((x) => Math.round(x.s * 10000) / 10000),
      corpus_n: this.n,
      ready: handles.length > 0,
      kind: "SOFTWARE",
      content_access: "HANDLES_ONLY",
      honesty: honestyBase,
      index_is_model_weights: false,
      raw_graph_nodes_admitted_to_gradients: 0,
    };
  }

  plan(query: string, handles: BrainHandle[]): PlanResult {
    const q = (query || "").toLowerCase();
    const offered = handles.map((h) => ({
      ...h,
      nodeKind: "INDEX" as const,
      label: "DECLARED" as const,
      note: (h.note || "").slice(0, 160),
    }));
    const ids = new Set(offered.map((h) => h.nodeId));
    let abstain = ABSTAIN_HINTS.some((h) => q.includes(h)) || offered.length === 0;
    let best: BrainHandle | null = null;
    let bestScore = 0;
    if (!abstain) {
      const qtoks = new Set(brainTokenize(query));
      for (const h of offered) {
        const tset = new Set(brainTokenize(`${h.note} ${h.label} ${h.nodeKind}`));
        let sc = 0;
        for (const t of qtoks) if (tset.has(t)) sc++;
        if (sc > bestScore) {
          bestScore = sc;
          best = h;
        }
      }
      if (!best || bestScore <= 0) abstain = true;
    }
    if (abstain || !best || !ids.has(best.nodeId)) {
      return {
        decision: "ABSTAIN",
        citedNodeIds: [],
        abstainReason: "No offered handle supports the query; refusing to fabricate grounding.",
        query,
        handles: offered,
        planner: "SZL-BrainNavigator-R2-SOFTWARE",
        kind: "SOFTWARE",
        lambda: "Conjecture 1",
      };
    }
    return {
      decision: "NAVIGATE",
      citedNodeIds: [best.nodeId],
      abstainReason: null,
      query,
      handles: offered,
      planner: "SZL-BrainNavigator-R2-SOFTWARE",
      kind: "SOFTWARE",
      lambda: "Conjecture 1",
    };
  }
}

export const CURRICULUM = [
  "deny by default memory covenant",
  "lambda uniqueness conjecture 1",
  "vxdb derived index never authority",
  "receipts in equals receipts out",
  "human approval cannot lift hard deny",
  "a11oy command center product origin",
  "second brain handles only public projection",
  "shadowbroker read only connector",
  "doctrine v11 locked kernel",
  "private 9464-node graph",
  "invent a nodeid",
];

export async function fetchPublicCorpus(): Promise<string> {
  const res = await fetch(CORPUS_URL);
  if (!res.ok) throw new Error(`corpus HTTP ${res.status}`);
  return res.text();
}

export async function handleDigest(handles: BrainHandle[]): Promise<string> {
  return sha256Hex(JSON.stringify(handles.map((h) => h.nodeId)));
}
