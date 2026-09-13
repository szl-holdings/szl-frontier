import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-granite-patchtst-fm-r2.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-12-granite-patchtst-fm-r2");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "ibm-granite-timeseries-patchtst-fm-r2");
assert.equal(wave.candidate.publisher, "IBM");
assert.equal(wave.candidate.upstream.publishedAt, "2026-09-09");
assert.equal(wave.candidate.upstream.releaseState, "PUBLIC_DUAL_LICENSE_CHECKPOINT_WATCH");
assert.ok(wave.candidate.upstream.revisionPolicy.includes("dual-licensed Apache-2.0 and OpenMDW-1.0"));
assert.equal(wave.candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(wave.candidate.evaluation.frontierIssue, 65);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactModelPreviouslyPresent, false);

const materialChanges = wave.candidate.materialChanges.join("\n");
assert.match(materialChanges, /385M-parameter time-series foundation model/);
assert.match(materialChanges, /conformer blocks/);
assert.match(materialChanges, /GIFT-Eval/);
assert.match(materialChanges, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin the exact checkpoint revision/);
assert.match(acceptance, /recorded selection/);
assert.match(acceptance, /UNAVAILABLE/);
assert.match(acceptance, /leakage boundary/);
assert.match(acceptance, /no weight rehosting/);

assert.ok(wave.authorityChain.proofEvidence.includes("UPSTREAM_REPORTED_NOT_SZL_MEASURED"));
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);

console.log("Granite PatchTST-FM-r2 governed time-series admission contract: PASS");
