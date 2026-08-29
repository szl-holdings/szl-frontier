import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAgo } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/mesh")({ component: MeshPage });

function MeshPage() {
  const agents = useOrchestrator((s) => s.agents);
  const mesh = useOrchestrator((s) => s.mesh);
  const dispatchAgent = useOrchestrator((s) => s.dispatchAgent);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, op: "write" | "search" | "probe") {
    setBusy(id + op);
    try {
      const summary = await dispatchAgent(id, op);
      toast(op === "probe" ? "Probe complete" : "Dispatched", { description: summary });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Agent mesh"
        title="Everything routes the gateway"
        description="Agents do not touch the index. They present identity and purpose to the Memory Gateway. Cross-tenant probes are expected to deny."
      />

      <Card>
        <CardHeader>
          <CardTitle>Call path</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 text-center sm:grid-cols-5">
            {["Agent", "Gateway", "Policy", "Authority", "Derived index"].map((n, i) => (
              <div
                key={n}
                className="rounded-lg bg-bg px-3 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]"
              >
                <div className="font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-1 text-sm">{n}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            PostgreSQL (here: the covenant store) is authoritative. The lexhash index stands in for embedded vxdb — searchable, never the record of truth.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {agents.map((a) => (
          <article
            key={a.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">{a.name}</h2>
                <p className="mt-1 text-sm text-muted">{a.mandate}</p>
              </div>
              <Badge tone={a.status === "denied" ? "deny" : a.status === "running" ? "pending" : "allow"}>
                {a.status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] text-subtle">
              <span>{a.tenantId}</span>
              <span>{a.securityDomain}</span>
              <span>{a.clearance}</span>
            </div>
            <p className="mt-2 text-xs text-muted">{a.lastAction}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run(a.id, "search")}>
                Recall
              </Button>
              <Button size="sm" disabled={!!busy} onClick={() => run(a.id, "write")}>
                Heartbeat
              </Button>
              <Button size="sm" variant="deny" disabled={!!busy} onClick={() => run(a.id, "probe")}>
                Cross-tenant probe
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch log</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {mesh.slice(0, 16).map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
              <div className="min-w-0">
                <div className="font-mono text-xs">
                  {e.agentId} · {e.operation}
                </div>
                <div className="text-sm text-muted">{e.summary}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={e.allowed ? "allow" : "deny"}>{e.allowed ? "allow" : "deny"}</Badge>
                <span className="font-mono text-[11px] text-subtle">{formatAgo(e.at)}</span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
