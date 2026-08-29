import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { IdentityBar } from "@/components/identity-bar";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MEMORY_CLASSES, SENSITIVITIES, type MemoryClass, type Sensitivity } from "@/lib/covenant/types";
import { formatAgo, shortId } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/memory")({ component: MemoryPage });

function MemoryPage() {
  const memories = useOrchestrator((s) => s.memories);
  const session = useOrchestrator((s) => s.session);
  const writeMemory = useOrchestrator((s) => s.writeMemory);
  const searchMemory = useOrchestrator((s) => s.searchMemory);
  const tombstone = useOrchestrator((s) => s.tombstone);
  const quarantine = useOrchestrator((s) => s.quarantine);
  const lastTrace = useOrchestrator((s) => s.lastWriteTrace);
  const lastSearch = useOrchestrator((s) => s.lastSearch);
  const [content, setContent] = useState("");
  const [source, setSource] = useState("operator://note");
  const [klass, setKlass] = useState<MemoryClass>("evidence_memory");
  const [sens, setSens] = useState<Sensitivity>("internal");
  const [query, setQuery] = useState("covenant vxdb provenance");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | MemoryRecordFilter>("all");

  async function onWrite() {
    setBusy(true);
    try {
      const res = await writeMemory({
        content,
        memoryClass: klass,
        sensitivity: sens,
        sourceRefs: source.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast(res.allowed ? "Receipt sealed" : "Write denied", { description: res.reason });
      if (res.allowed) setContent("");
    } finally {
      setBusy(false);
    }
  }

  async function onSearch() {
    setBusy(true);
    try {
      const res = await searchMemory(query);
      toast(`Returned ${res.hits.length}`, { description: `Rejected ${res.rejected.length} by authority` });
    } finally {
      setBusy(false);
    }
  }

  const shown = memories
    .slice()
    .reverse()
    .filter((m) => m.envelope.tenantId === session.tenantId)
    .filter((m) => (filter === "all" ? true : m.lifecycle === filter));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="A11oy Memory Covenant"
        title="Write, recall, prove"
        description="Every operation is evaluated deny-by-default, classified, hashed, committed, then indexed. Search always re-checks authority after the derived index."
      />
      <IdentityBar />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admit memory</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
                Class
                <Select className="mt-1.5" value={klass} onChange={(e) => setKlass(e.target.value as MemoryClass)}>
                  {MEMORY_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
                Sensitivity
                <Select className="mt-1.5" value={sens} onChange={(e) => setSens(e.target.value as Sensitivity)}>
                  {SENSITIVITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <Textarea
              placeholder="Durable fact, decision, or working note. Injection attempts are quarantined."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Input
              placeholder="source refs, comma separated"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <Button onClick={onWrite} disabled={busy || !content.trim()} className="w-full sm:w-auto">
              Commit write
            </Button>
            {lastTrace ? (
              <ol className="flex flex-wrap gap-1.5 pt-1">
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
            <CardTitle>Governed recall</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="hybrid search" />
            <Button variant="secondary" onClick={onSearch} disabled={busy} className="w-full sm:w-auto">
              Search under this principal
            </Button>
            {lastSearch ? (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {lastSearch.hits.length} returned · {lastSearch.rejected.length} rejected · receipt{" "}
                  <span className="font-mono">{shortId(lastSearch.receipt.id)}</span>
                </p>
                {lastSearch.hits.map((h) => (
                  <div key={h.memory.id} className="rounded-md bg-bg p-3 shadow-[inset_0_0_0_1px_var(--color-border)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-subtle">{shortId(h.memory.id)}</span>
                      <span className="font-mono text-[11px] text-accent">{h.score.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed">{h.memory.envelope.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Switch tenant to Adversary Sim and search the same query — foreign candidates stay at zero.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "active", "tombstoned", "expired", "quarantined"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {shown.map((m) => (
          <article
            key={m.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-subtle">{m.id}</span>
              <Badge>{m.envelope.memoryClass.replace("_memory", "")}</Badge>
              <Badge tone={m.lifecycle === "active" ? "allow" : "deny"}>{m.lifecycle}</Badge>
              <Badge>{m.envelope.sensitivity}</Badge>
              <span className="ml-auto font-mono text-[11px] text-subtle">{formatAgo(m.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{m.envelope.content}</p>
            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] text-subtle">
              <span>sha {shortId(m.envelope.contentSha256, 10)}</span>
              <span>{m.envelope.tenantId}</span>
              <span>{m.envelope.agentId}</span>
              {m.envelope.sourceRefs.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            {m.lifecycle === "active" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => tombstone(m.id)}>
                  Tombstone
                </Button>
                <Button size="sm" variant="deny" onClick={() => quarantine(m.id)}>
                  Quarantine
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

type MemoryRecordFilter = "active" | "tombstoned" | "expired" | "quarantined";
