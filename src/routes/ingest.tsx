import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { IdentityBar } from "@/components/identity-bar";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { formatAgo } from "@/lib/utils";
import { INGEST_CATALOG, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/ingest")({ component: IngestPage });

function IngestPage() {
  const jobs = useOrchestrator((s) => s.ingestJobs);
  const ingestSource = useOrchestrator((s) => s.ingestSource);
  const lastTrace = useOrchestrator((s) => s.lastWriteTrace);
  const [title, setTitle] = useState("");
  const [uri, setUri] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(input: { title: string; sourceUri: string; excerpt: string }) {
    setBusy(true);
    try {
      const job = await ingestSource(input);
      toast(job.status, { description: job.reason });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Sequence 2"
        title="Governed ingestion"
        description="Sources enter through the Memory Gateway. Injection is quarantined. Nothing is indexed until a receipt is sealed. Lyte Ops owns research ingest; other principals are bound by the same covenant."
      />
      <IdentityBar />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admit a source</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="source uri" value={uri} onChange={(e) => setUri(e.target.value)} />
            <Textarea
              placeholder="excerpt — the durable fact to hash"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
            <Button
              disabled={busy || !title.trim() || !excerpt.trim() || !uri.trim()}
              onClick={() => run({ title, sourceUri: uri, excerpt })}
            >
              Ingest through covenant
            </Button>
            {lastTrace ? (
              <ol className="flex flex-wrap gap-1.5">
                {lastTrace.map((s) => (
                  <li key={s}>
                    <Badge tone={s.includes("DENIED") ? "deny" : s === "RECEIPT_SEALED" ? "allow" : "default"}>
                      {s.replaceAll("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ol>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {INGEST_CATALOG.map((s) => (
              <div key={s.id} className="rounded-lg bg-bg p-3 shadow-[inset_0_0_0_1px_var(--color-border)]">
                <div className="text-sm font-medium">{s.title}</div>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{s.excerpt}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => run({ title: s.title, sourceUri: s.sourceUri, excerpt: s.excerpt })}
                >
                  Ingest
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-subtle">Jobs</h2>
        {jobs.length === 0 ? <p className="text-sm text-muted">No ingest jobs yet.</p> : null}
        {jobs.map((j) => (
          <article
            key={j.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{j.title}</span>
              <Badge
                tone={
                  j.status === "committed" ? "allow" : j.status === "quarantined" || j.status === "denied" ? "deny" : "pending"
                }
              >
                {j.status}
              </Badge>
              <span className="ml-auto font-mono text-[11px] text-subtle">{formatAgo(j.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{j.reason}</p>
            <div className="mt-2 font-mono text-[11px] text-subtle">
              {j.sourceUri}
              {j.memoryId ? ` · ${j.memoryId}` : ""}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
