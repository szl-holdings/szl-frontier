import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-k2-horizon-mova-36b-a4b.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-12-k2-horizon-mova-36b-a4b");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "ifm-k2-horizon-mova-36b-a4b");
assert.equal(wave.candidate.publisher, "IFM");
assert.equal(wave.candidate.upstream.observedRevision, "05cab0a4d7150c1c460a000b37ff40cc1af2feaa");
assert.equal(wave.candidate.upstream.licenseDeclared, "apache-2.0");
assert.equal(wave.candidate.upstream.releaseState, "PUBLIC_OPEN_WEIGHTS_WATCH");
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 100);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /36B parameters and activating about 4B per token/);
assert.match(materialChanges, /524,288-token context/);
assert.match(materialChanges, /trust_remote_code review/);
assert.match(materialChanges, /tool_call_format json\/xml\/xml_typed/);
assert.match(materialChanges, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);
assert.match(materialChanges, /promised but not yet published/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin the exact Hub revision/);
assert.match(acceptance, /trust_remote_code review/);
assert.match(acceptance, /tool-call formats/);
assert.match(acceptance, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);
assert.match(acceptance, /automatic promotion false/);

assert.ok(wave.authorityChain.huggingFaceProjection.includes("no SZL model rehosting"));
assert.ok(wave.authorityChain.proofEvidence.includes("UPSTREAM_REPORTED_NOT_SZL_MEASURED"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

console.log("K2-Horizon-MoVA-36B-A4B governed model-admission contract: PASS");
