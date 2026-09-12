import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-11-hf-harbor-local-parent-artifacts.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.changeTransport, "branch-and-pull-request");
assert.equal(wave.policy.noWeightRehostingForInventory, true);

assert.equal(wave.candidate.repository, "huggingface/harbor-hf");
assert.equal(wave.candidate.upstream.observedRevision, "ec1020c77cd3c159c91b7d1d68639317fb133c32");
assert.equal(wave.candidate.upstream.priorObservedRevision, "8685727908e8d9ee5ccde48586864a851e24ff79");
assert.equal(wave.candidate.upstream.releaseState, "MAIN_ONLY_WATCH");
assert.equal(wave.candidate.upstream.commitSignatureVerified, true);

assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 227);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.trackingIssue, 83);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#227");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /local Harbor-controlled execution/i);
assert.match(changes, /artifact handoff boundary/i);
assert.match(changes, /retaining Harbor execution authority/i);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /content digest/i);
assert.match(acceptance, /acknowledgement event/i);
assert.match(acceptance, /cancellation/i);
assert.match(acceptance, /credential or private-data propagation/i);
assert.match(acceptance, /rollback/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.match(wave.authorityChain.productRuntime, /no A11oy product route/i);

console.log("Harbor local-parent artifact handoff governed successor: PASS");
