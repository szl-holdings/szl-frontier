import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateHarborBatch, type HarborVerdict } from "@/lib/harbor/evaluate";
import { useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/harbor")({ component: HarborPage });

function HarborPage() {
  const writeMemory = useOrchestrator((s) => s.writeMemory);
  const receipts = useOrchestrator((s) => s.receipts);
  const [verdicts, setVerdicts] = useState<HarborVerdict[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const batch = evaluateHarborBatch();
      for (const v of batch) {
        const res = await writeMemory({
          content: v.content,
          memoryClass: "decision_memory",
          sensitivity: v.allowed ? "internal" : "confidential",
          sourceRefs: v.sourceRefs,
        });
        toast(v.disposition, { description: `${v.reason} receipt ${res.receipt.id}` });
      }
      setVerdicts(batch);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Harbor · evaluation plane"
        title="Exact source. EVALUATION / HOLD. Promotion NONE."
        description="One fail-closed evaluation through the Memory Covenant. Estate covenant card may HOLD. Private Dataset without credentials fail-closes. Foreign Hub objects deny. This does not install weights or promote production."
        action={
          <Button disabled={busy} onClick={() => void run()}>
            {busy ? "Sealing…" : "Evaluate three sources"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat k="Disposition default" v="HOLD" h="production unpromoted" />
        <Stat k="Promotion" v="NONE" h="gates incomplete on purpose" />
        <Stat k="Receipts on plane" v={String(receipts.length)} h="covenant chain" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last Harbor batch</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {verdicts.length === 0 ? (
            <p className="text-sm text-muted">Run the three-source evaluation. Results seal as decision_memory.</p>
          ) : null}
          {verdicts.map((v) => (
            <div key={v.sourceId} className="rounded-lg bg-bg p-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={v.disposition === "DENIED" || v.disposition === "FAIL_CLOSED" ? "deny" : "allow"}>
                  {v.disposition}
                </Badge>
                <span className="text-sm">{v.title}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted">{v.exactSource}</p>
              <p className="mt-1 text-sm text-muted">{v.reason}</p>
            </div>
          ))}
        </CardBody>
      </Card>
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
