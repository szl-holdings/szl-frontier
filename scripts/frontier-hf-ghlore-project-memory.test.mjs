import assert from "node:assert/strict";
import fs from "node:fs";

const wave = JSON.parse(fs.readFileSync("frontier/waves/2026-09-09-hf-ghlore-project-memory.json", "utf8"));
assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceRevisionObserved, "77186cdaab11435638668f64d84e0808efd8291d");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.repository, "huggingface/ghlore");
assert.equal(wave.candidate.upstream.observedRevision, "82fd2b25be9205025afa43c334a578307b95d7b4");
assert.equal(wave.candidate.status, "EVALUATION");
assert.match(wave.candidate.evaluation.security.join("\n"), /read-only/i);
assert.match(wave.candidate.evaluation.security.join("\n"), /untrusted data/i);
assert.match(wave.candidate.evaluation.acceptance.join("\n"), /prompt-injection/i);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/.github#728 HF inventory predicate/scope mismatch"));
assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/lyte-services#18 Lyte source projection mismatch"));
console.log("ghlore governed intake v3: PASS");
