import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { CounterfactualPanel } from "@/components/counterfactual-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAgo } from "@/lib/utils";
import { ACTIONS, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/actions")({ component: ActionsPage });

function ActionsPage() {
  const items = useOrchestrator((s) => s.actions);
  const requestAction = useOrchestrator((s) => s.requestAction);
  const decideAction = useOrchestrator((s) => s.decideAction);
  const organPaint = useOrchestrator((s) => s.organPaint);
  const [busy, setBusy] = useState<string | null>(null);
  const organDenies = organPaint === "DENY";
  const organAllows = organPaint === "ALLOW";

  async function request(kind: (typeof ACTIONS)[number]["id"]) {
    setBusy(kind);
    try {
      const rec = requestAction(kind);
      toast("Pending approval", { description: rec.reason });
    } finally {
      setBusy(null);
    }
  }

  async function decide(id: string, approved: boolean) {
    setBusy(id);
    try {
      const rec = await decideAction(id, approved);
      toast(rec.status, { description: rec.reason });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Sequence 5"
        title="Controlled action adapter"
        description="This browser-local software adapter requires both operator approval and explicit organ-cycle ALLOW. UNAVAILABLE cannot execute. Hard denials remain absolute; this is not a production-effect surface."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {ACTIONS.map((a) => (
          <article
            key={a.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium">{a.name}</h2>
              <Badge tone={a.class === "hard-deny" ? "deny" : "pending"}>{a.class}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a.summary}</p>
            <Button
              className="mt-4"
              size="sm"
              variant={a.class === "hard-deny" ? "deny" : "secondary"}
              disabled={!!busy || organDenies}
              onClick={() => request(a.id)}
            >
              Request
            </Button>
          </article>
        ))}
      </div>

      <CounterfactualPanel />

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-subtle">Queue</h2>
        <p role="status" className="text-xs text-muted">Organ cycle: {organPaint}. Bounded software execution requires ALLOW and human approval; production remains HOLD.</p>
        {items.length === 0 ? (
          <p className="text-sm text-muted">No action requests. Try collect, then approve. Then try recon.</p>
        ) : null}
        {items.map((a) => (
          <article
            key={a.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{a.kind}</span>
              <Badge
                tone={
                  a.status === "executed" || a.status === "approved"
                    ? "allow"
                    : a.status === "denied"
                      ? "deny"
                      : "pending"
                }
              >
                {a.status}
              </Badge>
              {a.hard ? <Badge tone="deny">hard</Badge> : null}
              <span className="ml-auto font-mono text-[11px] text-subtle">{formatAgo(a.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{a.reason}</p>
            {a.status === "pending" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!!busy || !organAllows}
                  onClick={() => void decide(a.id, true)}
                >
                  Approve
                </Button>
                <Button size="sm" variant="deny" disabled={!!busy} onClick={() => void decide(a.id, false)}>
                  Deny
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
