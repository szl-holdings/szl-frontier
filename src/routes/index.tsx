import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FORMULAS } from "@/lib/covenant/formulas";
import { MEMORY_CLASSES, WRITE_STATES } from "@/lib/covenant/types";
import { formatAgo, shortId } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: CommandCenter });

const SEQUENCE = [
  { n: "01", label: "Memory plane", to: "/memory" },
  { n: "02", label: "Ingest", to: "/ingest" },
  { n: "03", label: "Model registry", to: "/models" },
  { n: "04", label: "Intel connector", to: "/intel" },
  { n: "05", label: "Action adapter", to: "/actions" },
  { n: "06", label: "Adversary", to: "/adversary" },
  { n: "07", label: "Yachay brain", to: "/brain" },
  { n: "08", label: "Frontier", to: "/frontier" },
  { n: "09", label: "Release gates", to: "/gates" },
] as const;

const POWERS = [
  { n: "01", name: "Governed recall", to: "/memory", note: "Identity, purpose, clearance" },
  { n: "02", name: "Provenance seal", to: "/proof", note: "Hash chain, receipts" },
  { n: "03", name: "Isolation", to: "/mesh", note: "Tenant and domain" },
  { n: "04", name: "Derived reindex", to: "/actions", note: "vxdb is disposable" },
  { n: "05", name: "Human-gated action", to: "/actions", note: "Approval ≠ escalation" },
] as const;

function CommandCenter() {
  const memories = useOrchestrator((s) => s.memories);
  const receipts = useOrchestrator((s) => s.receipts);
  const mesh = useOrchestrator((s) => s.mesh);
  const ideas = useOrchestrator((s) => s.ideas);
  const agents = useOrchestrator((s) => s.agents);
  const lastGates = useOrchestrator((s) => s.lastGates);
  const policy = useOrchestrator((s) => s.policyBundleSha256);
  const ingestJobs = useOrchestrator((s) => s.ingestJobs);
  const taskings = useOrchestrator((s) => s.taskings);
  const routes = useOrchestrator((s) => s.modelRoutes);
  const outcomes = useOrchestrator((s) => s.outcomes);
  const actions = useOrchestrator((s) => s.actions);
  const adversaryRuns = useOrchestrator((s) => s.adversaryRuns);
  const lastTrace = useOrchestrator((s) => s.lastWriteTrace);

  const active = memories.filter((m) => m.lifecycle === "active").length;
  const denied = receipts.filter((r) => !r.allowed).length;
  const gatePass = lastGates ? lastGates.filter((g) => g.passed).length : null;
  const pending = taskings.filter((t) => t.status === "pending").length + actions.filter((a) => a.status === "pending").length;
  const holds = adversaryRuns.filter((r) => r.passed).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Command center"
        title="SZL Frontier orchestrator"
        description="Deny-by-default memory, Yachay second brain (handles only), governed ingest, and a controlled action adapter. Approval cannot lift a hard deny. Index is DATA, never weights."
        action={
          <Button asChild>
            <Link to="/gates">
              Run gates <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-3">
        {SEQUENCE.map((s) => (
          <Link
            key={s.n}
            to={s.to}
            className="rounded-lg bg-bg-elevated px-3 py-3 shadow-[inset_0_0_0_1px_var(--color-border)] transition-colors hover:bg-bg-subtle"
          >
            <div className="font-mono text-[11px] text-subtle">{s.n}</div>
            <div className="mt-1 text-sm">{s.label}</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Five superpowers</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {POWERS.map((p) => (
            <Link
              key={p.n}
              to={p.to}
              className="rounded-lg bg-bg-elevated px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <div className="font-mono text-[11px] text-accent">{p.n}</div>
              <div className="mt-1 text-sm">{p.name}</div>
              <div className="mt-1 text-xs text-muted">{p.note}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active memories" value={String(active)} hint={`${memories.length} total`} />
        <Stat label="Receipts sealed" value={String(receipts.length)} hint={`${denied} denied`} />
        <Stat
          label="Actions / ingest"
          value={String(actions.length + ingestJobs.length)}
          hint={pending ? `${pending} pending approval` : `${routes.length} model routes`}
        />
        <Stat
          label="Release gates"
          value={gatePass === null ? "—" : `${gatePass}/${lastGates?.length ?? 20}`}
          hint={adversaryRuns.length ? `${holds} adversary holds` : "run campaign"}
        />
      </div>

      {lastTrace ? (
        <div>
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Write wires</h2>
          <ol className="flex flex-wrap gap-1.5">
            {WRITE_STATES.map((s) => {
              const hit = lastTrace.includes(s);
              const deny = s.includes("DENIED") && hit;
              return (
                <li key={s}>
                  <Badge tone={deny ? "deny" : hit ? "allow" : "default"}>{s.replaceAll("_", " ")}</Badge>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Formulas</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FORMULAS.map((f) => (
            <div
              key={f.id}
              className="rounded-lg bg-bg-elevated px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <div className="font-mono text-[11px] text-subtle">
                {f.id} · {f.name}
              </div>
              <div className="mt-1 font-mono text-xs text-muted">{f.rule}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Memory classes</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {MEMORY_CLASSES.map((c) => {
              const n = memories.filter((m) => m.envelope.memoryClass === c).length;
              return (
                <div
                  key={c}
                  className="flex items-center justify-between rounded-md bg-bg px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-border)]"
                >
                  <span className="font-mono text-xs text-muted">{c.replace("_memory", "")}</span>
                  <span className="font-mono text-sm tabular">{n}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Control plane</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row k="Policy" v="Covenant v0.3 · deny" />
            <Row k="Evidence" v="Proof chain" />
            <Row k="Index" v="derived lexhash · vxdb role" />
            <Row k="Intel" v="read-only + approval" />
            <Row k="Actions" v="hard-deny holds" />
            <Row k="Bundle" v={shortId(policy || "—", 10)} />
            <Row k="Agents" v={`${agents.length} bound`} />
            <Row k="Ideas" v={`${ideas.length} frontier`} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent receipts</CardTitle>
            <Link to="/proof" className="text-xs text-muted hover:text-fg">
              Ledger
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {receipts.slice(-6).reverse().map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-fg">{r.operation}</div>
                  <div className="truncate text-xs text-muted">{r.effect}</div>
                </div>
                <Badge tone={r.allowed ? "allow" : "deny"}>{r.allowed ? "allow" : "deny"}</Badge>
              </div>
            ))}
            {receipts.length === 0 ? <p className="text-sm text-muted">No receipts yet.</p> : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Outcome graph</CardTitle>
            <Link to="/ingest" className="text-xs text-muted hover:text-fg">
              Ingest
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {outcomes.slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{o.title}</div>
                  <div className="truncate text-xs text-muted">{o.note}</div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-subtle">{formatAgo(o.at)}</span>
              </div>
            ))}
            {outcomes.length === 0 ? (
              <div className="space-y-2">
                {mesh.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{e.agentId}</div>
                      <div className="truncate text-xs text-muted">{e.summary}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">{formatAgo(e.at)}</span>
                  </div>
                ))}
                {mesh.length === 0 ? <p className="text-sm text-muted">No outcomes yet — ingest a source.</p> : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{label}</div>
      <div className="mt-2 font-mono text-3xl tabular tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
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
