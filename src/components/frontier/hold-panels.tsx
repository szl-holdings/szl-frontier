import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { kernelFamilyCatalog } from "@/lib/frontier/kernel-family";
import { evaluationLeaseBook } from "@/lib/frontier/leases";
import { planEvaluationTurn, step } from "@/lib/frontier/agent-state";

function Stat({ k, v, h }: { k: string; v: string; h: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-subtle">{k}</div>
      <div className="mt-1 font-mono text-sm">{v}</div>
      <div className="text-xs text-muted">{h}</div>
    </div>
  );
}

function Table({
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
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h} className="pb-2 text-[10px] uppercase tracking-[0.14em] text-subtle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="py-2 font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TriadPanel() {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/triad", { cache: "no-store" });
      setBody(JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNAVAILABLE");
    }
  }
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        health ≠ ready ≠ source. Running is not ready. HTTP 200 is not production.
        Pin and Codex endpoints stay EVALUATION. Envelope authority is NONE.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void load()}>Load /api/triad</Button>
        <Button variant="secondary" asChild>
          <a href="/api/pin">/api/pin</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="/api/codex">/api/codex</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="/api/source">/api/source</a>
        </Button>
      </div>
      {error ? <p className="text-sm text-deny">{error}</p> : null}
      {body ? (
        <pre className="max-h-96 overflow-auto rounded-xl bg-bg-elevated p-4 text-xs leading-relaxed">{body}</pre>
      ) : (
        <p className="text-sm text-muted">No triad payload in this session.</p>
      )}
    </div>
  );
}

export function KernelsPanel() {
  const catalog = kernelFamilyCatalog();
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Org card" v={String(catalog.orgCardCount)} h="software, not trained" />
        <Stat k="Tag-typed" v={String(catalog.taggedCount)} h="model tags library=kernels" />
        <Stat k="Conflict" v={catalog.conflict} h="chosen value none" />
        <Stat k="Trained" v="false" h="kernel ≠ neural model" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tag-typed kernel ids (HOLD extra)</CardTitle>
        </CardHeader>
        <CardBody>
          <Table
            heads={["repo_id", "kind"]}
            rows={catalog.taggedIds.map((id) => [id, "KERNEL_SOFTWARE"])}
            empty="No kernel ids."
          />
        </CardBody>
      </Card>
      <p className="text-xs text-muted">{catalog.note}</p>
    </div>
  );
}

export function LeasesPanel() {
  const book = evaluationLeaseBook();
  const planned = planEvaluationTurn();
  const stopped = step(planned, "STOPPED");
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Capability leases expire. Agent state can stop before tools. Neither object publishes
        a-11-oy.com or lifts HOLD.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Stat k="Agent phase" v={stopped.phase} h="toolsMayRun false" />
        <Stat k="Leases" v={String(book.leases.length)} h="publisher deploy REVOKED" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Evaluation lease book</CardTitle>
        </CardHeader>
        <CardBody>
          <Table
            heads={["capability", "state", "target"]}
            rows={book.leases.map((l) => [l.capability, l.state, l.allowedTargets.join(",")])}
            empty="No leases."
          />
        </CardBody>
      </Card>
    </div>
  );
}
