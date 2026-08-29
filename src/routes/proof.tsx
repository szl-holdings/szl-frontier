import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClock, shortId } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";
import type { ReceiptKind } from "@/lib/covenant/types";

export const Route = createFileRoute("/proof")({ component: ProofPage });

const KINDS: Array<ReceiptKind | "all"> = [
  "all",
  "policy-decision",
  "write-effect",
  "retrieval-result",
  "deletion-effect",
  "index-reconciliation",
  "mesh-dispatch",
  "ingest-effect",
  "model-route",
  "intel-tasking",
  "action-effect",
  "adversary-run",
  "brain-pulse",
];

function ProofPage() {
  const receipts = useOrchestrator((s) => s.receipts);
  const genesis = useOrchestrator((s) => s.genesisHash);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [broken, setBroken] = useState<number | null | undefined>(undefined);

  const shown = receipts.filter((r) => (kind === "all" ? true : r.kind === kind));

  const chainOk = useMemo(() => {
    let prev = genesis;
    for (let i = 0; i < receipts.length; i++) {
      if (receipts[i].prevHash !== prev) return i;
      prev = receipts[i].hash;
    }
    return null;
  }, [receipts, genesis]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Proof chain"
        title="Exact-effect receipts"
        description="Each sealed receipt hashes its body and the previous hash. Denied operations still emit a receipt — they must not mutate the index."
        action={
          <Button
            variant="secondary"
            onClick={() => setBroken(chainOk)}
          >
            Verify linkage
          </Button>
        }
      />

      <div className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-subtle">Genesis</div>
        <div className="mt-1 break-all font-mono text-xs text-muted">{genesis}</div>
        {broken !== undefined ? (
          <p className="mt-3 text-sm">
            {broken === null ? (
              <span className="text-allow">Chain intact · {receipts.length} receipts</span>
            ) : (
              <span className="text-deny">Broken at index {broken}</span>
            )}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
            {k}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {shown
          .slice()
          .reverse()
          .map((r) => (
            <article
              key={r.id}
              className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-subtle">#{r.seq}</span>
                <Badge>{r.kind}</Badge>
                <Badge tone={r.allowed ? "allow" : "deny"}>{r.allowed ? "allow" : "deny"}</Badge>
                <span className="ml-auto font-mono text-[11px] text-subtle">{formatClock(r.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm">
                {r.operation} — {r.effect}
              </div>
              <p className="mt-1 text-sm text-muted">{r.reason}</p>
              <div className="mt-3 grid gap-1 font-mono text-[11px] text-subtle">
                <div>id {r.id}</div>
                <div>prev {shortId(r.prevHash, 16)}</div>
                <div>hash {shortId(r.hash, 16)}</div>
                <div>
                  {r.identity.agentId} · {r.identity.tenantId} · {r.identity.purpose}
                </div>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
