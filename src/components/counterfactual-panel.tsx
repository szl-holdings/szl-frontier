import { useState } from "react";
import { ACTIONS } from "@/lib/actions/adapter";
import type { ActionKind } from "@/lib/covenant/types";
import type { PreviewApproval } from "@/lib/actions/counterfactual";
import type { Paint } from "@/lib/ouroboros/paint";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type PreviewReport = {
  schema: "szl.covenant.counterfactual/v1";
  kind: "READ_ONLY_COUNTERFACTUAL";
  actualState: { policyResult: "DENY"; reason: string };
  hypotheticalState: {
    softwareWouldAllow: boolean;
    policyReason: string;
    minimumSoftwareBlockers: string[];
  };
  productionBlockers: string[];
  executionAuthorized: false;
  effectCommitted: false;
  witnessVerified: false;
  productionReady: false;
  reportSha256: string;
};

function isSafeReport(input: unknown): input is PreviewReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const data = input as Record<string, unknown>;
  return data.schema === "szl.covenant.counterfactual/v1"
    && data.kind === "READ_ONLY_COUNTERFACTUAL"
    && data.executionAuthorized === false
    && data.effectCommitted === false
    && data.witnessVerified === false
    && data.productionReady === false
    && typeof data.reportSha256 === "string"
    && /^[0-9a-f]{64}$/.test(data.reportSha256)
    && !!data.actualState && !!data.hypotheticalState
    && Array.isArray(data.productionBlockers);
}

export function CounterfactualPanel() {
  const [kind, setKind] = useState<ActionKind>("collect-observation");
  const [assumedApproval, setAssumedApproval] = useState<PreviewApproval>("approved");
  const [assumedOrganPaint, setAssumedOrganPaint] = useState<Paint>("ALLOW");
  const [result, setResult] = useState<PreviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function evaluate() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const request = await fetch("/api/action-preview", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({ kind, assumedApproval, assumedOrganPaint }),
      });
      if (!request.ok) throw new Error(`Server refused preview (HTTP ${request.status})`);
      const data: unknown = await request.json();
      if (!isSafeReport(data)) throw new Error("Server response lacks complete non-authorizing evidence");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preview evidence unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Counterfactual authorization analysis</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted">
          Inspect a proposed change in evidence and approval, without performing it.
          The backend binds this scenario to its server-side caller context.
          Neither a hypothetical ALLOW nor a report hash grants production permission.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">Action
            <Select className="mt-1.5" value={kind} onChange={(event) => setKind(event.target.value as ActionKind)}>
              {ACTIONS.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}
            </Select>
          </label>
          <label className="text-xs text-muted">Assumed approval
            <Select className="mt-1.5" value={assumedApproval} onChange={(event) => setAssumedApproval(event.target.value as PreviewApproval)}>
              {(["none", "pending", "approved", "denied"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </label>
          <label className="text-xs text-muted">Assumed organ cycle
            <Select className="mt-1.5" value={assumedOrganPaint} onChange={(event) => setAssumedOrganPaint(event.target.value as Paint)}>
              {(["UNAVAILABLE", "DENY", "ALLOW"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </label>
        </div>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void evaluate()}>
          {pending ? "Evaluating…" : "Evaluate without executing"}
        </Button>
        {error && <p role="alert" className="text-sm text-deny">{error}</p>}
        {result && (
          <section role="status" aria-live="polite" className="space-y-2 rounded-md border border-border p-4">
            <p className="text-sm font-semibold">Actual backend posture: DENY · production HOLD</p>
            <p className="text-xs text-muted">What-if software policy: {result.hypotheticalState.softwareWouldAllow ? "WOULD_ALLOW" : "WOULD_DENY"} — {result.hypotheticalState.policyReason}</p>
            <p className="text-xs text-muted">Software blockers: {result.hypotheticalState.minimumSoftwareBlockers.join(", ") || "none in this hypothetical scenario"}</p>
            <p className="text-xs text-muted">Production blockers: {result.productionBlockers.join(", ")}</p>
            <p className="text-xs text-muted">Executed: NO · Witness verified: NO · Effect committed: NO</p>
            <p className="break-all font-mono text-[10px] text-subtle">Unsigned report SHA-256: {result.reportSha256}</p>
          </section>
        )}
      </CardBody>
    </Card>
  );
}
