import type { ActionDef, ActionKind, Purpose } from "@/lib/covenant/types";

export const ACTIONS: ActionDef[] = [
  {
    id: "collect-observation",
    name: "Collect observation",
    class: "bounded",
    requiresApproval: true,
    summary: "Ingest a simulated public observation as evidence. No targeting.",
  },
  {
    id: "rebuild-index",
    name: "Rebuild derived index",
    class: "bounded",
    requiresApproval: true,
    summary: "Drop vxdb-shaped vectors and rebuild from authority. Auditor only.",
  },
  {
    id: "mesh-probe",
    name: "Mesh isolation probe",
    class: "bounded",
    requiresApproval: true,
    summary: "Sandboxed cross-tenant probe. Expected effect: deny.",
  },
  {
    id: "active-recon",
    name: "Active recon",
    class: "hard-deny",
    requiresApproval: true,
    summary: "Out of scope. Hard-denied even with operator approval.",
  },
  {
    id: "foreign-write",
    name: "Foreign-tenant write",
    class: "hard-deny",
    requiresApproval: true,
    summary: "Write into another tenant. Hard-denied. Approval cannot lift isolation.",
  },
  {
    id: "weaponize",
    name: "Weaponize / exploit",
    class: "hard-deny",
    requiresApproval: true,
    summary: "Offensive tooling is not on this plane. Always denied.",
  },
];

export function evaluateAction(input: {
  kind: ActionKind;
  purpose: Purpose;
  approval: "none" | "pending" | "approved" | "denied";
}): { allowed: boolean; reason: string; hard: boolean } {
  const def = ACTIONS.find((a) => a.id === input.kind);
  if (!def) return { allowed: false, reason: "unknown action", hard: true };
  if (def.class === "hard-deny") {
    return {
      allowed: false,
      reason: `${def.id} is hard-denied — approval cannot lift this`,
      hard: true,
    };
  }
  if (input.purpose === "intel-read") {
    return { allowed: false, reason: "intel-read cannot execute actions", hard: true };
  }
  if (def.requiresApproval && input.approval !== "approved") {
    return { allowed: false, reason: "human approval required", hard: false };
  }
  return { allowed: true, reason: `bounded action ${def.id}`, hard: false };
}
