import assert from "node:assert/strict";
import test from "node:test";
import { sourcePayload } from "./source.ts";
import {
  MODELED_CENSUS,
  MODELED_TABS,
  THREAD_AUDIT_HOLD,
  THREAD_GAPS,
  THIS_ORGAN_LANES,
  ThreadAuditError,
  WIRED_TABS,
  assertThreadAuditHold,
  threadAuditContract,
} from "./thread-audit.ts";

test("thread audit hold cannot authorize or complete a file audit", () => {
  assertThreadAuditHold();
  assert.equal(THREAD_AUDIT_HOLD.productionAuthorization, false);
  assert.equal(THREAD_AUDIT_HOLD.optionalEvaluationLiftsHold, false);
  assert.equal(THREAD_AUDIT_HOLD.fileAuditComplete, false);
  assert.equal(THREAD_AUDIT_HOLD.sourceContentFilesRead, 0);
  assert.equal(THREAD_AUDIT_HOLD.envelopeAuthority, "NONE");
});

test("encoded census keeps kernels distinct from models and UNKNOWN off zero", () => {
  assert.notEqual(MODELED_CENSUS.hfKernels, MODELED_CENSUS.hfModels);
  assert.equal(MODELED_CENSUS.filesRead, 0);
  assert.equal(MODELED_CENSUS.fileAuditComplete, false);
  assert.equal(MODELED_CENSUS.qualification, "HOLD");
});

test("this organ set and gaps stay complete", () => {
  const doc = threadAuditContract();
  assert.deepEqual(doc.thisOrganLanes, [...THIS_ORGAN_LANES]);
  assert.equal(doc.handoffLaneCount, 17);
  assert.equal(doc.workstreamCount, 34);
  assert.equal(doc.turns.length, 10);
  assert.equal(doc.gaps.length, 8);
  assert.equal(THREAD_GAPS.find((row) => row.id === "G02")?.encoded, "REFUSED");
  assert.equal(THREAD_GAPS.find((row) => row.id === "G08")?.encoded, "UNKNOWN");
  assert.equal(doc.execution.mergeProtectedMain, false);
  assert.equal(doc.execution.networkInThisPayload, false);
  assert.equal(doc.liveGitHubHeadClass, "UNAVAILABLE");
});

test("wired tabs include modeled ten plus optional and audit", () => {
  assert.equal(MODELED_TABS.length, 10);
  assert.ok(WIRED_TABS.includes("optional"));
  assert.ok(WIRED_TABS.includes("audit"));
  assert.ok(threadAuditContract().apis.includes("/api/thread-audit"));
});

test("source identity labels modeled pin separately from deployment", () => {
  const bare = sourcePayload();
  assert.equal(bare.reconciledHeadClass, "MODELED");
  assert.equal(bare.liveGitHubHeadClass, "UNAVAILABLE");
  assert.equal(bare.deploymentSourceRevisionClass, "UNAVAILABLE");
  assert.equal(bare.headMatch, "UNAVAILABLE");
  assert.equal(bare.fileAuditComplete, false);

  const match = sourcePayload({
    deploymentSourceRevision: "b3aee6443b484768d1de107449918a050fe8528d",
  });
  assert.equal(match.deploymentSourceRevisionClass, "REACHABLE");
  assert.equal(match.deploymentSourceBound, true);
  assert.equal(match.reconciledPinMatch, "MATCH");
  assert.equal(match.headMatch, "UNAVAILABLE");

  const drift = sourcePayload({
    deploymentSourceRevision: "d47c988647641fbdd20711aac6148a34fcb97ef8",
  });
  assert.equal(drift.reconciledPinMatch, "DRIFT");
  assert.equal(drift.headMatch, "UNAVAILABLE");
  assert.equal(drift.runtimeVerified, false);

  const junk = sourcePayload({ deploymentSourceRevision: "not-a-sha" });
  assert.equal(junk.deploymentSourceRevisionClass, "UNAVAILABLE");
});

test("assertThreadAuditHold is the fail-closed gate", () => {
  assert.equal(typeof assertThreadAuditHold, "function");
  assert.ok(ThreadAuditError.prototype instanceof Error);
});
