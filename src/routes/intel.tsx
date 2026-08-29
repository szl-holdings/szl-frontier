import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateIntelAction } from "@/lib/intel/feed";
import { formatAgo } from "@/lib/utils";
import { INTEL_FEED, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/intel")({ component: IntelPage });

function IntelPage() {
  const taskings = useOrchestrator((s) => s.taskings);
  const requestTasking = useOrchestrator((s) => s.requestTasking);
  const decideTasking = useOrchestrator((s) => s.decideTasking);
  const session = useOrchestrator((s) => s.session);
  const [busy, setBusy] = useState<string | null>(null);

  const recon = evaluateIntelAction({ action: "active-recon", purpose: "intel-read" });

  async function request(id: string) {
    setBusy(id);
    try {
      const t = requestTasking(id);
      toast("Pending approval", { description: t.reason });
    } finally {
      setBusy(null);
    }
  }

  async function decide(id: string, approved: boolean) {
    setBusy(id);
    try {
      const t = await decideTasking(id, approved);
      toast(t.status, { description: t.reason });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Sequence 4"
        title="Read-only intel connector"
        description="Shadowbroker is a simulated geospatial OSINT feed. The connector may read. Ingest requires a human approval. Active recon is denied on every path."
      />

      <Card>
        <CardHeader>
          <CardTitle>Connector policy</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Policy k="Read" v="allowed under intel-read" ok />
          <Policy k="Ingest" v="human approval required" ok={false} warn />
          <Policy k="Active recon" v={recon.reason} ok={false} />
        </CardBody>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {INTEL_FEED.map((obs) => (
          <article
            key={obs.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium">{obs.title}</h2>
              <Badge>{obs.kind}</Badge>
              <Badge tone={obs.confidence === "high" ? "allow" : "pending"}>{obs.confidence}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{obs.summary}</p>
            <div className="mt-2 font-mono text-[11px] text-subtle">
              {obs.region} · {obs.source}
            </div>
            <Button
              className="mt-4"
              size="sm"
              variant="secondary"
              disabled={!!busy}
              onClick={() => request(obs.id)}
            >
              Request ingest
            </Button>
          </article>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-subtle">
          Approvals · {session.agentId}
        </h2>
        {taskings.length === 0 ? (
          <p className="text-sm text-muted">No taskings. Request ingest, then approve or deny.</p>
        ) : null}
        {taskings.map((t) => {
          const obs = INTEL_FEED.find((o) => o.id === t.observationId);
          return (
            <article
              key={t.id}
              className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{obs?.title ?? t.observationId}</span>
                <Badge
                  tone={
                    t.status === "ingested" || t.status === "approved"
                      ? "allow"
                      : t.status === "denied"
                        ? "deny"
                        : "pending"
                  }
                >
                  {t.status}
                </Badge>
                <span className="ml-auto font-mono text-[11px] text-subtle">{formatAgo(t.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{t.reason}</p>
              {t.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={!!busy} onClick={() => void decide(t.id, true)}>
                    Approve ingest
                  </Button>
                  <Button size="sm" variant="deny" disabled={!!busy} onClick={() => void decide(t.id, false)}>
                    Deny
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Policy({ k, v, ok, warn }: { k: string; v: string; ok: boolean; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-bg px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-border)]">
      <div className="text-[10px] uppercase tracking-[0.16em] text-subtle">{k}</div>
      <div className={`mt-1 text-sm ${ok ? "text-allow" : warn ? "text-pending" : "text-deny"}`}>{v}</div>
    </div>
  );
}
