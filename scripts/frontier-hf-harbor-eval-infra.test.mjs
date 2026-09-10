import assert from "node:assert/strict";
import fs from "node:fs";

const wave = JSON.parse(fs.readFileSync("frontier/waves/2026-09-10-hf-harbor-eval-infra.json", "utf8"));
assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.repository, "huggingface/harbor-hf");
assert.equal(wave.candidate.upstream.observedRevision, "b64bf326dc5193675da84c560a37e04759c8289a");
assert.match(wave.candidate.upstream.observedRevision, /^[0-9a-f]{40}$/);
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /UNAVAILABLE is valid evidence/i);
assert.match(acceptance, /Do not grant deployment, merge, secret, provider-write or production-route authority/i);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
console.log("Harbor evaluation infrastructure governed intake: PASS");
