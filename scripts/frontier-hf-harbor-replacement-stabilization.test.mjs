import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-hf-harbor-replacement-stabilization.json", import.meta.url),
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
  "59756acf33bcdf4c63ab9a5cf30b9bcc7d0caa30",
);
assert.equal(
  wave.candidate.upstream.priorObservedRevision,
  "dafc6a3c0a98f806d23f26cd5438ceb8367390ec",
);
assert.deepEqual(wave.candidate.upstream.upstreamPullRequests, [221, 222, 223]);
assert.equal(wave.candidate.upstream.releaseState, "MAIN_ONLY_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.trackingIssue, 227);
assert.equal(wave.candidate.evaluation.frontierIssue, 104);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.priorPullRequest, 95);
assert.equal(wave.deduplication.implementationIssue, "szl-holdings/szl-forge#227");

const changes = wave.candidate.materialChanges.join("\n");
assert.match(changes, /native task names/i);
assert.match(changes, /immutable run configuration/i);
assert.match(changes, /normalizes JSON number transport/i);
assert.match(changes, /unacknowledged owned Hugging Face parent error/i);
assert.match(changes, /new errors require new review/i);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /integral-float normalization/i);
assert.match(acceptance, /non-finite values/i);
assert.match(acceptance, /fallback hash/i);
assert.match(acceptance, /task names and task IDs/i);
assert.match(acceptance, /grants nothing and starts no work/i);
assert.match(acceptance, /must not launch another parent/i);
assert.match(acceptance, /existing run lock/i);
assert.match(acceptance, /new review/i);
assert.match(acceptance, /native Harbor trial retries/i);
assert.match(acceptance, /anti-double-counting/i);
assert.match(acceptance, /private Dataset\/LFS\/provider-secret isolation/i);
assert.match(acceptance, /rollback/i);
assert.match(acceptance, /no paid Job/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /no SZL Harbor worker/i);
assert.match(wave.authorityChain.productRuntime, /no a-11-oy\.com product route/i);
assert.match(wave.authorityChain.proofEvidence, /HOLD/);
assert.match(wave.alignment.claimBoundary, /do not authorize paid execution/i);
assert.match(wave.alignment.claimBoundary, /do not qualify a model or production route/i);

console.log("Harbor replacement stabilization governed successor: PASS");
