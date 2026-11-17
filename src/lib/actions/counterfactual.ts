// SPDX-License-Identifier: Apache-2.0
/** Counterfactual analysis only: never a decision token or effect authorization. */
import { ACTIONS, evaluateAction } from "./adapter.ts";
import type { ActionKind } from "../covenant/types.ts";
import type { Paint } from "../ouroboros/paint.ts";
import { sha256Hex } from "../covenant/sha256.ts";
import { stableCanonical } from "../frontier/receipt-envelope.ts";

export const COUNTERFACTUAL_SCHEMA = "szl.covenant.counterfactual/v1";
export const PRODUCTION_BLOCKERS = [
  "NO_DEPLOYED_AUTHORIZATION_DECISION",
  "NO_WITNESSED_EFFECT_RECEIPT",
  "NO_DURABLE_MULTI_WRITER_COMMIT",
] as const;

export type PreviewApproval = "none" | "pending" | "approved" | "denied";
export type PreviewInput = {
  kind: ActionKind;
  assumedApproval: PreviewApproval;
  assumedOrganPaint: Paint;
};

export function parsePreviewInput(input: unknown): PreviewInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !==
      "assumedApproval,assumedOrganPaint,kind") return null;
  const { kind, assumedApproval, assumedOrganPaint } = data;
  if (typeof kind !== "string" || typeof assumedApproval !== "string" ||
      typeof assumedOrganPaint !== "string") return null;
  if (!ACTIONS.some((action) => action.id === kind)) return null;
  if (!["none", "pending", "approved", "denied"].includes(assumedApproval)) return null;
  if (!["ALLOW", "DENY", "UNAVAILABLE"].includes(assumedOrganPaint)) return null;
  return { kind: kind as ActionKind, assumedApproval: assumedApproval as PreviewApproval,
    assumedOrganPaint: assumedOrganPaint as Paint };
}

export async function counterfactualCertificate(
  input: PreviewInput,
  serverResolvedUserId: string,
  now: Date = new Date(),
) {
  const direct = evaluateAction({
    kind: input.kind, purpose: "action-execute",
    approval: "none", organPaint: "UNAVAILABLE",
  });
  const simulated = evaluateAction({
    kind: input.kind, purpose: "action-execute",
    approval: input.assumedApproval, organPaint: input.assumedOrganPaint,
  });
  const definition = ACTIONS.find((action) => action.id === input.kind)!;
  const missingForHypotheticalSoftwareAllow: string[] = [];
  if (definition.class === "hard-deny") {
    missingForHypotheticalSoftwareAllow.push("ABSORBING_HARD_DENY");
  } else {
    if (input.assumedApproval !== "approved") missingForHypotheticalSoftwareAllow.push("HUMAN_APPROVAL_REQUIRED");
    if (input.assumedOrganPaint !== "ALLOW") missingForHypotheticalSoftwareAllow.push("ORGAN_CYCLE_ALLOW_REQUIRED");
  }
  const report = {
    schema: COUNTERFACTUAL_SCHEMA,
    kind: "READ_ONLY_COUNTERFACTUAL" as const,
    action: input.kind,
    policy: "src/lib/actions/adapter.ts" as const,
    policyMode: "SOFTWARE_ONLY" as const,
    actualState: {
      approval: "UNVERIFIED" as const,
      organPaint: "UNAVAILABLE" as const,
      policyResult: "DENY" as const,
      reason: direct.reason,
    },
    hypotheticalState: {
      approval: input.assumedApproval,
      organPaint: input.assumedOrganPaint,
      softwareWouldAllow: simulated.allowed,
      policyReason: simulated.reason,
      minimumSoftwareBlockers: missingForHypotheticalSoftwareAllow,
    },
    productionBlockers: [...PRODUCTION_BLOCKERS],
    productionReady: false as const,
    executionAuthorized: false as const,
    effectCommitted: false as const,
    witnessVerified: false as const,
    userIdSha256: await sha256Hex(serverResolvedUserId),
    generatedAt: now.toISOString(),
    note: "Unsigned, unkeyed scenario analysis. The actual action path did not run.",
  };
  const reportSha256 = await sha256Hex(stableCanonical(report));
  return { ...report, reportSha256 };
}
