import assert from "node:assert/strict";
import test from "node:test";
import { ACTIONS } from "./adapter.ts";
import {
  COUNTERFACTUAL_SCHEMA, counterfactualCertificate, parsePreviewInput,
  PRODUCTION_BLOCKERS,
} from "./counterfactual.ts";
import { stableCanonical } from "../frontier/receipt-envelope.ts";
import { sha256Hex } from "../covenant/sha256.ts";

const when = new Date("2026-11-16T23:00:00Z");

test("server-bound baseline remains a denial despite a positive what-if scenario", async () => {
  const input = parsePreviewInput({
    kind: "collect-observation",
    assumedApproval: "approved",
    assumedOrganPaint: "ALLOW",
  });
  assert.ok(input);
  const report = await counterfactualCertificate(input, "test-user-1", when);
  assert.equal(report.schema, COUNTERFACTUAL_SCHEMA);
  assert.equal(report.actualState.policyResult, "DENY");
  assert.equal(report.actualState.approval, "UNVERIFIED");
  assert.equal(report.actualState.organPaint, "UNAVAILABLE");
  assert.equal(report.hypotheticalState.softwareWouldAllow, true);
  assert.deepEqual(report.hypotheticalState.minimumSoftwareBlockers, []);
  assert.deepEqual(report.productionBlockers, PRODUCTION_BLOCKERS);
  assert.equal(report.executionAuthorized, false);
  assert.equal(report.effectCommitted, false);
  assert.equal(report.witnessVerified, false);
  assert.equal(report.productionReady, false);
  const { reportSha256, ...body } = report;
  assert.equal(await sha256Hex(stableCanonical(body)), reportSha256);
});

test("hard deny is absorbing under approvals and imagined organ-cycle changes", async () => {
  for (const action of ACTIONS.filter((item) => item.class === "hard-deny")) {
    for (const paint of ["ALLOW", "UNAVAILABLE", "DENY"] as const) {
      const input = parsePreviewInput({
        kind: action.id, assumedApproval: "approved", assumedOrganPaint: paint,
      });
      assert.ok(input);
      const report = await counterfactualCertificate(input, "test-user-2", when);
      assert.equal(report.actualState.policyResult, "DENY");
      assert.equal(report.hypotheticalState.softwareWouldAllow, false);
      assert.deepEqual(report.hypotheticalState.minimumSoftwareBlockers, ["ABSORBING_HARD_DENY"]);
      assert.equal(report.executionAuthorized, false);
    }
  }
});

test("missing approval and missing cycle appear as distinct counterfactual blockers", async () => {
  const input = parsePreviewInput({
    kind: "rebuild-index", assumedApproval: "pending", assumedOrganPaint: "UNAVAILABLE",
  });
  assert.ok(input);
  const report = await counterfactualCertificate(input, "test-user-3", when);
  assert.deepEqual(report.hypotheticalState.minimumSoftwareBlockers, [
    "HUMAN_APPROVAL_REQUIRED", "ORGAN_CYCLE_ALLOW_REQUIRED",
  ]);
});

test("strict preview schema rejects forged and oversized/unrecognized property shapes", () => {
  const invalid = [
    null, false, [], {}, { kind: "active-recon" },
    { kind: "unknown", assumedApproval: "approved", assumedOrganPaint: "ALLOW" },
    { kind: "collect-observation", assumedApproval: "true", assumedOrganPaint: "ALLOW" },
    { kind: "collect-observation", assumedApproval: true, assumedOrganPaint: "ALLOW" },
    { kind: "collect-observation", assumedApproval: "approved", assumedOrganPaint: "DANGER" },
    { kind: "collect-observation", assumedApproval: "approved", assumedOrganPaint: true },
    { kind: "collect-observation", assumedApproval: "approved", assumedOrganPaint: "ALLOW", executionAuthorized: true },
  ];
  for (const row of invalid) assert.equal(parsePreviewInput(row), null);
});

test("the report retains an unkeyed user-bound fingerprint without a raw ID", async () => {
  const input = parsePreviewInput({
    kind: "mesh-probe", assumedApproval: "approved", assumedOrganPaint: "ALLOW",
  });
  assert.ok(input);
  const first = await counterfactualCertificate(input, "user-one-secret", when);
  const second = await counterfactualCertificate(input, "user-two-secret", when);
  assert.notEqual(first.userIdSha256, second.userIdSha256);
  assert.notEqual(first.reportSha256, second.reportSha256);
  assert.equal(JSON.stringify(first).includes("user-one-secret"), false);
  assert.equal(JSON.stringify(second).includes("user-two-secret"), false);
});
