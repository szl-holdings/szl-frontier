import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-20-ternary-bonsai-2-27b.json", import.meta.url), "utf8"),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.candidate.huggingFaceRepository, "prism-ml/Ternary-Bonsai-2-27B-gguf");
assert.equal(wave.candidate.weightBearingRevision, "6ed5e12bf84b7a63069882c91dd9e9218647d17b");
assert.equal(wave.candidate.license, "Apache-2.0");
assert.equal(wave.candidate.webgpuDemoSpace, "webml-community/ternary-bonsai-2-webgpu-kernels");
assert.equal(wave.candidate.webgpuDemoRevision, "94320c9da2b7aeac5b5807c9e61d696a3c09edb5");
assert.equal(wave.upstreamClaimsAreEvidence, false);
assert.equal(wave.deduplication.inheritsQualification, false);
assert.equal(wave.deduplication.huggingfaceKernelsInventoryDoesNotQualifyThisPacking, true);
assert.equal(wave.t28Watch.firstObservation, "FIRST_OBSERVATION_NOT_PROOF_OF_NEW_RELEASE");
assert.equal(wave.t28Watch.incompleteSiblingOids, "UNKNOWN_INCOMPLETE_ARTIFACT_IDENTITIES");
assert.ok(wave.t28Watch.substantiveFiles.includes("PTQ1_0"));
assert.ok(wave.requiredEvidence.some((x) => x.includes("stock llama.cpp")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("Walsh-Hadamard")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("UNKNOWN_INCOMPLETE_ARTIFACT_IDENTITIES")));
assert.equal(wave.projection.huggingFace, "NO_SZL_REHOST_OR_RUNTIME_PROJECTION_FROM_INTAKE");
assert.equal(wave.projection["a-11-oy.com"], "UNCHANGED");
assert.equal(wave.productionDisposition, "HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.policyOrProtectionWeakened, false);
assert.ok(wave.nearbyUnpromoted.some((row) => row.id === "Qwen3.8-Omni-Flash"));
assert.ok(wave.nearbyUnpromoted.some((row) => row.id === "cua-ai/cua-s1-forms"));

console.log("Ternary Bonsai 2 27B frontier intake invariants: PASS");
