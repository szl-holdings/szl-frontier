import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatAgo } from "@/lib/utils";
import type { ModelRoute } from "@/lib/covenant/types";
import { MODELS, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/models")({ component: ModelsPage });

const TASKS: ModelRoute["task"][] = ["recall", "expand", "classify", "evaluate"];

function ModelsPage() {
  const routes = useOrchestrator((s) => s.modelRoutes);
  const routeTask = useOrchestrator((s) => s.routeTask);
  const [task, setTask] = useState<ModelRoute["task"]>("recall");
  const [model, setModel] = useState("lexhash-v1");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const rec = await routeTask(task, model);
      toast(rec.allowed ? "Routed" : "Denied", { description: rec.reason });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Sequence 3"
        title="Model registry"
        description="Recall must use the current embedder generation. Retired lexhash cannot serve. Shadow specialists are evaluation-only. Grok compiles ideas; it does not bypass the covenant."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {MODELS.map((m) => (
          <article
            key={m.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium">{m.name}</h2>
              <Badge>{m.kind}</Badge>
              <Badge tone={m.status === "active" ? "allow" : m.status === "retired" ? "deny" : "pending"}>
                {m.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{m.mandate}</p>
            <div className="mt-2 font-mono text-[11px] text-subtle">{m.revision}</div>
          </article>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route a task</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
            Task
            <Select className="mt-1.5" value={task} onChange={(e) => setTask(e.target.value as ModelRoute["task"])}>
              {TASKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
            Model
            <Select className="mt-1.5" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" disabled={busy} onClick={() => void run()}>
              Evaluate route
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-subtle">Decisions</h2>
        {routes.length === 0 ? (
          <p className="text-sm text-muted">Try recall on retired lexhash-v0 — it must deny.</p>
        ) : null}
        {routes.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <span className="font-mono text-xs">{r.task}</span>
            <span className="text-sm">{r.requestedModel}</span>
            <Badge tone={r.allowed ? "allow" : "deny"}>{r.allowed ? "allow" : "deny"}</Badge>
            <span className="min-w-0 flex-1 text-sm text-muted">{r.reason}</span>
            <span className="font-mono text-[11px] text-subtle">{formatAgo(r.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
