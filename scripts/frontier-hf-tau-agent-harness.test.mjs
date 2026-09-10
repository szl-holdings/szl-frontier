import assert from "node:assert/strict";
import fs from "node:fs";

const wave = JSON.parse(
  fs.readFileSync("frontier/waves/2026-09-09-hf-tau-agent-harness.json", "utf8"),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.match(wave.sourceRevisionObserved, /^[0-9a-f]{40}$/);
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);

const candidate = wave.candidate;
assert.equal(candidate.repository, "huggingface/tau");
assert.equal(
  candidate.upstream.observedRevision,
  "bdbc72baa071d568528bd1b2b07b90dc0e0bf0c4",
);
assert.match(candidate.upstream.observedRevision, /^[0-9a-f]{40}$/);
assert.equal(candidate.upstream.license, "MIT");
assert.equal(candidate.status, "EVALUATION");

assert.equal(candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(candidate.evaluation.mode, "BOUNDED_SANDBOX_ONLY");

const security = candidate.evaluation.security.join("\n");
assert.match(security, /no autonomous merge or deploy authority/i);
assert.match(security, /no secret or branch-protection mutation authority/i);
assert.match(security, /fail closed/i);
assert.match(security, /untrusted inputs/i);
assert.match(security, /explicit evaluation workspace/i);

const acceptance = candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /exact upstream revision/i);
assert.match(acceptance, /fixed non-secret repository/i);
assert.match(acceptance, /subprocess isolation/i);
assert.match(acceptance, /provider-unavailable/i);
assert.match(acceptance, /forbidden-command/i);
assert.match(acceptance, /clean disable\/rollback/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.ok(wave.alignment.independentDriftNotSuperseded.includes(
  "szl-holdings/.github#728 HF inventory predicate/scope mismatch",
));
assert.ok(wave.alignment.independentDriftNotSuperseded.includes(
  "szl-holdings/lyte-services#18 Lyte source projection mismatch",
));

console.log("Tau frontier intake: PASS (exact-source, bounded authority, HOLD)");
