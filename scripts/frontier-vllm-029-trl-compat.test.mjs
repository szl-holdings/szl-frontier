import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-13-vllm-0.29-trl-compatibility.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-13-vllm-0.29-trl-compatibility");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "vllm-v0.29.0-trl-compatibility-boundary");
assert.equal(wave.candidate.upstream.observedRevision, "98dff2a81d747d1dba01a47f939f48c3526d4206");
assert.equal(wave.candidate.upstream.companionRevision, "huggingface/trl@488a0d34be07c7cb2c130e8ba44cb9a4103717b2");
assert.equal(wave.candidate.upstream.license, "Apache-2.0");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 121);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactTagPreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /Model Runner V2 the default execution path/);
assert.match(materialChanges, /prefix-cache behavior/);
assert.match(materialChanges, /sharded and rank-local paths/);
assert.match(materialChanges, /<=0\.28\.0 to <=0\.29\.0/);
assert.match(materialChanges, /Supplements rather than replaces #76/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Bind exact vLLM tag commit/);
assert.match(acceptance, /Model Runner V2 default behavior/);
assert.match(acceptance, /do not silently accept a fallback as a V2 pass/);
assert.match(acceptance, /UNAVAILABLE/);
assert.match(acceptance, /a11oy#2143/);
assert.match(acceptance, /No weight rehosting/);

assert.ok(wave.authorityChain.proofEvidence.includes("release discovery and TRL's version-range update grant nothing"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.ok(wave.alignment.claimBoundary.includes("a11oy#2143"));

console.log("vLLM 0.29 + TRL compatibility governed admission contract: PASS");
