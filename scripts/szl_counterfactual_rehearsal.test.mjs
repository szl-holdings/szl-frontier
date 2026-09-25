import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAIM_CLASSES,
  LAMBDA_STATUS,
  LOCKED_FORMULAS,
  classifyClaim,
  impactGraph,
  lockedCount,
  rehearse,
  rehearseAgiWish,
  requiredEvidence,
} from "./szl_counterfactual_rehearsal.mjs";

test("locked formulas stay exactly eight", () => {
  assert.equal(lockedCount(), 8);
  assert.equal(LOCKED_FORMULAS.length, 8);
  assert.equal(LAMBDA_STATUS, "CONJECTURE_1");
});

test("AGI wish without evidence is HOLD and not LIVE", () => {
  const verdict = rehearseAgiWish();
  assert.equal(verdict.disposition, "HOLD");
  assert.equal(verdict.live, false);
  assert.equal(verdict.allDone, false);
  assert.equal(verdict.operationalEqualsEight, false);
  assert.equal(verdict.productionAuthorization, false);
  assert.equal(verdict.claimClass, CLAIM_CLASSES.AGI_CAPABILITY);
  assert.ok(verdict.missingEvidence.includes("signed-production-authorization"));
});

test("HTTP 200 and ALL DONE language cannot promote", () => {
  for (const claim of ["HTTP 200 so it is LIVE", "ALL DONE", "OPERATIONAL=8", "production authorized"]) {
    const verdict = rehearse({
      claim,
      owner: "a11oy",
      kind: "live_stamp",
      evidence: requiredEvidence("live_stamp"),
    });
    assert.equal(verdict.disposition, "HOLD");
    assert.equal(verdict.reason, "PROMOTION_CLAIM_REFUSED");
    assert.equal(verdict.http200IsNotLive, true);
  }
});

test("Lambda as theorem is refused even with a full evidence bag", () => {
  const verdict = rehearse({
    claim: "Lambda is a theorem",
    owner: "szl-frontier",
    kind: "product_repair",
    evidence: requiredEvidence("product_repair"),
    lambdaStatus: "THEOREM",
  });
  assert.equal(verdict.disposition, "HOLD");
  assert.equal(verdict.reason, "LAMBDA_STAYS_CONJECTURE_1");
  assert.equal(classifyClaim("Lambda is a theorem"), CLAIM_CLASSES.LAMBDA_THEOREM);
});

test("inflating locked formulas fails closed", () => {
  const verdict = rehearse({
    claim: "lock nine formulas",
    owner: "a11oy",
    kind: "product_repair",
    evidence: requiredEvidence("product_repair"),
    lockedCount: 9,
  });
  assert.equal(verdict.disposition, "HOLD");
  assert.equal(verdict.reason, "LOCKED_COUNT_MUST_STAY_8");
});

test("product repair does not imply six sibling Spaces", () => {
  const graph = impactGraph("a11oy", "product-repair");
  assert.equal(graph.known, true);
  assert.equal(graph.productScopeOnly, true);
  assert.equal(graph.verticalImplied, false);
  const verdict = rehearse({
    claim: "repair product edge only",
    owner: "a11oy",
    kind: "product_repair",
    evidence: requiredEvidence("product_repair"),
  });
  assert.equal(verdict.verticalImplied, false);
  assert.equal(verdict.disposition, "REHEARSAL_CONSISTENT");
  assert.equal(verdict.productionAuthorization, false);
  assert.equal(verdict.reason, "SCOPED_REHEARSAL_ONLY");
});

test("vertical publish without an approved plan stays incomplete", () => {
  const verdict = rehearse({
    claim: "publish vertical flagships",
    owner: "a11oy",
    kind: "vertical_publish",
    evidence: ["exact-source-sha-40"],
  });
  assert.equal(verdict.disposition, "HOLD");
  assert.ok(verdict.missingEvidence.includes("complete-approved-plan"));
  assert.equal(verdict.notRequestedIsNotPass, true);
});

test("unknown owner and static vs pages evidence stay distinct", () => {
  const unknown = rehearse({
    claim: "touch mystery repo",
    owner: "not-an-owner",
    kind: "product_repair",
    evidence: requiredEvidence("product_repair"),
  });
  assert.equal(unknown.disposition, "HOLD");
  assert.equal(unknown.reason, "UNKNOWN_OWNER_FAIL_CLOSED");
  assert.deepEqual(requiredEvidence("pages_deployment"), [
    "pages-run-id",
    "artifact-digest",
    "served-bytes-match",
  ]);
  assert.deepEqual(requiredEvidence("static_document"), [
    "expected-file-hash",
    "served-file-hash",
  ]);
});

test("even a complete live_stamp bag cannot flip productionAuthorization", () => {
  const verdict = rehearse({
    claim: "qualify product after receipts",
    owner: "a11oy",
    kind: "live_stamp",
    evidence: requiredEvidence("live_stamp"),
    productionAuthorized: true,
  });
  assert.equal(verdict.productionAuthorization, false);
  assert.equal(verdict.disposition, "HOLD");
  assert.equal(verdict.reason, "PRODUCTION_FLAG_REFUSED");
});
