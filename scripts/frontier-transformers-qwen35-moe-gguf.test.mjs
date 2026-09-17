import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-15-transformers-qwen35-moe-gguf.json", import.meta.url), "utf8"),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#164");
assert.equal(wave.candidate.upstreamRepository, "huggingface/transformers");
assert.equal(wave.candidate.upstreamRevision, "26d8e7164fb94b5f5b004c03d6c405ab083a56c7");
assert.equal(wave.candidate.upstreamPullRequest, 48529);
assert.equal(wave.candidate.productionDisposition, "HOLD");
assert.equal(wave.deduplication.existingDenseReceiptsQualifyMoe, false);
assert.equal(wave.deduplication.inheritsQualification, false);
assert.ok(wave.requiredEvidence.some((x) => x.includes("SoftmaxTopKRouter")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("RMSNormZeroCentered")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("quantization error")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("fail-closed")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("rollback")));
assert.equal(wave.projection["a-11-oy.com"], "UNCHANGED");
assert.equal(wave.productionDisposition, "HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log("Transformers Qwen3.5-MoE GGUF frontier watch invariants: PASS");
