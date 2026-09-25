import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { expandFrontierIdea } from "@/lib/ai/expand-idea";
import { runSoftwareCycle, promotionBlockedReason, type CycleReport } from "@/lib/frontier/cycle";
import { observeEstate } from "@/lib/frontier/estate-observe";
import { SOURCE } from "@/lib/frontier/source";
import {
  FAMILIES,
  RESEARCH_TARGETS,
  VERTICAL_JOURNEYS,
  WORKSTREAM_STATUSES,
  WORKSTREAMS,
  filterWorkstreams,
  workstreamTone,
  type Workstream,
} from "@/lib/frontier/workstreams";
import { PROJECTS, useOrchestrator } from "@/stores/orchestrator";
import { KernelsPanel, LeasesPanel } from "@/components/frontier/hold-panels";
import { CodexPanel, HoldStrip as EvalHoldStrip, PinPanel, TriadPanel as EvalTriadPanel } from "@/components/frontier/eval-panels";
import {
  admitOptionalEvaluation,
  defaultOptionalEvaluation,
  parseStoredOptionalEval,
  refuseHandoffFromThisOrgan,
  type OptionalEvaluation,
} from "@/lib/frontier/optional-eval";

const TABS = ["workstreams", "cycle", "estate", "triad", "pin", "codex", "kernels", "leases", "optional", "journeys", "lab"] as const;
type Tab = (typeof TABS)[number];

type EstateObservation = Awaited<ReturnType<typeof observeEstate>>;

export const Route = createFileRoute("/frontier")({
  validateSearch: (s: Record<string, unknown>): {
    tab?: Tab;
    q?: string;
    family?: string;
    status?: string;
  } => ({
    tab: (TABS as readonly string[]).includes(String(s.tab)) ? (s.tab as Tab) : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    family: typeof s.family === "string" && s.family !== "all" ? s.family : undefined,
    status: typeof s.status === "string" && s.status !== "all" ? s.status : undefined,
  }),
  component: FrontierPage,
});

function FrontierPage() {
  const search = Route.useSearch();
  const tab = search.tab ?? "workstreams";
  const q = search.q ?? "";
  const family = search.family ?? "all";
  const status = search.status ?? "all";
  const navigate = Route.useNavigate();
  const [optedIn, setOptedIn] = useState(() => {
    try {
      return parseStoredOptionalEval(localStorage.getItem("szl-frontier-optional-eval"));
    } catch {
      return false;
    }
  });

  function setOptionalEval(next: boolean) {
    const admitted = admitOptionalEvaluation(next);
    setOptedIn(admitted.optedIn);
    try {
      localStorage.setItem("szl-frontier-optional-eval", JSON.stringify(admitted));
    } catch {
      /* private browsing */
    }
  }

  function setTab(next: Tab) {
    void navigate({ search: (prev) => ({ ...prev, tab: next }) });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Frontier organ · EVALUATION / HOLD"
        title="Operational intake plane"
        description="F01–F34 workstreams, bounded Ouroboros cycle, and public estate observation. This organ admits evaluation. It does not promote production, train models, or lift HOLD."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to="/harbor">Harbor</Link>
            </Button>
            <Button variant="secondary" asChild>
              <a href="/api/source">Source identity</a>
            </Button>
          </div>
        }
      />

      <EvalHoldStrip optedIn={optedIn} onOptedIn={setOptionalEval} />

      <div role="tablist" aria-label="Frontier surfaces" className="flex flex-wrap gap-1">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`h-10 rounded-md px-3 text-sm capitalize ${
              tab === id ? "bg-bg-subtle text-fg" : "text-muted hover:bg-bg-subtle hover:text-fg"
            }`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === "workstreams" ? <WorkstreamsPanel q={q} family={family} status={status} /> : null}
      {tab === "cycle" ? <CyclePanel /> : null}
      {tab === "estate" ? <EstatePanel /> : null}
      {tab === "triad" ? <EvalTriadPanel optedIn={optedIn} /> : null}
      {tab === "pin" ? <PinPanel optedIn={optedIn} /> : null}
      {tab === "codex" ? <CodexPanel optedIn={optedIn} /> : null}
      {tab === "kernels" ? <KernelsPanel /> : null}
      {tab === "leases" ? <LeasesPanel /> : null}
      {tab === "optional" ? <OptionalEvalPanel /> : null}
      {tab === "journeys" ? <JourneysPanel /> : null}
      {tab === "lab" ? <LabPanel /> : null}
    </div>
  );
}


function OptionalEvalPanel() {
  const [state, setState] = useState<OptionalEvaluation>(() => {
    try {
      return admitOptionalEvaluation(parseStoredOptionalEval(localStorage.getItem("szl-frontier-optional-eval")));
    } catch {
      return defaultOptionalEvaluation();
    }
  });

  function persist(next: OptionalEvaluation) {
    setState(next);
    try {
      localStorage.setItem("szl-frontier-optional-eval", JSON.stringify(next));
    } catch {
      /* private browsing */
    }
  }

  function toggle(optedIn: boolean) {
    persist(admitOptionalEvaluation(optedIn));
  }

  let handoff = "HANDOFF_NOT_EXECUTABLE_HERE";
  try {
    refuseHandoffFromThisOrgan("HANDOFF");
    handoff = "UNEXPECTED_ALLOW";
  } catch (err) {
    handoff = err instanceof Error ? err.message : "HANDOFF_NOT_EXECUTABLE_HERE";
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Optional evaluation is off by default. Opting in admits THIS_ORGAN only. It cannot
        lift HOLD, execute HANDOFF, or authorize production.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Opted in" v={String(state.optedIn)} h={state.note} />
        <Stat k="Authorization" v={String(state.productionAuthorization)} h="always false" />
        <Stat k="Promotion" v={state.promotionEffect} h="cannot promote" />
        <Stat k="Handoff" v="REFUSED" h={handoff} />
      </div>
      <label className="flex h-10 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={state.optedIn}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4 accent-accent"
        />
        Admit optional evaluation for this organ
      </label>
      <p className="text-xs text-muted">
        Scopes: {state.admittedScopes.length ? state.admittedScopes.join(", ") : "none"}.
      </p>
    </div>
  );
}

function WorkstreamsPanel({ q, family, status }: { q: string; family: string; status: string }) {
  const navigate = Route.useNavigate();
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const pageSize = 8;

  const rows = useMemo(
    () => filterWorkstreams(WORKSTREAMS, { q, family, status }),
    [q, family, status],
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            schema: "szl.frontier.workstreams/v1",
            productionAuthorization: false,
            reconciledHead: SOURCE.reconciledHead,
            items: rows,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "szl-frontier-workstreams.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 text-xs text-muted">
          Search
          <Input
            className="mt-1"
            value={q}
            placeholder="DeepSeek, memory, GGUF…"
            onChange={(e) => {
              setPage(0);
              void navigate({ search: (prev) => ({ ...prev, q: e.target.value }) });
            }}
          />
        </label>
        <label className="text-xs text-muted">
          Family
          <select
            className="mt-1 flex h-10 w-full min-w-40 rounded-md border border-border bg-bg px-3 text-sm text-fg"
            value={family}
            onChange={(e) => {
              setPage(0);
              void navigate({ search: (prev) => ({ ...prev, family: e.target.value }) });
            }}
          >
            <option value="all">all</option>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Status
          <select
            className="mt-1 flex h-10 w-full min-w-48 rounded-md border border-border bg-bg px-3 text-sm text-fg"
            value={status}
            onChange={(e) => {
              setPage(0);
              void navigate({ search: (prev) => ({ ...prev, status: e.target.value }) });
            }}
          >
            <option value="all">all</option>
            {WORKSTREAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={exportJson}>
          Export JSON
        </Button>
      </div>

      <p className="text-xs text-muted">
        {rows.length} matching · selected-for-release is evaluation scope, not authorization.
      </p>

      <div className="overflow-x-auto rounded-xl bg-bg-elevated shadow-[inset_0_0_0_1px_var(--color-border)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Frontier workstreams F01 through F34</caption>
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-subtle">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Workstream</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Release set</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted">
                  No workstreams match. Clear filters or broaden the query.
                </td>
              </tr>
            ) : (
              slice.map((w) => (
                <WorkstreamRow
                  key={w.id}
                  item={w}
                  open={openId === w.id}
                  onToggle={() => setOpenId((id) => (id === w.id ? null : w.id))}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-subtle">
          page {safePage + 1}/{pages}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={safePage >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkstreamRow({
  item,
  open,
  onToggle,
}: {
  item: Workstream;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border/80">
        <td className="px-4 py-3 font-mono text-xs text-accent">{item.code}</td>
        <td className="px-4 py-3">
          <button type="button" className="text-left text-sm hover:underline" onClick={onToggle}>
            {item.title}
          </button>
          <div className="text-xs text-muted">{item.family}</div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-muted">{item.owner}</td>
        <td className="px-4 py-3">
          <Badge tone={workstreamTone(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
        </td>
        <td className="px-4 py-3 text-xs text-muted">{item.selectedForRelease ? "eval set" : "watch only"}</td>
      </tr>
      {open ? (
        <tr className="border-b border-border">
          <td colSpan={5} className="bg-bg px-4 py-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact k="Hypothesis" v={item.hypothesis} />
              <Fact k="Baseline" v={item.baseline} />
              <Fact k="Evidence" v={item.evidence} />
              <Fact k="Blocker" v={item.blocker ?? "None recorded — still HOLD."} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled
                variant="secondary"
                title={promotionBlockedReason()}
                aria-disabled="true"
              >
                Promote to production
              </Button>
              <p className="max-w-xl text-xs leading-relaxed text-muted">{promotionBlockedReason()}</p>
            </div>
            {item.issue ? (
              <p className="mt-3 text-xs">
                <a
                  className="text-accent underline-offset-2 hover:underline"
                  href={`https://github.com/szl-holdings/szl-frontier/issues/${item.issue}`}
                >
                  Owner issue #{item.issue}
                </a>
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CyclePanel() {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(true);
  const [report, setReport] = useState<CycleReport | null>(null);

  async function run() {
    setBusy(true);
    try {
      let counterparty: { ok: boolean; status: string; defaultBranch?: string | null; error?: string } | null =
        null;
      if (live) {
        const estate = await observeEstate();
        counterparty = estate.counterparty;
      }
      const next = await runSoftwareCycle({ live, counterparty });
      setReport(next);
      try {
        localStorage.setItem("szl-frontier-cycle-ledger", JSON.stringify(next));
      } catch {
        /* private browsing */
      }
      toast(next.gate.verdict, { description: `exit ${next.exit} · productionAuthorized=false` });
    } catch (err) {
      toast("Cycle failed closed", { description: err instanceof Error ? err.message : "UNAVAILABLE" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bounded Ouroboros cycle</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Two rounds, then halt. receipts.in ≡ receipts.out. Arithmetic mean is a shadow and cannot act.
            Energy is UNAVAILABLE. Live GitHub failure stays UNAVAILABLE, never a measured zero.
          </p>
          <label className="flex h-10 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="size-4 accent-accent"
            />
            Attach live public GitHub counterparty
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void run()}>
              {busy ? "Running…" : "Run cycle"}
            </Button>
            <Button variant="secondary" asChild>
              <a href="/api/health">GET /api/health</a>
            </Button>
            <Button variant="secondary" asChild>
              <a href="/api/ready">GET /api/ready</a>
            </Button>
          </div>
        </CardBody>
      </Card>

      {report ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Last cycle</CardTitle>
              <Badge tone={report.gate.verdict === "ALLOW" ? "allow" : "deny"}>{report.gate.verdict}</Badge>
              <Badge>{report.exit}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row k="Λ score" v={fmt(report.gate.lambdaScore)} />
            <Row k="Arithmetic (shadow)" v={fmt(report.gate.arithmeticScore)} />
            <Row k="Divergent" v={report.gate.divergent ? "yes · not executable" : "no"} />
            <Row k="Round 1" v={report.rounds[0]?.digest.slice(0, 16) ?? "—"} />
            <Row k="Round 2" v={report.rounds[1]?.digest.slice(0, 16) ?? "—"} />
            <Row k="Counterparty" v={String(report.counterparty?.status ?? "software-only")} />
            <Row k="Production" v="false" />
            {report.gate.gaps.length ? (
              <p className="text-xs text-deny">Gaps: {report.gate.gaps.join(", ")}</p>
            ) : null}
            <p className="text-xs text-muted">{report.note}</p>
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-muted">No cycle in this session. Run to seal two SOFTWARE receipts.</p>
      )}
    </div>
  );
}

function EstatePanel() {
  const [busy, setBusy] = useState(false);
  const [obs, setObs] = useState<EstateObservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const next = await observeEstate();
      setObs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Public GitHub and Hugging Face membership metadata. Authenticated and private scopes stay separate.
          UNKNOWN is not zero. RUNNING is not runtime-verified.
        </p>
        <Button disabled={busy} onClick={() => void refresh()}>
          {busy ? "Observing…" : obs ? "Reobserve" : "Observe public estate"}
        </Button>
      </div>
      {error ? <p className="text-sm text-deny">Observation failed closed: {error}</p> : null}
      {!obs && !busy && !error ? (
        <p className="text-sm text-muted">No live observation yet. This panel does not reuse demo records.</p>
      ) : null}
      {busy && !obs ? <p className="text-sm text-muted">Probing public APIs…</p> : null}
      {obs ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              k="GitHub public"
              v={obs.github.itemsObserved === null ? "UNKNOWN" : String(obs.github.itemsObserved)}
              h={obs.github.status}
            />
            <Stat
              k="HF models"
              v={obs.huggingface.models.itemsObserved === null ? "UNKNOWN" : String(obs.huggingface.models.itemsObserved)}
              h={obs.huggingface.models.status}
            />
            <Stat
              k="HF datasets"
              v={
                obs.huggingface.datasets.itemsObserved === null
                  ? "UNKNOWN"
                  : String(obs.huggingface.datasets.itemsObserved)
              }
              h={obs.huggingface.datasets.status}
            />
            <Stat
              k="HF kernels"
              v="UNKNOWN"
              h={obs.huggingface.kernels.note}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>GitHub public repositories</CardTitle>
            </CardHeader>
            <CardBody>
              <EstateTable
                empty={obs.github.status === "UNAVAILABLE" ? obs.github.error ?? "UNAVAILABLE" : "No public repos in window."}
                rows={obs.github.items.map((r) => [r.id, r.defaultBranch ?? "—", r.pushedAt ?? "—"])}
                heads={["Repository", "Default branch", "Pushed"]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hugging Face spaces (stage is not verification)</CardTitle>
            </CardHeader>
            <CardBody>
              <EstateTable
                empty={
                  obs.huggingface.spaces.status === "UNAVAILABLE"
                    ? obs.huggingface.spaces.error ?? "UNAVAILABLE"
                    : "No spaces in window."
                }
                rows={obs.huggingface.spaces.items.map((r) => [r.id, r.runtime ?? "unreported", r.lastModified ?? "—"])}
                heads={["Space", "Runtime reported", "Modified"]}
              />
            </CardBody>
          </Card>
          <p className="text-xs text-muted">
            Observed {obs.startedAt} → {obs.finishedAt}. source_content_files_read=0. semantic_review_complete=false.
            runtime_verified=false. productionAuthorization=false.
          </p>
        </>
      ) : null}
    </div>
  );
}

function JourneysPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Vertical journeys</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {VERTICAL_JOURNEYS.map((j) => (
            <Card key={j.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{j.title}</CardTitle>
                  <Badge>owner</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                <p className="font-mono text-xs text-muted">{j.owner}</p>
                <p className="text-sm leading-relaxed">{j.path}</p>
                <p className="text-xs text-muted">{j.note}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Research targets</h2>
        <div className="space-y-2">
          {RESEARCH_TARGETS.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-xl bg-bg-elevated px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="text-sm">
                  <span className="font-mono text-xs text-accent">{r.id}</span> {r.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{r.note}</p>
              </div>
              <Badge tone={r.status === "HOLD" ? "deny" : "accent"}>{r.status.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabPanel() {
  const ideas = useOrchestrator((s) => s.ideas);
  const generateIdeas = useOrchestrator((s) => s.generateIdeas);
  const setIdeaExpansion = useOrchestrator((s) => s.setIdeaExpansion);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function expand(id: string) {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;
    setBusyId(id);
    try {
      const res = await expandFrontierIdea({
        data: {
          project: idea.project,
          theme: idea.theme,
          description: idea.description,
          hooks: [...idea.governanceHooks, ...idea.orchestrationHooks],
        },
      });
      if (!res.ok) {
        toast("Expansion unavailable", { description: res.error });
        return;
      }
      setIdeaExpansion(id, res.text);
      toast("Idea compiled");
    } finally {
      setBusyId(null);
    }
  }

  function downloadPayload() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            contract: "szl-frontier/1.0",
            productionAuthorization: false,
            projects: PROJECTS,
            ideas,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "szl-frontier-payload.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={generateIdeas}>
          Run idea kernel
        </Button>
        <Button onClick={downloadPayload}>Export lab payload</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PROJECTS.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{p.name}</CardTitle>
                <Badge tone={p.kind === "reference" ? "pending" : "accent"}>{p.kind}</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm leading-relaxed text-muted">{p.notes}</p>
              <p className="text-sm">{p.roleInSzl}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Ideas</h2>
        {ideas.length === 0 ? (
          <p className="text-sm text-muted">No ideas yet. Run the kernel. Generated proposals are not permissions.</p>
        ) : null}
        {ideas.map((idea) => (
          <article
            key={idea.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{idea.project}</span>
              <Badge>{idea.theme}</Badge>
              <Badge tone={idea.riskLevel === "high" ? "deny" : idea.riskLevel === "medium" ? "pending" : "allow"}>
                {idea.riskLevel}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{idea.description}</p>
            {idea.expansion ? (
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-bg p-4 text-sm leading-relaxed shadow-[inset_0_0_0_1px_var(--color-border)]">
                {idea.expansion}
              </div>
            ) : (
              <Button
                className="mt-4"
                size="sm"
                variant="secondary"
                disabled={busyId === idea.id}
                onClick={() => expand(idea.id)}
              >
                {busyId === idea.id ? "Compiling…" : "Compile with Grok"}
              </Button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function EstateTable({
  heads,
  rows,
  empty,
}: {
  heads: string[];
  rows: string[][];
  empty: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.14em] text-subtle">
            {heads.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 40).map((r) => (
            <tr key={r.join("|")} className="border-t border-border">
              {r.map((c, i) => (
                <td key={i} className={`py-2 pr-4 ${i === 0 ? "font-mono text-xs" : "text-muted"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ k, v, h }: { k: string; v: string; h: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{k}</div>
      <div className="mt-2 font-mono text-xl tabular tracking-tight">{v}</div>
      <div className="mt-1 text-xs text-muted">{h}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="font-mono text-xs">{v}</span>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-subtle">{k}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-muted">{v}</dd>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "null";
  return n.toFixed(4);
}
