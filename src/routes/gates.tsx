import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GATE_SPECS } from "@/lib/covenant/gates";
import { useOrchestrator } from "@/stores/orchestrator";

export const Route = createFileRoute("/gates")({ component: GatesPage });

function GatesPage() {
  const lastGates = useOrchestrator((s) => s.lastGates);
  const running = useOrchestrator((s) => s.gatesRunning);
  const runReleaseGates = useOrchestrator((s) => s.runReleaseGates);
  const resetPlane = useOrchestrator((s) => s.resetPlane);

  const passed = lastGates?.filter((g) => g.passed).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        kicker="Release gates"
        title="v0.4 is not complete until these pass"
        description="Rounds 1–3: memory, ingest, intel, actions. Round 4: Yachay second brain — handles only, ABSTAIN on miss, no invented nodeIds."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void resetPlane()}>
              Reset plane
            </Button>
            <Button onClick={() => void runReleaseGates()} disabled={running}>
              {running ? "Running…" : "Run gates"}
            </Button>
          </div>
        }
      />

      {lastGates ? (
        <div className="rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
          <span className="font-mono text-2xl tabular">
            {passed}/{lastGates.length}
          </span>
          <span className="ml-3 text-sm text-muted">
            {passed === lastGates.length
              ? "Memory + ingest + intel + actions + adversary gates green"
              : "Failures require repair, not a weaker contract"}
          </span>
        </div>
      ) : null}

      <ol className="space-y-3">
        {(lastGates ?? GATE_SPECS.map((s) => ({ ...s, passed: false, evidence: "not run" }))).map((g, i) => (
          <li
            key={g.id}
            className="rounded-xl bg-bg-elevated p-5 shadow-[inset_0_0_0_1px_var(--color-border)]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
              {"round" in g && g.round ? (
                <Badge>{`r${g.round}`}</Badge>
              ) : i < 10 ? (
                <Badge>r1</Badge>
              ) : i < 15 ? (
                <Badge>r2</Badge>
              ) : i < 20 ? (
                <Badge>r3</Badge>
              ) : (
                <Badge>r4</Badge>
              )}
              <h2 className="text-sm font-medium">{g.title}</h2>
              {lastGates ? (
                <Badge className="ml-auto" tone={g.passed ? "allow" : "deny"}>
                  {g.passed ? "pass" : "fail"}
                </Badge>
              ) : (
                <Badge className="ml-auto">pending</Badge>
              )}
            </div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-muted">{g.evidence}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
