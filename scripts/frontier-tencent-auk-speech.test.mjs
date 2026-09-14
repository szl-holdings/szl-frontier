import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-14-tencent-auk-speech.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.wave, "2026-09-14-tencent-auk-speech");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.id, "tencent-auk-speech-family-2026-09-09");
assert.equal(wave.candidate.priority, "P0");
assert.deepEqual(wave.candidate.repositories, ["tencent/AuK", "tencent/AuK-Flash"]);
assert.equal(wave.candidate.upstream.observedRevisions["tencent/AuK"], "43c9447eb0a8085d1694b2eb4963051dda8ed231");
assert.equal(wave.candidate.upstream.observedRevisions["tencent/AuK-Flash"], "575b92f0895f75180bf2cbd35f2e176c5732b8ed");
assert.equal(wave.candidate.upstream.licenseDeclared, "mit");
assert.equal(wave.candidate.evaluation.frontierIssue, 136);
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.deduplication.exactRevisionPreviouslyPresent, false);

const material = wave.candidate.materialChanges.join("\n");
assert.match(material, /1.5B speech foundation model family/);
assert.match(material, /TTS/);
assert.match(material, /content editing/);
assert.match(material, /acoustic editing/);
assert.match(material, /paralinguistic editing/);
assert.match(material, /source separation/);
assert.match(material, /4-step generation and editing/);
assert.match(material, /jointly trained speech\/audio\/music VAE/);
assert.match(material, /SGLang-Omni serving support/);
assert.match(material, /MIT licensing/);
assert.match(material, /provenance and consent boundary/);
assert.match(material, /UPSTREAM_REPORTED_NOT_SZL_MEASURED/);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Pin the exact AuK and AuK-Flash Hub revisions/);
assert.match(acceptance, /Do not rehost weights merely for inventory/);
assert.match(acceptance, /Evaluate AuK and AuK-Flash independently/);
assert.match(acceptance, /deterministic, non-sensitive fixtures/);
assert.match(acceptance, /authorized synthetic or consented reference audio/);
assert.match(acceptance, /Public-figure impersonation/);
assert.match(acceptance, /SGLang-Omni/);
assert.match(acceptance, /malformed and oversized audio/);
assert.match(acceptance, /source-audio hash, instruction hash, model\/runtime revision and output hash/);
assert.match(acceptance, /automatic production promotion false/);

assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/szl-serve"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/szl-gpu-bridge"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/a11oy"));
assert.ok(wave.candidate.evaluation.relatedOwners.includes("szl-holdings/a11oy-net"));
assert.match(wave.authorityChain.huggingFaceProjection, /No SZLHOLDINGS model mirror/);
assert.match(wave.authorityChain.productRuntime, /No a-11-oy\.com speech route/);
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.alignment.claimBoundary, /does not establish voice identity rights/);

console.log("Tencent AuK governed speech evaluation contract: PASS");
