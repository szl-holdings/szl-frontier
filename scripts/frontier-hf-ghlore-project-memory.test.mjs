import assert from "node:assert/strict";
import fs from "node:fs";

const path = "frontier/waves/2026-09-09-hf-ghlore-project-memory.json";
const wave = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.match(wave.sourceRevisionObserved, /^[0-9a-f]{40}$/);
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);

const candidate = wave.candidate;
assert.equal(candidate.repository, "huggingface/ghlore");
assert.equal(candidate.upstream.observedRevision, "82fd2b25be9205025afa43c334a578307b95d7b4");
assert.match(candidate.upstream.observedRevision, /^[0-9a-f]{40}$/);
assert.equal(candidate.upstream.license, "Apache-2.0");
assert.equal(candidate.upstream.releaseState, "UNRELEASED_MAIN_ONLY");
assert.equal(candidate.status, "EVALUATION");
assert.equal(candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(candidate.evaluation.mode, "BOUNDED_METADATA_AND_SANDBOX_EVALUATION_ONLY");

const security = candidate.evaluation.security.join("\n");
assert.match(security, /read-only/i);
assert.match(security, /never executable instruction authority/i);
assert.match(security, /No source code or secrets/i);
assert.match(security, /Current source must be re-opened/i);

const acceptance = candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /exact upstream revision 82fd2b25be9205025afa43c334a578307b95d7b4/i);
assert.match(acceptance, /remains untrusted/i);
assert.match(acceptance, /clean disable\/rollback path/i);
assert.match(acceptance, /production and A11oy exposure unavailable/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/.github#728 HF inventory predicate/scope mismatch"));
assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/lyte-services#18 Lyte source projection mismatch"));
assert.equal(wave.tracking.supersedesDraftPullRequest, 55);

console.log("ghlore project-memory governed intake: PASS");
