import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClock, shortId } from "@/lib/utils";
import { paintLabel, paintTone } from "@/lib/ouroboros/paint";
import { useOrchestrator } from "@/stores/orchestrator";
import { verifyReceiptChain } from "@/lib/covenant/verify-chain";
import type { ChainVerification } from "@/lib/covenant/verify-chain";
import type { Receipt, ReceiptKind } from "@/lib/covenant/types";

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
  const organPaint = useOrchestrator((s) => s.organPaint);
  const organCycle = useOrchestrator((s) => s.organCycle);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [verification, setVerification] = useState<{ receipts: Receipt[]; genesis: string; result: ChainVerification | null } | null>(null);
  const currentVerification = verification?.receipts === receipts && verification.genesis === genesis ? verification : null;

  const shown = receipts.filter((r) => (kind === "all" ? true : r.kind === kind));

  async function verify() {
    const selected = { receipts, genesis, result: null };
    setVerification(selected);
    const result = await verifyReceiptChain(receipts, genesis).catch(() => ({
      ok: false, brokenAt: null, reason: "VERIFICATION_UNAVAILABLE",
    }));
    setVerification((current) => current === selected ? { ...selected, result } : current);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Proof chain"
        title="Exact-effect receipts"
        description="Each sealed receipt hashes its body and the previous hash. Denied operations still emit a receipt — they must not mutate the index. Organ ALLOW chrome is bound to the ouroboros cycle, not this in-plane chain."
        action={
          <Button
            variant="secondary"
            onClick={() => void verify()}
            disabled={currentVerification !== null && currentVerification.result === null}
          >
            Verify bodies and linkage
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
        <Badge tone={paintTone(organPaint)}>
          organ {paintLabel(organPaint, organCycle?.verdict)}
        </Badge>
        <span className="font-mono text-xs text-muted">
          productionPromotion={String(organCycle?.productionPromotion ?? false)} · Λ=CONJECTURE_1
        </span>
      </div>

      <div className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-subtle">Genesis</div>
        <div className="mt-1 break-all font-mono text-xs text-muted">{genesis}</div>
        {currentVerification ? (
          <p className="mt-3 text-sm" role="status">
            {currentVerification.result === null ? "Checking receipt bodies and linkage…" :
              currentVerification.result.ok ? (
                <span className="text-allow">Body hashes and linkage verified · {receipts.length} receipts</span>
              ) : (
                <span className="text-deny">Verification failed: {currentVerification.result.reason}
                  {currentVerification.result.brokenAt === null ? "" : ` at index ${currentVerification.result.brokenAt}`}</span>
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
