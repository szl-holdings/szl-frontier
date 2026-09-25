import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { programSummary } from "@/lib/frontier/codex-program";
import { observeEstate } from "@/lib/frontier/estate-observe";
import { mintMembershipIdentityPin } from "@/lib/frontier/estate-pin";
import { SOURCE, healthPayload, readyPayload, sourcePayload } from "@/lib/frontier/source";
import { composeTriad, spaceTriadContract } from "@/lib/frontier/triad";
import { WORKSTREAMS, workstreamSummary } from "@/lib/frontier/workstreams";

export function HoldStrip({ optedIn, onOptedIn }: { optedIn: boolean; onOptedIn: (next: boolean) => void }) {
  const summary = workstreamSummary();
  return (
    <section className="space-y-3" aria-label="Production disposition">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Disposition" v="HOLD" h="automatic promotion false" />
        <Stat k="Reconciled head" v={SOURCE.reconciledHead.slice(0, 8)} h={SOURCE.repository} />
        <Stat k="Workstreams" v={`${summary.selectedForRelease}/${summary.total}`} h="selected for eval, not production" />
        <Stat k="Λ" v="Conjecture 1" h="never a theorem" />
      </div>
      <label className="flex flex-col gap-2 rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Optional evaluation</span>
          <span className="mt-1 block text-sm text-muted">
            {optedIn
              ? "THIS_ORGAN lanes may compose and pin. Production stays HOLD. HANDOFF stays with the named owner."
              : "Off. Triad compose and membership pin stay contract-only."}
          </span>
        </span>
        <span className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={optedIn}
            onChange={(e) => onOptedIn(e.target.checked)}
          />
          {optedIn ? "Admitted · HOLD" : "Off · contract only"}
        </span>
      </label>
    </section>
  );
}

export function TriadPanel({ optedIn }: { optedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof composeTriad>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setDoc(await composeTriad({ catalogLoaded: WORKSTREAMS.length === 34, engineHydratable: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          health ≠ ready ≠ source. Health means the process is up. Ready means the operator plane can hydrate.
          Neither authorizes production. Envelope authority stays NONE.
        </p>
        <Button disabled={busy || !optedIn} onClick={() => void load()}>
          {busy ? "Composing…" : !optedIn ? "Opt in to compose" : doc ? "Recompose triad" : "Compose triad"}
        </Button>
      </div>
      {error ? <p className="text-sm text-deny">Triad failed closed: {error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat k="Health schema" v={healthPayload().schema.replace("szl.frontier.", "")} h="not readiness" />
        <Stat k="Ready schema" v={readyPayload({ catalogLoaded: true, engineHydratable: true }).schema.replace("szl.frontier.", "")} h="productionReady=false" />
        <Stat k="Source schema" v={sourcePayload().schema.replace("szl.frontier.", "")} h={`files_read=${sourcePayload().sourceContentFilesRead ?? 0}`} />
      </div>
      <p className="text-xs text-muted">
        Space triad contract lists {spaceTriadContract().surfaces.length} surfaces. runtimeVerified=false on every row.
        {!optedIn ? " Optional evaluation is off." : ""}
      </p>
      {doc ? (
        <Card>
          <CardHeader>
            <CardTitle>Sealed envelopes</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row k="Health digest" v={doc.envelopes.health.digestSha256.slice(0, 16)} />
            <Row k="Ready digest" v={doc.envelopes.ready.digestSha256.slice(0, 16)} />
            <Row k="Source digest" v={doc.envelopes.source.digestSha256.slice(0, 16)} />
            <Row k="Authority" v={doc.envelopes.health.authority} />
            <Row k="Spaces in contract" v={String(doc.spaces.surfaces.length)} />
            <p className="text-xs text-muted">{doc.spaces.note}</p>
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-muted">Compose to seal three SOFTWARE envelopes. Presence is not authority.</p>
      )}
    </div>
  );
}

export function PinPanel({ optedIn }: { optedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<string>("");

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const estate = await observeEstate();
      const pin = await mintMembershipIdentityPin([
        { family: "github", status: estate.github.status, ids: estate.github.items.map((row) => row.id) },
        { family: "models", status: estate.huggingface.models.status, ids: estate.huggingface.models.items.map((row) => row.id) },
        { family: "datasets", status: estate.huggingface.datasets.status, ids: estate.huggingface.datasets.items.map((row) => row.id) },
        { family: "spaces", status: estate.huggingface.spaces.status, ids: estate.huggingface.spaces.items.map((row) => row.id) },
        { family: "kernels", status: estate.huggingface.kernels.status, ids: estate.huggingface.kernels.items.map((row) => row.id) },
      ]);
      setDigest(pin.digestSha256);
      setCounts(
        pin.families
          .map((family) => `${family.family}=${family.count === null ? "UNKNOWN" : family.count}`)
          .join(" · "),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Membership identity pin of public ids. Not a tree hash. Not a file audit. HEAD_SHA_PIN is refused without revisions.
        </p>
        <Button disabled={busy || !optedIn} onClick={() => void mint()}>
          {busy ? "Pinning…" : !optedIn ? "Opt in to mint" : digest ? "Remint pin" : "Mint membership pin"}
        </Button>
      </div>
      {error ? <p className="text-sm text-deny">Pin failed closed: {error}</p> : null}
      <Stat k="Membership pin" v={digest ? digest.slice(0, 16) : "UNMINTED"} h={counts || "file_audit_complete=false"} />
      <Button variant="secondary" asChild>
        <a href="/api/pin">GET /api/pin</a>
      </Button>
    </div>
  );
}

export function CodexPanel({ optedIn }: { optedIn: boolean }) {
  const summary = programSummary();
  const mine = summary.lanes.filter((lane) => lane.scope === "THIS_ORGAN");
  const handoff = summary.lanes.filter((lane) => lane.scope === "HANDOFF");

  function download() {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "szl-frontier-codex-upgrade-program.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Lanes" v={String(summary.total)} h="26 locked" />
        <Stat k="This organ" v={String(summary.thisOrgan)} h="evaluation only" />
        <Stat k="Handoff" v={String(summary.handoff)} h="existing owners" />
        <Stat k="Promotion" v={summary.promotionEffect} h="HOLD cannot lift" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download}>Export program JSON</Button>
        <Button variant="secondary" asChild>
          <a href="/api/codex">GET /api/codex</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="/frontier/codex-upgrade-program.v1.json">Public contract</a>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>THIS_ORGAN</CardTitle>
        </CardHeader>
        <CardBody>
          <EstateTable
            heads={["Lane", "Title", "Forbidden"]}
            rows={mine.map((lane) => [lane.id, lane.title, lane.forbidden])}
            empty="No this-organ lanes."
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>HANDOFF</CardTitle>
        </CardHeader>
        <CardBody>
          <EstateTable
            heads={["Lane", "Title", "Owners"]}
            rows={handoff.map((lane) => [lane.id, lane.title, lane.owners.join(", ")])}
            empty="No handoff lanes."
          />
        </CardBody>
      </Card>
      <p className="text-xs text-muted">{summary.note} Optional evaluation {optedIn ? "admitted for THIS_ORGAN" : "off"}. Promotion cannot lift HOLD.</p>
    </div>
  );
}

function Stat({ k, v, h }: { k: string; v: string; h: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-border)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{k}</div>
      <div className="mt-2 font-mono text-xl tabular tracking-tight">{v}</div>
      <div className="mt-1 text-xs text-muted">{h}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="font-mono text-xs">{v}</span>
    </div>
  );
}

function EstateTable({
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
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.14em] text-subtle">
            {heads.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 40).map((r) => (
            <tr key={r.join("|")} className="border-t border-border">
              {r.map((c, i) => (
                <td key={i} className={`py-2 pr-4 ${i === 0 ? "font-mono text-xs" : "text-muted"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
