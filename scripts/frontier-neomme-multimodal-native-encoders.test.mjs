import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-neomme-multimodal-native-encoders.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-12-neomme-multimodal-native-encoders");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "hcompany-neomme-multimodal-encoders");
assert.equal(wave.candidate.publisher, "H Company");
assert.equal(wave.candidate.upstream.publishedAt, "2026-09-03");
assert.equal(wave.candidate.upstream.releaseState, "PUBLIC_APACHE2_CHECKPOINTS_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 80);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactFamilyPreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /260M and 800M/);
assert.match(materialChanges, /no separate vision tower/);
assert.match(materialChanges, /masked discrete-diffusion/);
assert.match(materialChanges, /late-interaction/);
assert.match(materialChanges, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);
assert.match(materialChanges, /references transformers main/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin exact checkpoint revisions/);
assert.match(acceptance, /retrieval-bench/);
assert.match(acceptance, /UNAVAILABLE/);
assert.match(acceptance, /compression/);
assert.match(acceptance, /no weight rehosting/);

assert.ok(wave.authorityChain.proofEvidence.includes("UPSTREAM_REPORTED_NOT_SZL_MEASURED"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

console.log("NeoMME multimodal-native encoder governed admission contract: PASS");
