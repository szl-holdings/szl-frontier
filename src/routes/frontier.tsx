import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { expandFrontierIdea } from "@/lib/ai/expand-idea";
import { PROJECTS, useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/frontier")({ component: FrontierPage });

function FrontierPage() {
  const ideas = useOrchestrator((s) => s.ideas);
  const generateIdeas = useOrchestrator((s) => s.generateIdeas);
  const setIdeaExpansion = useOrchestrator((s) => s.setIdeaExpansion);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function expand(id: string) {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;
    setBusyId(id);
    try {
      const res = await expandFrontierIdea({
        data: {
          project: idea.project,
          theme: idea.theme,
          description: idea.description,
          hooks: [...idea.governanceHooks, ...idea.orchestrationHooks],
        },
      });
      if (!res.ok) {
        toast("Expansion unavailable", { description: res.error });
        return;
      }
      setIdeaExpansion(id, res.text);
      toast("Idea compiled");
    } finally {
      setBusyId(null);
    }
  }

  function downloadPayload() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            contract: "szl-frontier/1.0",
            projects: PROJECTS,
            ideas,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "szl-frontier-payload.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Frontier lab"
        title="Systems under study"
        description="Normalize project metadata, run the idea kernel, compile proposals. vxdb is the memory substrate. Shadowbroker is a later read-only intel connector. NVIDIA open models are a reference, not a repo."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={generateIdeas}>
              Run kernel
            </Button>
            <Button onClick={downloadPayload}>Export payload</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PROJECTS.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{p.name}</CardTitle>
                <Badge tone={p.kind === "reference" ? "pending" : "accent"}>{p.kind}</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm leading-relaxed text-muted">{p.notes}</p>
              <p className="text-sm">{p.roleInSzl}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.domainTags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium tracking-[0.16em] text-subtle uppercase">Ideas</h2>
        {ideas.map((idea) => (
          <article
            key={idea.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{idea.project}</span>
              <Badge>{idea.theme}</Badge>
              <Badge tone={idea.riskLevel === "high" ? "deny" : idea.riskLevel === "medium" ? "pending" : "allow"}>
                {idea.riskLevel}
              </Badge>
              <Badge>{idea.feasibilityHorizon}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{idea.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {idea.governanceHooks.concat(idea.orchestrationHooks).map((h) => (
                <Badge key={h}>{h}</Badge>
              ))}
            </div>
            {idea.expansion ? (
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-bg p-4 text-sm leading-relaxed shadow-[inset_0_0_0_1px_var(--color-border)]">
                {idea.expansion}
              </div>
            ) : (
              <Button
                className="mt-4"
                size="sm"
                variant="secondary"
                disabled={busyId === idea.id}
                onClick={() => expand(idea.id)}
              >
                {busyId === idea.id ? "Compiling…" : "Compile with Grok"}
              </Button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
