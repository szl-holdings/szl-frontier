import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-trl-grpo-structured-output-recipe.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-12-trl-grpo-structured-output-recipe");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.id, "hf-blog-trl-grpo-structured-output-recipe");
assert.equal(wave.candidate.publisher, "Hugging Face");
assert.equal(wave.candidate.upstream.publishedAt, "2026-09-03");
assert.equal(wave.candidate.upstream.releaseState, "PUBLISHED_RECIPE_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 101);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRecipePreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /LFM2\.5-350M/);
assert.match(materialChanges, /json_format_reward/);
assert.match(materialChanges, /field_count_reward/);
assert.match(materialChanges, /schema_validation_reward/);
assert.match(materialChanges, /22\.6 percent to 29\.7 percent/);
assert.match(materialChanges, /still below the upstream-reported Qwen3\.5-2B/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin exact TRL/);
assert.match(acceptance, /UNAVAILABLE/);
assert.match(acceptance, /upstream-reported scores/);
assert.match(acceptance, /reward functions/);
assert.match(acceptance, /automatic promotion false/);
assert.match(acceptance, /merged-adapter serving parity/);

assert.ok(wave.authorityChain.huggingFaceProjection.includes("no SZL model"));
assert.ok(wave.authorityChain.proofEvidence.includes("UPSTREAM_REPORTED_NOT_SZL_MEASURED"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

console.log("TRL GRPO structured-output recipe governed evaluation contract: PASS");
