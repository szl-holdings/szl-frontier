import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-vlm-run-gateway.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-12-vlm-run-gateway");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "vlm-run-gateway-unified-visual-api");
assert.equal(wave.candidate.upstream.publishedAt, "2026-09-04");
assert.equal(wave.candidate.upstream.releaseState, "ALPHA_FREE_TIER_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 102);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactServicePreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /OCR VLMs and ViT-based vision models/);
assert.match(materialChanges, /quantized variants served under one model-id/);
assert.match(materialChanges, /not certified by the provider/);
assert.match(materialChanges, /unverified until configuration-pinned receipts exist/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin the exact vlmrun client version/);
assert.match(acceptance, /UNAVAILABLE/);
assert.match(acceptance, /SZL-owned serving/);
assert.match(acceptance, /no paid provider use/);

assert.ok(wave.authorityChain.proofEvidence.includes("HOLD until configuration-pinned"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

console.log("VLM Run Gateway governed third-party-gateway admission contract: PASS");
