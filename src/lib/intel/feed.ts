import type { IntelObservation, IntelTasking, Purpose } from "@/lib/covenant/types";

export const INTEL_FEED: IntelObservation[] = [
  {
    id: "obs-lane-01",
    title: "Public AIS congestion, Singapore Strait",
    region: "1.26N 103.85E",
    kind: "geospatial",
    summary:
      "Simulated open AIS density above 14-day median in a public shipping corridor. Read-only observation. No vessel tasking, no interception.",
    confidence: "medium",
    collectedAt: "2026-08-28T16:40:00.000Z",
    source: "shadowbroker://sim/ais-public",
  },
  {
    id: "obs-wx-02",
    title: "Open weather cell, Gulf of Mexico",
    region: "25.8N 90.0W",
    kind: "geospatial",
    summary:
      "Simulated public weather model output: convective cell tracking east. Connector may store as evidence only after human approval.",
    confidence: "high",
    collectedAt: "2026-08-29T09:12:00.000Z",
    source: "shadowbroker://sim/wx-open",
  },
  {
    id: "obs-osint-03",
    title: "Public model-card revision, Nemotron line",
    region: "open-web",
    kind: "open-source",
    summary:
      "Simulated public release note: specialist open-weights card updated. Belongs on the evaluation plane, not the memory authority.",
    confidence: "high",
    collectedAt: "2026-08-27T12:00:00.000Z",
    source: "shadowbroker://sim/open-models",
  },
  {
    id: "obs-tel-04",
    title: "Connector heartbeat, experimental mesh",
    region: "testnet",
    kind: "telemetry",
    summary:
      "Shadowbroker InfoNet characterized as experimental testnet. Heartbeat only. Active recon and mutation remain denied.",
    confidence: "low",
    collectedAt: "2026-08-29T14:01:00.000Z",
    source: "shadowbroker://sim/mesh-heartbeat",
  },
];

export function evaluateIntelAction(input: {
  action: "read" | "ingest" | "active-recon";
  purpose: Purpose;
  tasking?: Pick<IntelTasking, "status"> | null;
}): { allowed: boolean; reason: string } {
  if (input.action === "active-recon") {
    return { allowed: false, reason: "active recon is out of scope — connector is read-only" };
  }
  if (input.action === "read") {
    if (input.purpose !== "intel-read" && input.purpose !== "policy-review" && input.purpose !== "evaluation") {
      return { allowed: false, reason: `purpose '${input.purpose}' cannot read intel` };
    }
    return { allowed: true, reason: "read-only connector" };
  }
  if (input.purpose === "intel-read") {
    return { allowed: false, reason: "intel-read is non-mutating" };
  }
  if (!input.tasking || input.tasking.status !== "approved") {
    return { allowed: false, reason: "human approval required before ingest" };
  }
  return { allowed: true, reason: "approved tasking may ingest as evidence" };
}
