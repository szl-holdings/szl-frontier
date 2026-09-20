// SPDX-License-Identifier: Apache-2.0
/**
 * Paint bind: the UI is a function of the gate.
 * ALLOW chrome is illegal without a cycle receipt that actually ALLOWs.
 * Arithmetic-would-allow is a ghost and cannot enable a control.
 */

import type { Verdict } from "./lambda-gate";

export type Paint = "ALLOW" | "DENY" | "UNAVAILABLE";
export type ActionClass = "READ_ONLY" | "REVERSIBLE_WRITE" | "IRREVERSIBLE_WRITE";

export type CyclePaintSource = {
  schema?: string;
  verdict?: string;
  invariantsOk?: boolean;
  productionPromotion?: boolean;
  authority?: string;
  lambda?: string;
  lambdaNeverATheorem?: boolean;
  live?: boolean;
  divergent?: boolean;
  shadow?: { executable?: boolean } | null;
};

export const CYCLE_SCHEMA = "szl.frontier.ouroboros-cycle.v1";

export function paintFromCycle(cycle: CyclePaintSource | null | undefined): Paint {
  if (!cycle) return "UNAVAILABLE";
  if (cycle.schema !== CYCLE_SCHEMA) return "UNAVAILABLE";
  if (cycle.productionPromotion === true) return "DENY";
  if (cycle.lambda !== "CONJECTURE_1" || cycle.lambdaNeverATheorem !== true) return "DENY";
  if (cycle.authority !== "PROPOSAL_ONLY") return "DENY";
  if (cycle.invariantsOk !== true) return "DENY";
  if (cycle.shadow && cycle.shadow.executable === true) return "DENY";
  if (cycle.verdict === "ALLOW") return "ALLOW";
  if (
    cycle.verdict === "HARD_DENY" ||
    cycle.verdict === "LAMBDA_VETO" ||
    cycle.verdict === "DENY_DEFAULT" ||
    cycle.verdict === "ESCALATE"
  ) {
    return "DENY";
  }
  return "UNAVAILABLE";
}

export function writeEnabled(paint: Paint, actionClass: ActionClass): boolean {
  if (actionClass === "IRREVERSIBLE_WRITE") return false;
  if (actionClass === "REVERSIBLE_WRITE") return paint === "ALLOW";
  return paint !== "DENY";
}

export function allowChrome(paint: Paint): boolean {
  return paint === "ALLOW";
}

export function paintTone(
  paint: Paint,
): "allow" | "deny" | "pending" | "default" {
  if (paint === "ALLOW") return "allow";
  if (paint === "DENY") return "deny";
  return "pending";
}

export function paintLabel(paint: Paint, verdict?: Verdict | string): string {
  if (paint === "UNAVAILABLE") return "UNAVAILABLE";
  if (paint === "DENY") return String(verdict || "DENY");
  return "ALLOW";
}
