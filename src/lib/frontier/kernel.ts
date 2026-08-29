import type { FrontierIdea, ProjectProfile } from "@/lib/covenant/types";

function stamp(project: string, suffix: string) {
  return `${project}-${suffix}`;
}

export function frontierIdeaKernel(project: ProjectProfile, createdAt: string): FrontierIdea[] {
  const n = project.name;
  return [
    {
      id: stamp(project.id, "g1"),
      project: n,
      theme: "governed-agent-mesh",
      description: `Use ${n} as a substrate in an SZL-style governed agent mesh. Attach policy engines and formal constraints to every call path. Represent policies in a machine-checkable form and force every agent through a governance gateway. Encode who, why, and under-what-constraints for every operation so audit and simulation are first-class.`,
      riskLevel: "medium",
      feasibilityHorizon: "near",
      governanceHooks: ["formal-policy-layer", "per-call provenance", "simulation-before-execution"],
      orchestrationHooks: ["agent-mesh-router", "policy-gateway", "multi-backend-adapter"],
      createdAt,
    },
    {
      id: stamp(project.id, "p1"),
      project: n,
      theme: "self-describing-payloads",
      description: `Define a self-describing payload protocol that all tooling on ${n} must speak. Payloads carry intent, constraints, required guarantees, acceptable trade-offs, and observability contracts. Orchestrators compile intent + constraints into concrete ops over ${n}'s primitives, so backends can swap without changing the grammar.`,
      riskLevel: "low",
      feasibilityHorizon: "near",
      governanceHooks: ["intent-schema", "constraints-schema", "audit-schema"],
      orchestrationHooks: ["payload-compiler", "backend-adapter-layer"],
      createdAt,
    },
    {
      id: stamp(project.id, "a1"),
      project: n,
      theme: "adversarial-governance",
      description: `Stress-test governance around ${n} with synthetic red-team agents whose only job is to evade policy. Run continuous governance pen-tests where forbidden payloads attempt to route through the mesh. Feed findings back as patches, new rules, or re-architected control planes. No production action surface.`,
      riskLevel: "high",
      feasibilityHorizon: "mid",
      governanceHooks: ["red-team-agents", "governance-fuzzing", "policy-mutation-loop"],
      orchestrationHooks: ["attack-scenario-generator", "governance-ci"],
      createdAt,
    },
  ];
}

export function generateFrontierPayload(projects: ProjectProfile[]) {
  const createdAt = new Date().toISOString();
  const ideas = projects.flatMap((p) => frontierIdeaKernel(p, createdAt));
  return {
    generatedAt: createdAt,
    projectCount: projects.length,
    ideaCount: ideas.length,
    projects,
    ideas,
    contract: "szl-frontier/1.0",
    controlPlane: {
      policy: "Covenant Policy",
      evidence: "Proof Chain",
      decisions: "Outcome Graph",
      defaultEffect: "deny",
    },
  };
}
