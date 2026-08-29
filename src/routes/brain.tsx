import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PRIVATE_GRAPH_NODES, PUBLIC_CHUNK_COUNT } from "@/lib/brain";
import { formatAgo } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/brain")({ component: BrainPage });

function BrainPage() {
  const ready = useOrchestrator((s) => s.brainReady);
  const alive = useOrchestrator((s) => s.brainAlive);
  const err = useOrchestrator((s) => s.brainError);
  const n = useOrchestrator((s) => s.brainCorpusN);
  const traces = useOrchestrator((s) => s.brainTraces);
  const cites = useOrchestrator((s) => s.brainCitations);
  const plan = useOrchestrator((s) => s.lastBrainPlan);
  const askBrain = useOrchestrator((s) => s.askBrain);
  const setBrainAlive = useOrchestrator((s) => s.setBrainAlive);
  const pulseBrain = useOrchestrator((s) => s.pulseBrain);
  const bootBrain = useOrchestrator((s) => s.bootBrain);
  const [q, setQ] = useState("deny by default memory covenant");
  const [busy, setBusy] = useState(false);

  const top = Object.entries(cites)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const nav = traces.filter((t) => t.decision === "NAVIGATE").length;
  const abs = traces.filter((t) => t.decision === "ABSTAIN").length;

  async function ask() {
    setBusy(true);
    try {
      const t = await askBrain(q, true);
      toast(t.decision, { description: t.reason });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Yachay · second brain"
        title="Handles only. NAVIGATE or ABSTAIN."
        description="Fold of the public 575-chunk projection from szl-second-brain. Score is overlap, never correctness. Private 9464-node graph is unpublished. Index is DATA, never weights. No LIVE retrieval is fabricated."
        action={
          <Button variant={alive ? "deny" : "default"} onClick={() => setBrainAlive(!alive)}>
            {alive ? "Pause pulse" : "Resume pulse"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Corpus" v={ready ? String(n) : "—"} h={ready ? `declared ${PUBLIC_CHUNK_COUNT}` : err ?? "loading"} />
        <Stat k="Kind" v="SOFTWARE" h="not model weights" />
        <Stat k="Navigate / abstain" v={`${nav}/${abs}`} h="learning traces" />
        <Stat k="Private graph" v="0" h={`${PRIVATE_GRAPH_NODES} unpublished`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask the navigator</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="query — empty or 9464-node will ABSTAIN"
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask();
              }}
            />
            <Button disabled={busy} onClick={() => void ask()}>
              Retrieve
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void pulseBrain()}>
              Pulse
            </Button>
          </div>
          {!ready ? (
            <p className="text-sm text-muted">
              {err ? `UNAVAILABLE: ${err}` : "Loading public projection…"}
              <Button className="ml-3" size="sm" variant="ghost" onClick={() => void bootBrain()}>
                Retry
              </Button>
            </p>
          ) : null}
          {plan ? (
            <div className="rounded-lg bg-bg p-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={plan.decision === "NAVIGATE" ? "allow" : "deny"}>{plan.decision}</Badge>
                <span className="text-sm text-muted">{plan.reason}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {plan.handles.map((h) => (
                  <li key={h.nodeId} className="font-mono text-xs text-muted">
                    <span className="text-fg">{h.nodeId}</span> · {h.note}
                  </li>
                ))}
                {plan.handles.length === 0 ? <li className="text-sm text-muted">No handles.</li> : null}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Citation frequency · never weights</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {top.length === 0 ? <p className="text-sm text-muted">Pulse or ask to grow citations.</p> : null}
            {top.map(([id, c]) => (
              <div key={id} className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{id}</span>
                <span className="font-mono text-sm tabular">{c}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pulse log</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {traces.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 py-1">
                <div className="min-w-0">
                  <div className="truncate text-sm">{t.query}</div>
                  <div className="truncate text-xs text-muted">{t.reason}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={t.decision === "NAVIGATE" ? "allow" : "deny"}>{t.decision}</Badge>
                  <span className="font-mono text-[11px] text-subtle">{formatAgo(t.at)}</span>
                </div>
              </div>
            ))}
            {traces.length === 0 ? <p className="text-sm text-muted">Awaiting first pulse.</p> : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ k, v, h }: { k: string; v: string; h: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{k}</div>
      <div className="mt-2 font-mono text-2xl tabular tracking-tight">{v}</div>
      <div className="mt-1 text-xs text-muted">{h}</div>
    </div>
  );
}
