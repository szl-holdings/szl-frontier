import assert from "node:assert/strict";
import fs from "node:fs";

const path = new URL("../frontier/waves/2026-09-11-hf-ghlore-030-project-memory.json", import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(wave.schema, "szl.frontier.wave.v1");
assert.equal(wave.candidate, "huggingface/ghlore");
assert.equal(wave.source.revision, "87290a46c79e26ebb0d47575263b7ee34c1c1390");
assert.equal(wave.source.predecessorRevision, "82fd2b25be9205025afa43c334a578307b95d7b4");
assert.equal(wave.source.commitsAheadOfPredecessor, 19);
assert.equal(wave.source.formalGitHubReleaseObserved, false);
assert.equal(wave.disposition, "HOLD");
assert.equal(wave.evaluationOnly, true);

for (const key of [
  "productionAuthorized",
  "automaticPromotionAuthorized",
  "a11oyExposureAuthorized",
  "upstreamWriteAuthorized",
  "privateCorpusAuthorized",
]) {
  assert.equal(wave[key], false, `${key} must remain denied`);
}

const gates = new Set(wave.requiredEvaluation);
for (const required of [
  "wire-version-mismatch-refusal",
  "trust-network-default-off-and-perimeter-negative-path",
  "read-only-ingestion-and-zero-upstream-write-authority",
  "per-line-untrusted-content-boundary",
  "repo-scoped-inflight-claim-correctness",
  "citation-url-freshness-and-truncation-correctness",
  "stale-history-prompt-injection-bot-self-output-and-empty-result-negative-paths",
  "retention-deletion-unavailable-backend-and-rollback-disable",
]) {
  assert.ok(gates.has(required), `missing required evaluation gate: ${required}`);
}

const risks = wave.riskBoundaries.join("\n");
assert.match(risks, /trust-network remains disabled/i);
assert.match(risks, /untrusted data/i);
assert.match(risks, /advisory evidence/i);
assert.match(risks, /no moving-main dependency/i);

console.log("Ghlore 0.3.0 frontier HOLD contract: PASS");
