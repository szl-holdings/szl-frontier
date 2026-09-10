import assert from "node:assert/strict";
import fs from "node:fs";

const path = "frontier/waves/2026-09-10-hf-hub-130-repo-revision-binding.json";
const wave = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.match(wave.sourceRevisionObserved, /^[0-9a-f]{40}$/);

assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);

const candidate = wave.candidate;
assert.equal(candidate.repository, "huggingface/huggingface_hub");
assert.equal(candidate.release.version, "1.30.0");
assert.equal(candidate.release.releaseCommit, "48ef2781c2c4c2247431c97efcd5487e89d42732");
assert.equal(candidate.release.annotatedTagObject, "103720584dcc9865259dc5165f1a42e0bdea15d5");
assert.match(candidate.release.releaseCommit, /^[0-9a-f]{40}$/);
assert.match(candidate.release.annotatedTagObject, /^[0-9a-f]{40}$/);
assert.equal(candidate.release.tagSignatureVerified, false);
assert.equal(candidate.release.license, "Apache-2.0");
assert.equal(candidate.status, "EVALUATION");

assert.match(candidate.riskBoundaries.resolvedRevision, /repo_id, repo_type, requested revision, and resolved exact commit/i);
assert.match(candidate.riskBoundaries.inferenceEligibility, /cannot add a model to an SZL serving allowlist/i);
assert.match(candidate.riskBoundaries.specializedPins, /Do not blanket-upgrade/i);

const security = candidate.predecessorSecurityBaseline.requirements.join("\n");
assert.match(security, /bucket-sync validation/i);
assert.match(security, /safetensors.*pickle/i);

assert.equal(wave.estateAlignment.a11oyAuditPin, "1.30.0");
assert.equal(wave.estateAlignment.a11oyRuntimeDockerPinObserved, "1.29.0");
assert.equal(wave.estateAlignment.classification, "TARGETED_CLIENT_VERSION_AND_PROVENANCE_DRIFT");

const acceptance = wave.acceptance.join("\n");
assert.match(acceptance, /repository identity is part of any resolved-revision authority decision/i);
assert.match(acceptance, /Reject or re-resolve any revision object/i);
assert.match(acceptance, /cannot bypass the estate's own model allowlist/i);
assert.match(acceptance, /Keep production disposition HOLD/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.alignment.claimBoundary, /does not itself establish product-to-Hub artifact parity/i);

console.log("HF Hub 1.30 repo-aware revision binding governed intake: PASS");
