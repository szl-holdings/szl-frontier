#!/usr/bin/env node
/**
 * NX07/NX08 — evidence-impact graph and counterfactual release rehearsal.
 *
 * This module names proposed AGI-scale and release claims, then fail-closes.
 * It never authorizes production, never writes remotes, and never converts
 * HTTP 200, local tests, or a rehearsal PASS into LIVE / ALL_DONE /
 * OPERATIONAL=8.
 */
export const SCHEMA = "szl.frontier.counterfactual-rehearsal/v1";
export const LOCKED_FORMULAS = Object.freeze([
  "F1",
  "F4",
  "F7",
  "F11",
  "F12",
  "F18",
  "F19",
  "F22",
]);
export const LAMBDA_STATUS = "CONJECTURE_1";

export const CLAIM_CLASSES = Object.freeze({
  HTTP_200: "HTTP_200_IS_NOT_LIVE",
  LOCAL_TESTS: "LOCAL_TESTS_ARE_NOT_PRODUCTION",
  NATIVE_RECEIPT: "DATED_NATIVE_RECEIPT",
  DRAFT_PR: "DRAFT_PR_IS_NOT_ADMITTED_SOURCE",
  METADATA_MESH: "METADATA_CONSISTENT_IS_NOT_RELEASE",
  AGI_CAPABILITY: "AGI_CAPABILITY_REQUIRES_QUALIFICATION_NOT_WISH",
  LAMBDA_THEOREM: "LAMBDA_REMAINS_CONJECTURE_1",
  LOCKED_INFLATION: "LOCKED_FORMULAS_STAY_EIGHT",
});

const BANNED_PROMOTION = [
  /\bLIVE\b/i,
  /\bALL[_\s-]?DONE\b/i,
  /\bOPERATIONAL\s*=\s*8\b/i,
  /\bcertified[_\s-]?production[_\s-]?ready\b/i,
  /\bproduction\s+authorized\b/i,
  /\blambda\s+is\s+(a\s+)?theorem\b/i,
];

const OWNERS = Object.freeze({
  a11oy: {
    product: true,
    publisher: true,
    impacts: ["a-11-oy.com", "hf-sync", "estate-release-train"],
  },
  "szl-forge": {
    evaluation: true,
    impacts: ["live-mesh", "kernels", "eval-labs"],
  },
  "szl-frontier": {
    memory: true,
    waves: true,
    impacts: ["command-readout", "admission-waves"],
  },
  "a11oy-net": {
    proof: true,
    impacts: ["STATIC_DOCUMENT", "pages-deployment"],
  },
  "lyte-services": {
    forecast: true,
    impacts: ["lyte-health", "product-readback"],
  },
});

export function lockedCount(list = LOCKED_FORMULAS) {
  return list.length;
}

export function isPromotionClaim(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  return BANNED_PROMOTION.some((rx) => rx.test(text));
}

export function classifyClaim(text) {
  const raw = String(text ?? "");
  if (/\blambda\b/i.test(raw) && /theorem/i.test(raw)) {
    return CLAIM_CLASSES.LAMBDA_THEOREM;
  }
  if (/locked/i.test(raw) && /\b9\b|nine|inflate/i.test(raw)) {
    return CLAIM_CLASSES.LOCKED_INFLATION;
  }
  if (/\bagi\b/i.test(raw) && !/rehearsal|counterfactual|hold/i.test(raw)) {
    return CLAIM_CLASSES.AGI_CAPABILITY;
  }
  if (isPromotionClaim(raw)) return CLAIM_CLASSES.HTTP_200;
  return "SCOPED_PROPOSAL";
}

export function impactGraph(owner, mutation) {
  const record = OWNERS[owner];
  if (!record) {
    return {
      owner,
      known: false,
      impacts: [],
      reason: "UNKNOWN_OWNER_FAIL_CLOSED",
    };
  }
  return {
    owner,
    known: true,
    mutation: mutation || "unspecified",
    impacts: [...record.impacts],
    productScopeOnly: Boolean(record.product) && mutation === "product-repair",
    verticalImplied: false,
  };
}

export function requiredEvidence(kind) {
  const table = {
    product_repair: [
      "exact-source-sha-40",
      "native-estate-receipt",
      "canonical-writer-plan",
    ],
    vertical_publish: [
      "complete-approved-plan",
      "exact-source-sha-40",
      "publish_vertical_flagships=true",
    ],
    live_stamp: [
      "authenticated-image-digest",
      "seven-viewport-browser",
      "rollback-artifact",
      "production-authorization",
    ],
    agi_capability: [
      "task-quality-receipt",
      "hardware-benchmark",
      "signed-production-authorization",
      "doctrine-invariants-green",
    ],
    pages_deployment: [
      "pages-run-id",
      "artifact-digest",
      "served-bytes-match",
    ],
    static_document: ["expected-file-hash", "served-file-hash"],
  };
  return table[kind] || ["unclassified-evidence-fail-closed"];
}

export function rehearse(proposal = {}) {
  const text = String(proposal.claim || proposal.summary || "");
  const owner = proposal.owner || "";
  const kind = proposal.kind || "unclassified";
  const classId = classifyClaim(text);
  const graph = impactGraph(owner, kind);
  const evidence = requiredEvidence(kind);
  const provided = Array.isArray(proposal.evidence) ? proposal.evidence : [];
  const missing = evidence.filter((item) => !provided.includes(item));

  const promotion = isPromotionClaim(text);
  const lambdaViolation =
    classId === CLAIM_CLASSES.LAMBDA_THEOREM ||
    proposal.lambdaStatus === "THEOREM";
  const lockViolation =
    classId === CLAIM_CLASSES.LOCKED_INFLATION ||
    (typeof proposal.lockedCount === "number" && proposal.lockedCount !== 8);

  const deny =
    lambdaViolation ||
    lockViolation ||
    promotion ||
    !graph.known ||
    missing.length > 0 ||
    proposal.productionAuthorized === true;

  return {
    schema: SCHEMA,
    disposition: deny ? "HOLD" : "REHEARSAL_CONSISTENT",
    productionAuthorization: false,
    automaticPromotionAuthorized: false,
    allDone: false,
    live: false,
    operationalEqualsEight: false,
    lambdaStatus: LAMBDA_STATUS,
    lockedFormulas: LOCKED_FORMULAS,
    lockedCount: lockedCount(),
    claimClass: classId,
    ownerKnown: graph.known,
    impacts: graph.impacts,
    verticalImplied: false,
    missingEvidence: missing,
    reason: deny
      ? lambdaViolation
        ? "LAMBDA_STAYS_CONJECTURE_1"
        : lockViolation
          ? "LOCKED_COUNT_MUST_STAY_8"
          : promotion
            ? "PROMOTION_CLAIM_REFUSED"
            : !graph.known
              ? "UNKNOWN_OWNER_FAIL_CLOSED"
              : missing.length
                ? "EVIDENCE_INCOMPLETE"
                : "PRODUCTION_FLAG_REFUSED"
      : "SCOPED_REHEARSAL_ONLY",
    notRequestedIsNotPass: true,
    http200IsNotLive: true,
  };
}

export function rehearseAgiWish() {
  return rehearse({
    claim: "make it all AGI and LIVE and OPERATIONAL=8",
    owner: "szl-frontier",
    kind: "agi_capability",
    evidence: [],
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const claim = process.argv.slice(2).join(" ") || "make it all AGI";
  process.stdout.write(`${JSON.stringify(rehearse({ claim, owner: "szl-frontier", kind: "agi_capability" }), null, 2)}\n`);
}
