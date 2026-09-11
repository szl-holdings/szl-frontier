import { CovenantEngine } from "@/lib/covenant/engine";
import { AGENTS } from "@/lib/covenant/seed";
import type { GateResult, Identity, Purpose } from "@/lib/covenant/types";
import { evaluateHarborBatch } from "@/lib/harbor/evaluate";
import { CURRICULUM, SecondBrainIndex } from "@/lib/brain";

export const YACHAY_HARBOR_GATE_SPECS = [
  { id: "g25", title: "Every curriculum pulse is seal-eligible", round: 5 as const },
  { id: "g26", title: "Harbor estate source stays EVALUATION/HOLD", round: 5 as const },
  { id: "g27", title: "Harbor private Dataset without credentials fail-closes", round: 5 as const },
  { id: "g28", title: "Harbor foreign Hub object is hard-denied", round: 5 as const },
];

function ident(agentId: string, tenantId: string, domain: string, purpose: Purpose): Identity {
  return {
    tenantId,
    securityDomain: domain,
    subjectId: "gate",
    agentId,
    runId: "gate-run",
    purpose,
  };
}

export async function runYachayHarborGates(): Promise<GateResult[]> {
  const engine = new CovenantEngine({
    agents: AGENTS.map((a) => ({ ...a })),
    policySha: "gate-policy-sha",
  });
  engine.genesisHash = "0".repeat(64);
  engine.policyBundleSha256 = "gate-policy-sha";

  const out: GateResult[] = [];

  const yachay = new SecondBrainIndex();
  yachay.loadText(
    JSON.stringify({
      id: "doc:covenant:0001",
      title: "Memory Covenant deny by default",
      source: "doc",
      sha256: "a".repeat(64),
      text: "No memory enters or leaves without identity purpose policy provenance lifecycle and a sealed receipt.",
    }),
  );

  {
    let sealed = 0;
    for (const q of CURRICULUM.slice(0, 6)) {
      const hit = yachay.search(q, 4);
      const plan = yachay.plan(q, hit.handles);
      const w = await engine.write({
        identity: ident("yachay-navigator", "szl-core", "memory-plane", "evaluation"),
        tenantId: "szl-core",
        securityDomain: "memory-plane",
        memoryClass: plan.decision === "NAVIGATE" ? "outcome_memory" : "decision_memory",
        sensitivity: "internal",
        content: `Yachay pulse ${plan.decision} «${q}». SOFTWARE. Index is DATA, never weights.`,
        sourceRefs: ["szl://second-brain/public-projection"],
      });
      if (w.allowed && w.receipt) sealed += 1;
    }
    out.push({
      id: "g25",
      title: YACHAY_HARBOR_GATE_SPECS[0].title,
      passed: sealed === 6,
      evidence: `sealed ${sealed}/6 curriculum pulses`,
      round: 5,
    });
  }

  const batch = evaluateHarborBatch();
  const hold = batch.find((v) => v.sourceId === "harbor-estate-covenant");
  const fail = batch.find((v) => v.sourceId === "harbor-private-uncred");
  const deny = batch.find((v) => v.sourceId === "harbor-foreign");

  if (hold?.allowed) {
    await engine.write({
      identity: ident("covenant-auditor", "szl-core", "memory-plane", "evaluation"),
      tenantId: "szl-core",
      securityDomain: "memory-plane",
      memoryClass: "decision_memory",
      sensitivity: "internal",
      content: hold.content,
      sourceRefs: hold.sourceRefs,
    });
  }

  out.push({
    id: "g26",
    title: YACHAY_HARBOR_GATE_SPECS[1].title,
    passed: Boolean(hold && hold.disposition === "EVALUATION" && hold.promotion === "NONE" && hold.allowed),
    evidence: hold ? `${hold.disposition} promotion=${hold.promotion}` : "missing estate verdict",
    round: 5,
  });
  out.push({
    id: "g27",
    title: YACHAY_HARBOR_GATE_SPECS[2].title,
    passed: Boolean(fail && fail.disposition === "FAIL_CLOSED" && !fail.allowed),
    evidence: fail?.reason ?? "missing fail-closed verdict",
    round: 5,
  });
  out.push({
    id: "g28",
    title: YACHAY_HARBOR_GATE_SPECS[3].title,
    passed: Boolean(deny && deny.disposition === "DENIED" && !deny.allowed),
    evidence: deny?.reason ?? "missing deny verdict",
    round: 5,
  });

  return out;
}
