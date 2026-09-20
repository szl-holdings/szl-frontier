#!/usr/bin/env node
/**
 * NX07/NX08 — evidence-impact graph and counterfactual release rehearsal.
 *
 * v1.1 adds typed evidence-graph nodes (DECISION / POLICY / SIGNAL /
 * ARTIFACT), a CITATION_ONLY analog catalog, and first-class refusal
 * receipts. The engine names proposed AGI-scale and release claims,
 * including wishes nobody has shipped, then fail-closes.
 *
 * It never authorizes production, never writes remotes, and never converts
 * HTTP 200, local tests, analog citations, hosted CI green, or a rehearsal
 * PASS into LIVE / ALL_DONE / OPERATIONAL=8.
 */
export const SCHEMA = "szl.frontier.counterfactual-rehearsal/v1";
export const GRAPH_SCHEMA = "szl.frontier.evidence-graph/v1";
export const ANALOG_SCHEMA = "szl.frontier.analog-catalog/v1";
export const RECEIPT_SCHEMA = "szl.frontier.refusal-receipt/v1";
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

export const NODE_KINDS = Object.freeze({
  DECISION: "DECISION",
  POLICY: "POLICY",
  SIGNAL: "SIGNAL",
  ARTIFACT: "ARTIFACT",
});

export const CLAIM_CLASSES = Object.freeze({
  HTTP_200: "HTTP_200_IS_NOT_LIVE",
  LOCAL_TESTS: "LOCAL_TESTS_ARE_NOT_PRODUCTION",
  NATIVE_RECEIPT: "DATED_NATIVE_RECEIPT",
  DRAFT_PR: "DRAFT_PR_IS_NOT_ADMITTED_SOURCE",
  METADATA_MESH: "METADATA_CONSISTENT_IS_NOT_RELEASE",
  AGI_CAPABILITY: "AGI_CAPABILITY_REQUIRES_QUALIFICATION_NOT_WISH",
  LAMBDA_THEOREM: "LAMBDA_REMAINS_CONJECTURE_1",
  LOCKED_INFLATION: "LOCKED_FORMULAS_STAY_EIGHT",
  ANALOG_INHERITANCE: "ANALOG_CITATION_IS_NOT_QUALIFICATION",
  DREAM_PROMOTION: "UNSHIPPED_DREAM_IS_NOT_ADMISSION",
  HOSTED_CI: "HOSTED_CI_GREEN_IS_NOT_MERGE_OR_PUBLISH",
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

/**
 * CITATION_ONLY analog catalog. Observed 2026-09-19/20. None of these
 * inherit qualification into the SZL estate. Mapping a pattern does not
 * fill WP06/WP08/WP09/WP14/WP23 evidence or authorize production.
 */
export const ANALOG_CATALOG = Object.freeze([
  {
    id: "evidence-gate-action",
    title: "evidence-gate/evidence-gate-action",
    url: "https://github.com/evidence-gate/evidence-gate-action",
    pattern: "fail-closed CI gates; missing evidence = FAIL; L4 SHA-256 chain",
    mapsTo: ["live_stamp", "product_repair"],
    inheritsQualification: false,
  },
  {
    id: "fail-closed-ai",
    title: "LalaSkye/fail-closed-ai",
    url: "https://github.com/LalaSkye/fail-closed-ai",
    pattern: "stop is first-class; receipts written for refusal not just success",
    mapsTo: ["agi_capability", "live_stamp"],
    inheritsQualification: false,
  },
  {
    id: "proof-or-stop",
    title: "Proof-or-Stop Lifecycle Control",
    url: "https://arxiv.org/abs/2607.14890",
    pattern: "agent outputs are claims not lifecycle state; zero false-DONE",
    mapsTo: ["live_stamp", "agi_capability"],
    inheritsQualification: false,
  },
  {
    id: "refuse-decompose-refresh",
    title: "Refuse, Decompose, Refresh (claim-safe protocol)",
    url: "https://arxiv.org/abs/2609.20538",
    pattern: "abstain when reference stream lacks support; do not emit one PASS",
    mapsTo: ["agi_capability", "unclassified"],
    inheritsQualification: false,
  },
  {
    id: "proofagent-harness",
    title: "ProofAgent-ai/proofagent-harness",
    url: "https://github.com/ProofAgent-ai/proofagent-harness",
    pattern: "refuse to pass on incomplete evidence; exit 2 blocks release",
    mapsTo: ["live_stamp", "vertical_publish"],
    inheritsQualification: false,
  },
  {
    id: "cfc-closure",
    title: "CFC Evidence-Bound Closure Control",
    url: "https://zenodo.org/records/22308950",
    pattern: "prevent unsupported decision closure; experimental prototype",
    mapsTo: ["agi_capability"],
    inheritsQualification: false,
  },
  {
    id: "reverify",
    title: "2akouwu/reverify",
    url: "https://github.com/2akouwu/reverify",
    pattern: "deterministic tool checks LLM claims against ground truth",
    mapsTo: ["product_repair", "static_document"],
    inheritsQualification: false,
  },
  {
    id: "executable-counterfactuals",
    title: "AniketVashishtha/Executable_Counterfactuals",
    url: "https://github.com/AniketVashishtha/Executable_Counterfactuals",
    pattern: "abduction-intervention-prediction as executable rehearsal",
    mapsTo: ["agi_capability"],
    inheritsQualification: false,
  },
  {
    id: "openshift-pj-rehearse",
    title: "OpenShift pj-rehearse",
    url: "https://pkg.go.dev/github.com/openshift/ci-tools/pkg/rehearse",
    pattern: "rehearse candidate CI jobs; rehearsal ack is not production",
    mapsTo: ["product_repair"],
    inheritsQualification: false,
  },
  {
    id: "releasegate",
    title: "ReleaseGate Change Risk Analyzer",
    url: "https://github.com/marketplace/actions/releasegate-change-risk-analyzer",
    pattern: "hard ALLOW/DENY; strict fail-closed; no advisory mode in enforcement",
    mapsTo: ["live_stamp", "vertical_publish"],
    inheritsQualification: false,
  },
  {
    id: "aisi-inspect",
    title: "UK AISI Inspect + Sandboxing Toolkit",
    url: "https://inspect.aisi.org.uk/",
    pattern: "composable eval programs; isolate inference from tool sandbox",
    mapsTo: ["agi_capability"],
    inheritsQualification: false,
  },
  {
    id: "slsa-intoto",
    title: "SLSA + in-toto + Sigstore admission",
    url: "https://slsa.dev/",
    pattern: "missing provenance/signature rejects deploy",
    mapsTo: ["live_stamp", "pages_deployment"],
    inheritsQualification: false,
  },
  {
    id: "kimjune01-agi-null",
    title: "kimjune01/AGI skill-consolidation harness",
    url: "https://github.com/kimjune01/AGI",
    pattern: "concluded null result; preserved as artifact not a live system",
    mapsTo: ["agi_capability"],
    inheritsQualification: false,
  },
]);

/**
 * Named dreams. Naming them is the upgrade: a wish that cannot be
 * classified cannot be refused with exact missing evidence.
 */
export const DREAM_REGISTER = Object.freeze({
  SELF_AUTHORIZING_AGI:
    "an agent that stamps its own LIVE after a rehearsal PASS",
  ANALOG_INHERITANCE:
    "importing an external gate's qualification as SZL production authority",
  EVIDENCE_GRAPH_AS_PRODUCTION:
    "treating a typed HOLD graph as OPERATIONAL=8",
  COUNTERFACTUAL_WORLD_PROMOTION:
    "promoting the world in which WP06-WP23 already passed",
  HOSTED_CI_AS_HUB_PUBLISH:
    "treating forge#347 hosted checks as Hugging Face publication",
  DRAFT_PR_AS_ADMITTED_SOURCE:
    "merging frontier#184 local tests into admitted runtime memory",
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
  if (/analog/i.test(raw) && /qualif|inherit|authorize|live/i.test(raw)) {
    return CLAIM_CLASSES.ANALOG_INHERITANCE;
  }
  if (/hosted\s*ci/i.test(raw) && /merge|publish|live|hub/i.test(raw)) {
    return CLAIM_CLASSES.HOSTED_CI;
  }
  if (
    /dream|nobody has dreamed|no one has dreamed|unshipped/i.test(raw) &&
    /live|agi|operational|all[_\s-]?done/i.test(raw)
  ) {
    return CLAIM_CLASSES.DREAM_PROMOTION;
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

export function analogFor(kind) {
  return ANALOG_CATALOG.filter(
    (entry) =>
      entry.mapsTo.includes(kind) || entry.mapsTo.includes("unclassified"),
  ).map((entry) => ({
    id: entry.id,
    title: entry.title,
    url: entry.url,
    pattern: entry.pattern,
    inheritsQualification: false,
  }));
}

export function node(kind, id, statement, status, binds = []) {
  return {
    schema: GRAPH_SCHEMA,
    kind,
    id,
    statement,
    status,
    binds,
    productionAuthorization: false,
  };
}

export function buildEvidenceGraph({
  text,
  classId,
  owner,
  kind,
  graph,
  evidence,
  provided,
  missing,
  reason,
  disposition,
  analogCitations,
}) {
  const policy = [
    node(
      NODE_KINDS.POLICY,
      "policy.lambda",
      "Λ remains Conjecture 1",
      LAMBDA_STATUS,
      ["doctrine"],
    ),
    node(
      NODE_KINDS.POLICY,
      "policy.locked",
      "locked formulas stay exactly eight",
      `COUNT=${lockedCount()}`,
      LOCKED_FORMULAS,
    ),
    node(
      NODE_KINDS.POLICY,
      "policy.http200",
      "HTTP 200 is not LIVE",
      "ENFORCED",
      ["http200IsNotLive"],
    ),
    node(
      NODE_KINDS.POLICY,
      "policy.not-requested",
      "NOT_REQUESTED is not PASS",
      "ENFORCED",
      ["notRequestedIsNotPass"],
    ),
    node(
      NODE_KINDS.POLICY,
      "policy.analog",
      "analog citation does not inherit qualification",
      "ENFORCED",
      analogCitations.map((row) => row.id),
    ),
  ];

  const signal = [
    node(
      NODE_KINDS.SIGNAL,
      "signal.claim-class",
      classId,
      classId,
      [text.slice(0, 160)],
    ),
    node(
      NODE_KINDS.SIGNAL,
      "signal.owner",
      owner || "(empty)",
      graph.known ? "KNOWN" : "UNKNOWN_OWNER_FAIL_CLOSED",
      graph.impacts,
    ),
    node(
      NODE_KINDS.SIGNAL,
      "signal.promotion-language",
      "banned promotion lexeme scan",
      isPromotionClaim(text) ? "DETECTED" : "CLEAR",
      [],
    ),
    node(
      NODE_KINDS.SIGNAL,
      "signal.kind",
      kind,
      missing.length ? "EVIDENCE_INCOMPLETE" : "EVIDENCE_BAG_PRESENT",
      evidence,
    ),
  ];

  const artifact = [
    ...evidence.map((item) =>
      node(
        NODE_KINDS.ARTIFACT,
        `artifact.required.${item}`,
        item,
        provided.includes(item) ? "PRESENT" : "MISSING",
        [],
      ),
    ),
    ...analogCitations.map((row) =>
      node(
        NODE_KINDS.ARTIFACT,
        `artifact.analog.${row.id}`,
        row.title,
        "CITATION_ONLY",
        [row.url],
      ),
    ),
  ];

  const decision = node(
    NODE_KINDS.DECISION,
    "decision.rehearsal",
    reason,
    disposition,
    [classId, owner, kind],
  );

  return {
    schema: GRAPH_SCHEMA,
    nodes: [...policy, ...signal, ...artifact, decision],
    policyCount: policy.length,
    signalCount: signal.length,
    artifactCount: artifact.length,
    decisionCount: 1,
    inheritsQualification: false,
    productionAuthorization: false,
  };
}

export function refusalReceipt({
  text,
  owner,
  kind,
  evidence,
  missing,
  reason,
  disposition,
}) {
  return {
    schema: RECEIPT_SCHEMA,
    actionAttempted: text.slice(0, 240) || kind,
    owner: owner || "",
    proofRequired: evidence,
    checkFailed: reason,
    missingEvidence: missing,
    consequenceOccurred: false,
    receiptWritten: true,
    disposition,
    productionAuthorization: false,
    live: false,
    allDone: false,
    operationalEqualsEight: false,
  };
}

export function decomposeClaim(text, kind) {
  return {
    protocol: "REFUSE_DECOMPOSE_REFRESH",
    refuse: "abstain from LIVE / ALL_DONE / OPERATIONAL=8 / Lambda-as-theorem",
    decompose: {
      claimText: String(text ?? "").slice(0, 240),
      kind,
      claimClass: classifyClaim(text),
      evidenceClass: requiredEvidence(kind),
    },
    refresh:
      "invalidate any implied reference map; recompute from exact SHA-40 and native receipt",
    singlePassLabelEmitted: false,
  };
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
  const analogCitations = analogFor(kind);

  const promotion = isPromotionClaim(text);
  const lambdaViolation =
    classId === CLAIM_CLASSES.LAMBDA_THEOREM ||
    proposal.lambdaStatus === "THEOREM";
  const lockViolation =
    classId === CLAIM_CLASSES.LOCKED_INFLATION ||
    (typeof proposal.lockedCount === "number" && proposal.lockedCount !== 8);
  const analogInheritance =
    classId === CLAIM_CLASSES.ANALOG_INHERITANCE ||
    proposal.inheritsQualification === true;
  const dreamPromotion = classId === CLAIM_CLASSES.DREAM_PROMOTION;
  const hostedCiPromotion = classId === CLAIM_CLASSES.HOSTED_CI;

  const deny =
    lambdaViolation ||
    lockViolation ||
    analogInheritance ||
    dreamPromotion ||
    hostedCiPromotion ||
    promotion ||
    !graph.known ||
    missing.length > 0 ||
    proposal.productionAuthorized === true;

  const reason = deny
    ? lambdaViolation
      ? "LAMBDA_STAYS_CONJECTURE_1"
      : lockViolation
        ? "LOCKED_COUNT_MUST_STAY_8"
        : analogInheritance
          ? "ANALOG_DOES_NOT_INHERIT"
          : dreamPromotion
            ? "DREAM_IS_NAMED_NOT_ADMITTED"
            : hostedCiPromotion
              ? "HOSTED_CI_IS_NOT_PUBLISH"
              : promotion
                ? "PROMOTION_CLAIM_REFUSED"
                : !graph.known
                  ? "UNKNOWN_OWNER_FAIL_CLOSED"
                  : missing.length
                    ? "EVIDENCE_INCOMPLETE"
                    : "PRODUCTION_FLAG_REFUSED"
    : "SCOPED_REHEARSAL_ONLY";

  const disposition = deny ? "HOLD" : "REHEARSAL_CONSISTENT";
  const evidenceGraph = buildEvidenceGraph({
    text,
    classId,
    owner,
    kind,
    graph,
    evidence,
    provided,
    missing,
    reason,
    disposition,
    analogCitations,
  });
  const receipt = refusalReceipt({
    text,
    owner,
    kind,
    evidence,
    missing,
    reason,
    disposition,
  });

  return {
    schema: SCHEMA,
    disposition,
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
    reason,
    notRequestedIsNotPass: true,
    http200IsNotLive: true,
    inheritsQualification: false,
    analogSchema: ANALOG_SCHEMA,
    analogCitations,
    evidenceGraph,
    refusalReceipt: receipt,
    protocol: decomposeClaim(text, kind),
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

export function rehearseUnshippedDream() {
  return rehearse({
    claim:
      "make things no one has dreamed of and stamp them LIVE and OPERATIONAL=8",
    owner: "szl-frontier",
    kind: "agi_capability",
    evidence: [],
  });
}

export function rehearseAnalogInheritance() {
  return rehearse({
    claim: "analog Proof-or-Stop qualifies this estate LIVE",
    owner: "szl-frontier",
    kind: "live_stamp",
    evidence: requiredEvidence("live_stamp"),
    inheritsQualification: true,
  });
}

export function rehearseHostedCiAsPublish() {
  return rehearse({
    claim: "forge#347 hosted CI green so merge and publish to Hub",
    owner: "szl-forge",
    kind: "product_repair",
    evidence: requiredEvidence("product_repair"),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const claim = process.argv.slice(2).join(" ") || "make it all AGI";
  process.stdout.write(
    `${JSON.stringify(rehearse({ claim, owner: "szl-frontier", kind: "agi_capability" }), null, 2)}\n`,
  );
}
