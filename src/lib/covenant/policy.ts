import type {
  Identity,
  MemoryClass,
  MemoryRecord,
  Purpose,
  Sensitivity,
} from "./types";
import { SENSITIVITIES } from "./types";

export const POLICY_BUNDLE_ID = "covenant-v0.1";

export const RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
};

export const AUDITOR_AGENT = "covenant-auditor";

const WRITE_PURPOSES: Purpose[] = [
  "evidence-write",
  "policy-review",
  "mesh-dispatch",
  "evaluation",
  "ingest",
  "action-execute",
];

const READ_PURPOSES: Purpose[] = [
  "governed-recall",
  "policy-review",
  "evaluation",
  "mesh-dispatch",
  "adversarial-test",
  "ingest",
  "intel-read",
];

export function canWriteClass(agentId: string, memoryClass: MemoryClass): boolean {
  if (memoryClass === "policy_memory") return agentId === AUDITOR_AGENT;
  if (memoryClass === "quarantine_memory") {
    return agentId === AUDITOR_AGENT || agentId === "aegis-watch";
  }
  return true;
}

export function evaluateWrite(input: {
  identity: Identity;
  tenantId: string;
  securityDomain: string;
  memoryClass: MemoryClass;
  sensitivity: Sensitivity;
}): { allowed: boolean; reason: string } {
  if (input.identity.tenantId !== input.tenantId) {
    return { allowed: false, reason: "cross-tenant write denied" };
  }
  if (input.identity.securityDomain !== input.securityDomain) {
    return { allowed: false, reason: "security-domain mismatch" };
  }
  if (!WRITE_PURPOSES.includes(input.identity.purpose) && input.identity.purpose !== "adversarial-test") {
    return { allowed: false, reason: `purpose '${input.identity.purpose}' cannot write` };
  }
  if (!canWriteClass(input.identity.agentId, input.memoryClass)) {
    return {
      allowed: false,
      reason: `${input.memoryClass} is read-only for agent ${input.identity.agentId}`,
    };
  }
  return { allowed: true, reason: "policy allowed" };
}

export function evaluateRead(
  identity: Identity,
  record: MemoryRecord,
  agentClearance: Sensitivity,
  minProvenance: "none" | "hashed" = "hashed",
): { allowed: boolean; reason: string } {
  if (!READ_PURPOSES.includes(identity.purpose)) {
    return { allowed: false, reason: `purpose '${identity.purpose}' cannot read` };
  }
  if (record.envelope.tenantId !== identity.tenantId) {
    return { allowed: false, reason: "cross-tenant isolation" };
  }
  const auditor = identity.agentId === AUDITOR_AGENT;
  if (!auditor && record.envelope.securityDomain !== identity.securityDomain) {
    return { allowed: false, reason: "security-domain isolation" };
  }
  if (record.lifecycle !== "active") {
    return { allowed: false, reason: `lifecycle ${record.lifecycle}` };
  }
  if (record.envelope.expiresAt && new Date(record.envelope.expiresAt).getTime() <= Date.now()) {
    return { allowed: false, reason: "expired" };
  }
  if (RANK[record.envelope.sensitivity] > RANK[agentClearance]) {
    return { allowed: false, reason: "insufficient clearance" };
  }
  if (
    record.envelope.memoryClass === "quarantine_memory" &&
    identity.purpose !== "policy-review" &&
    identity.purpose !== "adversarial-test"
  ) {
    return { allowed: false, reason: "quarantine is never auto-injected" };
  }
  if (minProvenance === "hashed" && !record.envelope.contentSha256) {
    return { allowed: false, reason: "missing provenance hash" };
  }
  if (!record.envelope.sourceRefs.length && record.envelope.memoryClass === "evidence_memory") {
    return { allowed: false, reason: "evidence requires source refs" };
  }
  return { allowed: true, reason: "authorized" };
}

export function clearanceFor(agentId: string, agents: { id: string; clearance: Sensitivity }[]): Sensitivity {
  return agents.find((a) => a.id === agentId)?.clearance ?? "internal";
}

export function nextSensitivity(current: Sensitivity, raised: Sensitivity): Sensitivity {
  return RANK[raised] > RANK[current] ? raised : current;
}

export function sensitivityLabel(s: Sensitivity) {
  return s;
}

export { SENSITIVITIES };
