import assert from "node:assert/strict";
import test from "node:test";
import { assertUsable, evaluationLeaseBook, issueEvaluationLease, leaseState } from "./leases.ts";

test("issued evaluation lease is usable on allowed target", () => {
  const lease = issueEvaluationLease({
    capability: "observe",
    subject: "operator",
    scope: ["public"],
    ttlSeconds: 60,
    maxCalls: 2,
    allowedTargets: ["huggingface.co"],
    nowIso: "2026-09-20T16:10:00Z",
  });
  assert.equal(lease.state, "ISSUED");
  assert.equal(lease.productionAuthorization, false);
  assertUsable(lease, "huggingface.co", "2026-09-20T16:10:30Z");
});

test("expired and production stamps fail closed", () => {
  const lease = issueEvaluationLease({
    capability: "observe",
    subject: "operator",
    scope: ["public"],
    ttlSeconds: 1,
    maxCalls: 1,
    allowedTargets: ["huggingface.co"],
    nowIso: "2026-09-20T16:10:00Z",
  });
  assert.equal(leaseState(lease, "2026-09-20T16:10:02Z"), "EXPIRED");
  assert.throws(() => assertUsable(lease, "huggingface.co", "2026-09-20T16:10:02Z"), /LEASE_EXPIRED/);
  assert.throws(
    () => assertUsable({ ...lease, productionAuthorization: false, state: "ISSUED" }, "a-11-oy.com", "2026-09-20T16:10:00Z"),
    /LEASE_TARGET_DENIED/,
  );
});

test("publisher deploy lease is revoked in the evaluation book", () => {
  const book = evaluationLeaseBook();
  const deploy = book.leases.find((l) => l.capability === "publisher.deploy");
  assert.equal(deploy?.state, "REVOKED");
  assert.equal(book.productionAuthorization, false);
});
