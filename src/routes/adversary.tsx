import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAgo } from "@/lib/utils";
import { SCENARIOS, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/adversary")({ component: AdversaryPage });

function AdversaryPage() {
  const runs = useOrchestrator((s) => s.adversaryRuns);
  const fireScenario = useOrchestrator((s) => s.fireScenario);
  const fireCampaign = useOrchestrator((s) => s.fireCampaign);
  const [busy, setBusy] = useState<string | null>(null);

  async function one(id: string) {
    setBusy(id);
    try {
      const r = await fireScenario(id);
      toast(r.passed ? "Hold" : "Break", { description: r.evidence });
    } finally {
      setBusy(null);
    }
  }

  async function all() {
    setBusy("all");
    try {
      const rs = await fireCampaign();
      const n = rs.filter((r) => r.passed).length;
      toast(`${n}/${rs.length} held`, { description: "Campaign complete against live plane" });
    } finally {
      setBusy(null);
    }
  }

  const latest = new Map(runs.map((r) => [r.scenarioId, r]));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Sequence 6"
        title="Adversarial governance"
        description="Continuous tests against the live plane. A pass means the covenant held. Failures require repair — not a weaker contract."
        action={
          <Button onClick={() => void all()} disabled={!!busy}>
            {busy === "all" ? "Running…" : "Run campaign"}
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {SCENARIOS.map((s) => {
          const last = latest.get(s.id);
          return (
            <article
              key={s.id}
              className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-subtle">{s.id}</span>
                <h2 className="text-sm font-medium">{s.title}</h2>
                {last ? (
                  <Badge className="ml-auto" tone={last.passed ? "allow" : "deny"}>
                    {last.passed ? "hold" : "break"}
                  </Badge>
                ) : (
                  <Badge className="ml-auto">idle</Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.intent}</p>
              {last ? <p className="mt-2 font-mono text-[11px] text-subtle">{last.evidence}</p> : null}
              <Button
                className="mt-4"
                size="sm"
                variant="secondary"
                disabled={!!busy}
                onClick={() => void one(s.id)}
              >
                Fire
              </Button>
            </article>
          );
        })}
      </div>

      {runs.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-subtle">Log</h2>
          {runs.slice(0, 12).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-bg-elevated px-5 py-3 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <Badge tone={r.passed ? "allow" : "deny"}>{r.passed ? "hold" : "break"}</Badge>
              <span className="text-sm">{r.title}</span>
              <span className="min-w-0 flex-1 font-mono text-[11px] text-subtle">{r.evidence}</span>
              <span className="font-mono text-[11px] text-subtle">{formatAgo(r.at)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
