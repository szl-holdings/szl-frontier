import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wavePath = new URL("../frontier/waves/2026-09-15-hf-tei-v1.9.4.json", import.meta.url);
const wave = JSON.parse(readFileSync(wavePath, "utf8"));

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#162");

assert.equal(wave.candidate.upstreamRepository, "huggingface/text-embeddings-inference");
assert.equal(wave.candidate.upstreamTag, "v1.9.4");
assert.match(wave.candidate.upstreamRevision, /^[0-9a-f]{40}$/);
assert.equal(wave.candidate.upstreamRevision, "e80ef225ed0e6cb1717ce632a6a84b6cf211bb67");
assert.equal(wave.candidate.productionDisposition, "HOLD");

assert.equal(wave.deduplication.canonicalTeiWavePreviouslyFound, false);
assert.equal(wave.deduplication.legacyReferencesAuthorizeUpgrade, false);
assert.equal(wave.deduplication.inheritsQualification, false);

assert.ok(wave.requiredEvidence.length >= 8);
assert.ok(wave.requiredEvidence.some((item) => item.includes("PaddedBatch")));
assert.ok(wave.requiredEvidence.some((item) => item.includes("UNAVAILABLE")));
assert.ok(wave.requiredEvidence.some((item) => item.includes("rollback")));
assert.ok(wave.requiredEvidence.some((item) => item.includes("provenance")));

assert.equal(wave.projection.huggingFace, "NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED");
assert.equal(wave.projection["a-11-oy.com"], "UNCHANGED");
assert.equal(wave.productionDisposition, "HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log("HF TEI v1.9.4 frontier intake invariants: PASS");
