#!/usr/bin/env node
/**
 * NX09 — Hugging Face / OSS Claim-Scout + Counterfactual World Projector.
 *
 * Invert of Paper2Agent: they turn papers into agents that act.
 * This turns Hub claims into worlds that must be refused when receipts
 * are absent. Never inherits likes, stars, paper status, or Space RUNNING.
 * Never authorizes production.
 */
export const SCHEMA = "szl.frontier.claim-scout/v1";
export const WORLD_SCHEMA = "szl.frontier.counterfactual-world/v1";
export const RECEIPT_SCHEMA = "szl.frontier.refusal-receipt/v1";
export const LAMBDA_STATUS = "CONJECTURE_1";
export const LOCKED_COUNT = 8;
export const FRONTIER_MAIN = "32b2173062dde7098cb881b9264d612324317b4c";

export const SCOUT_CLASSES = Object.freeze({
  PAPER_STATUS_IS_NOT_QUALIFICATION: "PAPER_STATUS_IS_NOT_QUALIFICATION",
  LIKES_ARE_NOT_EVIDENCE: "LIKES_ARE_NOT_EVIDENCE",
  HARNESS_EXPANSION_IS_NOT_RETENTION: "HARNESS_EXPANSION_IS_NOT_RETENTION",
  WEBGPU_KERNEL_IS_NOT_PRODUCT_RUNTIME: "WEBGPU_KERNEL_IS_NOT_PRODUCT_RUNTIME",
  SANDBOX_ESCAPE_IS_NOT_ADMISSION: "SANDBOX_ESCAPE_IS_NOT_ADMISSION",
  PAPER_AGENT_IS_NOT_QUALIFICATION: "PAPER_AGENT_IS_NOT_QUALIFICATION",
  PHANTOM_GUARDRAIL_IS_NOT_REPAIR: "PHANTOM_GUARDRAIL_IS_NOT_REPAIR",
  RECOGNITION_WITHOUT_REFUSAL: "RECOGNITION_WITHOUT_REFUSAL",
  SPACE_RUNNING_IS_NOT_LIVE: "SPACE_RUNNING_IS_NOT_LIVE",
  STAR_COUNT_IS_NOT_ADMISSION: "STAR_COUNT_IS_NOT_ADMISSION",
  LEADERBOARD_IS_NOT_LIVE: "LEADERBOARD_IS_NOT_LIVE",
  PUBLIC_RUN_IS_NOT_HELD_OUT: "PUBLIC_RUN_IS_NOT_HELD_OUT",
  HARNESS_EFFECT_IS_NOT_MODEL: "HARNESS_EFFECT_IS_NOT_MODEL",
  PATH_REDUNDANCY_IS_NOT_CORROBORATION: "PATH_REDUNDANCY_IS_NOT_CORROBORATION",
  EVIDENTIAL_CEILING: "EVIDENTIAL_CEILING",
  HTTP_200_IS_NOT_LIVE: "HTTP_200_IS_NOT_LIVE",
  UNSHIPPED_DREAM_IS_NOT_ADMISSION: "UNSHIPPED_DREAM_IS_NOT_ADMISSION",
});

export const LIVE_EVIDENCE = Object.freeze([
  "authenticated-image-digest",
  "seven-viewport-browser",
  "rollback-artifact",
  "signed-production-authorization",
  "hardware-benchmark",
  "doctrine-invariants-green",
]);

export const ANALOGS = Object.freeze([
  { id: "icml-2026-open-reproductions", url: "https://huggingface.co/blog/icml-2026-open-reproductions", pattern: "35908 claims; 23% papers contested; do not take claims at face value" },
  { id: "paper2agent", url: "https://www.nature.com/articles/s41586-026-11044-y", pattern: "paper+code to MCP agent on Spaces; invert to Paper-as-Claim" },
  { id: "evoharnessbench", url: "https://arxiv.org/abs/2609.04280", pattern: "harness expansion induces forgetting" },
  { id: "sol-pi", url: "https://huggingface.co/papers/2609.20519", pattern: "auto-research harness loops; no production auth" },
  { id: "hf-webgpu-kernels", url: "https://huggingface.co/blog/webgpu-kernels", pattern: "207 kernels; starting point not end state" },
  { id: "evidential-ceiling", url: "https://huggingface.co/papers/2607.21735", pattern: "modest benches cannot prove rare catastrophe" },
  { id: "proof-or-stop", url: "https://arxiv.org/abs/2607.14890", pattern: "agent outputs are claims not lifecycle state" },
].map((row) => ({ ...row, inheritsQualification: false })));

export function classifyScout(input = {}) {
  const text = String(input.claim || input.summary || "");
  const source = String(input.source || "");
  const likes = Number(input.likes || 0);
  const stars = Number(input.stars || 0);
  const spaceStatus = String(input.spaceStatus || "");
  if (/paper2agent|mcp server on (hf )?spaces/i.test(text)) return SCOUT_CLASSES.PAPER_AGENT_IS_NOT_QUALIFICATION;
  if (/phantom|invented failure|fabricat/i.test(text)) return SCOUT_CLASSES.PHANTOM_GUARDRAIL_IS_NOT_REPAIR;
  if (/unanswerable|recognition.?refusal|still answers/i.test(text)) return SCOUT_CLASSES.RECOGNITION_WITHOUT_REFUSAL;
  if (/webgpu|opfs/i.test(text)) return SCOUT_CLASSES.WEBGPU_KERNEL_IS_NOT_PRODUCT_RUNTIME;
  if (/sandbox|exploitgym|swarm/i.test(text)) return SCOUT_CLASSES.SANDBOX_ESCAPE_IS_NOT_ADMISSION;
  if (/harness (expand|evolution|forgett)/i.test(text) || /evoharness/i.test(text)) {
    return SCOUT_CLASSES.HARNESS_EXPANSION_IS_NOT_RETENTION;
  }
  if (/harness (effect|vs model)|harnessdev/i.test(text)) return SCOUT_CLASSES.HARNESS_EFFECT_IS_NOT_MODEL;
  if (/leaderboard|harbor-index/i.test(text)) return SCOUT_CLASSES.LEADERBOARD_IS_NOT_LIVE;
  if (/public (run|games)|held.?out/i.test(text)) return SCOUT_CLASSES.PUBLIC_RUN_IS_NOT_HELD_OUT;
  if (spaceStatus.toLowerCase() === "running" || /space (is )?running/i.test(text)) {
    return SCOUT_CLASSES.SPACE_RUNNING_IS_NOT_LIVE;
  }
  if ((likes > 0 || /likes?/i.test(text)) && /qualif|live|operational|ready/i.test(text)) {
    return SCOUT_CLASSES.LIKES_ARE_NOT_EVIDENCE;
  }
  if (stars > 0 && /qualif|live|admit/i.test(text)) return SCOUT_CLASSES.STAR_COUNT_IS_NOT_ADMISSION;
  if (source === "hf-paper" || /icml|reproduc|arxiv/i.test(text)) {
    return SCOUT_CLASSES.PAPER_STATUS_IS_NOT_QUALIFICATION;
  }
  if (/dream|no one has dreamed|nobody has dreamed/i.test(text)) {
    return SCOUT_CLASSES.UNSHIPPED_DREAM_IS_NOT_ADMISSION;
  }
  if (/\bLIVE\b|\bOPERATIONAL\s*=\s*8\b|ALL[_\s-]?DONE/i.test(text)) {
    return SCOUT_CLASSES.HTTP_200_IS_NOT_LIVE;
  }
  return SCOUT_CLASSES.EVIDENTIAL_CEILING;
}

export function projectWorld(classId) {
  return {
    schema: WORLD_SCHEMA,
    claimClass: classId,
    wouldHaveToBeTrue: [
      "signed-production-authorization from a canonical writer",
      "authenticated-image-digest distinct from Git SHA-40 and Hub SHA",
      "seven-viewport-browser receipt (WP23)",
      "hardware-benchmark receipts (WP06/WP08/WP09/WP14)",
      "doctrine-invariants-green on admitted runtime",
      "Hub publish plan with publish_vertical_flagships=true",
      "rollback artifact bound to the served digest",
    ],
    isThisEstate: false,
    frontierMainBound: FRONTIER_MAIN,
    note: "This is the world in which the inbound claim would be LIVE. It is not this estate.",
  };
}

export function scout(input = {}) {
  const classId = classifyScout(input);
  const provided = Array.isArray(input.evidence) ? input.evidence : [];
  const missing = LIVE_EVIDENCE.filter((item) => !provided.includes(item));
  const reason = "CLAIM_SCOUT_HOLD_WORLD_NOT_THIS_ESTATE";
  return {
    schema: SCHEMA,
    observedAt: input.observedAt || new Date().toISOString(),
    source: input.source || "unclassified",
    id: input.id || "",
    claimClass: classId,
    disposition: "HOLD",
    productionAuthorization: false,
    automaticPromotionAuthorized: false,
    inheritsQualification: false,
    live: false,
    allDone: false,
    operationalEqualsEight: false,
    lambdaStatus: LAMBDA_STATUS,
    lockedCount: LOCKED_COUNT,
    frontierMainBound: FRONTIER_MAIN,
    requiredEvidence: [...LIVE_EVIDENCE],
    missingEvidence: missing,
    analogCitations: ANALOGS,
    analogCeiling: true,
    pathRedundancyIsNotCorroboration: true,
    counterfactualWorld: projectWorld(classId),
    refusalReceipt: {
      schema: RECEIPT_SCHEMA,
      actionAttempted: String(input.claim || "").slice(0, 240),
      checkFailed: reason,
      missingEvidence: missing,
      consequenceOccurred: false,
      receiptWritten: true,
      disposition: "HOLD",
      productionAuthorization: false,
      live: false,
    },
    reason,
    http200IsNotLive: true,
  };
}

export function scoutUnshippedDream() {
  return scout({
    source: "user-wish",
    id: "make-us-something-no-one-has-dreamed-of",
    claim: "scrape hugging face and make us something no one has dreamed of LIVE",
  });
}

export function scoutSpaceRunning() {
  return scout({
    source: "hf-space",
    id: "SZLHOLDINGS/szl-frontier",
    claim: "Space is Running so the product is LIVE",
    spaceStatus: "Running",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(scoutUnshippedDream(), null, 2)}\n`);
}
