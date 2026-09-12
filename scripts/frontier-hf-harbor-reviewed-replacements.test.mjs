import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-hf-harbor-reviewed-replacements.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.changeTransport, "branch-and-pull-request");
assert.equal(wave.policy.noWeightRehostingForInventory, true);

assert.equal(wave.candidate.repository, "huggingface/harbor-hf");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "dafc6a3c0a98f806d23f26cd5438ceb8367390ec",
);
assert.equal(
  wave.candidate.upstream.priorObservedRevision,
  "ec1020c77cd3c159c91b7d1d68639317fb133c32",
);
assert.equal(wave.candidate.upstream.upstreamPullRequest, 220);
assert.equal(wave.candidate.upstream.commitSignatureVerified, true);
assert.equal(wave.candidate.upstream.releaseState, "MAIN_ONLY_WATCH");

assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 227);
assert.equal(wave.candidate.evaluation.frontierIssue, 94);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.priorPullRequest, 89);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#227");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /operator-reviewed replacement runs/i);
assert.match(changes, /preserves original executions and artifacts/i);
assert.match(changes, /native aggregation/i);
assert.match(changes, /selected-cohort cost coverage/i);
assert.match(changes, /leaderboard pooling/i);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /score-based selection is denied/i);
assert.match(acceptance, /immutable evidence/i);
assert.match(acceptance, /source drift/i);
assert.match(acceptance, /overlapping replacement batches/i);
assert.match(acceptance, /idempotency/i);
assert.match(acceptance, /native Harbor aggregation contract/i);
assert.match(acceptance, /cannot be pooled as independent leaderboard observations/i);
assert.match(acceptance, /all-incurred cost coverage/i);
assert.match(acceptance, /private Dataset, LFS and provider-secret isolation/i);
assert.match(acceptance, /rollback/i);
assert.match(acceptance, /paid execution/i);

assert.equal(
  wave.candidate.upstreamReportedValidation.classification,
  "UPSTREAM_REPORTED_NOT_SZL_MEASURED",
);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /no SZL Harbor worker/i);
assert.match(wave.authorityChain.productRuntime, /no a-11-oy\.com product route/i);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.match(wave.alignment.claimBoundary, /do not convert repeated or repaired benchmark evidence into independent observations/i);
assert.match(wave.alignment.claimBoundary, /do not authorize paid replacement execution/i);

console.log("Harbor reviewed replacement-run governed successor: PASS");
