import assert from "node:assert/strict";
import fs from "node:fs";

const wave = JSON.parse(
  fs.readFileSync("frontier/waves/2026-09-10-hf-tau-0-4-2-release.json", "utf8"),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.match(wave.sourceRevisionObserved, /^[0-9a-f]{40}$/);
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);

const candidate = wave.candidate;
assert.equal(candidate.repository, "huggingface/tau");
assert.equal(candidate.release.name, "Tau 0.4.2");
assert.equal(candidate.release.tag, "v0.4.2");
assert.equal(
  candidate.release.revision,
  "55df51608b8b2d172c4bbac2cd11e8345e307476",
);
assert.match(candidate.release.revision, /^[0-9a-f]{40}$/);
assert.equal(candidate.release.prerelease, false);
assert.equal(candidate.release.license, "MIT");
assert.equal(candidate.status, "EVALUATION");

assert.equal(
  candidate.supersedesForEvaluation.revision,
  "bdbc72baa071d568528bd1b2b07b90dc0e0bf0c4",
);
assert.equal(candidate.supersedesForEvaluation.historicalReceiptPreserved, true);
assert.equal(candidate.evaluation.owner, "szl-holdings/szl-forge");
assert.equal(candidate.evaluation.mode, "BOUNDED_SANDBOX_ONLY");

const material = candidate.materialChanges.join("\n");
assert.match(material, /custom_message/i);
assert.match(material, /Codex subscription model-catalog/i);
assert.match(material, /backward-compatible replay/i);
assert.match(material, /incomplete Anthropic-compatible SSE/i);
assert.match(material, /shell stdin disconnection/i);

const security = candidate.evaluation.security.join("\n");
assert.match(security, /no autonomous merge or deploy authority/i);
assert.match(security, /no secret or branch-protection mutation authority/i);
assert.match(security, /cannot authorize a new provider, model, route or production default/i);
assert.match(security, /untrusted inputs/i);
assert.match(security, /explicit evaluation workspace/i);

const acceptance = candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /55df51608b8b2d172c4bbac2cd11e8345e307476/i);
assert.match(acceptance, /pre-0\.4\.2 session fixtures/i);
assert.match(acceptance, /custom_message persistence/i);
assert.match(acceptance, /interleaved reasoning\/answer ordering/i);
assert.match(acceptance, /live Codex catalog additions\/removals/i);
assert.match(acceptance, /rollback\/disable/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.equal(wave.alignment.productProjectionAuthorized, false);
assert.equal(wave.alignment.proofProjectionAuthorized, false);
assert.ok(
  wave.alignment.independentDriftNotSuperseded.includes(
    "szl-holdings/.github#728 public inventory/profile declaration convergence",
  ),
);
assert.ok(
  wave.alignment.independentDriftNotSuperseded.includes(
    "szl-holdings/a11oy#2010 lyte:SOURCE_REVISION_MISMATCH",
  ),
);

console.log("Tau 0.4.2 successor wave: PASS (stable exact release, EVALUATION/HOLD)");
