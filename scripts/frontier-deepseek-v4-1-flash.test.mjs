import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-14-deepseek-v4-1-flash.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-14-deepseek-v4-1-flash");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.changeTransport, "branch-and-pull-request");
assert.equal(wave.policy.noWeightRehostingForInventory, true);

assert.equal(wave.candidate.id, "deepseek-v4-1-flash-2026-09-10");
assert.equal(wave.candidate.repository, "deepseek-ai/DeepSeek-V4.1-Flash");
assert.equal(wave.candidate.priority, "P0");
assert.equal(wave.candidate.upstream.observedRevision, "df42c109f1defefcbfcedbe7d905718a12266e40");
assert.equal(wave.candidate.upstream.licenseDeclared, "mit");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 134);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);

const material = wave.candidate.materialChanges.join("\n");
assert.match(material, /552B backbone/);
assert.match(material, /40-layer Causal Encoder-Decoder/);
assert.match(material, /8B active parameters per token during prefill and 16B during decode/);
assert.match(material, /Compressed Sparse Attention 2/);
assert.match(material, /SWA Bounded Replay/);
assert.match(material, /890 bytes per token/);
assert.match(material, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);
assert.match(material, /1,048,576 max positions/);
assert.match(material, /384 routed experts plus one shared expert/);
assert.match(material, /Engram conditional memory/);
assert.match(material, /DSpark speculative decoding/);
assert.match(material, /no Jinja chat template/);
assert.match(material, /deepseek-recipe/);
assert.match(material, /MIT licensing/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin exact Hub revision df42c109/);
assert.match(acceptance, /Do not rehost upstream weights merely for inventory/);
assert.match(acceptance, /Correctness precedes performance/);
assert.match(acceptance, /generic Jinja fallback must fail/);
assert.match(acceptance, /exact supported serving-engine, CUDA\/driver and accelerator identity/);
assert.match(acceptance, /unsupported prerequisites are UNAVAILABLE/);
assert.match(acceptance, /Qualify DSpark or other MTP speculative execution independently/);
assert.match(acceptance, /immutable digest/);
assert.match(acceptance, /rollback to the incumbent path/);
assert.match(acceptance, /automatic promotion false/);

assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/szl-serve"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/szl-gpu-bridge"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/a11oy"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/a11oy-net"));

assert.match(wave.authorityChain.huggingFaceProjection, /No SZLHOLDINGS weight mirror/);
assert.match(wave.authorityChain.productRuntime, /No a-11-oy\.com route/);
assert.match(wave.authorityChain.proofEvidence, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.alignment.claimBoundary, /does not establish model quality/);

console.log("DeepSeek-V4.1-Flash governed evaluation contract: PASS");
