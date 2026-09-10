import assert from "node:assert/strict";
import fs from "node:fs";

const wave = JSON.parse(fs.readFileSync("frontier/waves/2026-09-10-hf-core-stack.json", "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

const byRepo = Object.fromEntries(wave.releases.map((x) => [x.repository, x]));
assert.equal(byRepo["huggingface/transformers"].version, "5.17.0");
assert.equal(byRepo["huggingface/transformers"].revision, "856157a2f3e9594954310df18fdccc31ffddebe9");
assert.equal(byRepo["huggingface/accelerate"].version, "1.15.0");
assert.equal(byRepo["huggingface/accelerate"].revision, "6afc1e5ee217051fde702b23de2813344dc0fd33");
assert.equal(byRepo["huggingface/trl"].version, "1.13.0");
assert.equal(byRepo["huggingface/trl"].revision, "3d9261f1fec9f9a8140099c78a65c7da73dce79c");
for (const release of wave.releases) {
  assert.match(release.revision, /^[0-9a-f]{40}$/);
  assert.match(release.tagObject, /^[0-9a-f]{40}$/);
  assert.match(release.qualificationBoundary, /only|compatibility|evaluation/i);
}

assert.ok(wave.deduplication.excludedAlreadyRepresented.some((x) => /Hy4/.test(x)));
assert.ok(wave.deduplication.excludedAlreadyRepresented.some((x) => /NeoMME/.test(x)));
assert.ok(wave.deduplication.excludedAlreadyRepresented.some((x) => /Kernel Hub 0\.16\.1/.test(x)));

const required = wave.evaluation.required.join("\n");
assert.match(required, /UNAVAILABLE/);
assert.match(required, /removed PPO APIs/);
assert.match(required, /no-unconditional-download/);
assert.match(required, /rollback/i);

assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/.github#728 HF inventory predicate/scope mismatch"));
assert.ok(wave.alignment.independentDriftNotSuperseded.includes("szl-holdings/lyte-services#18 Lyte source projection mismatch"));

console.log("HF core-stack governed evaluation contract: PASS");
