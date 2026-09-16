import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-16-sglang-deepseek-v41-kernel-stack.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.equal(wave.sourceRevisionObserved, "81d787df65791384b5629ca1b80b4c3f179eef3c");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#134");
assert.equal(wave.companionTrackingIssue, "szl-holdings/szl-frontier#168");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);

const candidate = wave.candidate;
assert.equal(candidate.id, "sglang-deepseek-v41-sparse-indexer-kernel-stack");
assert.equal(candidate.upstreamRepository, "sgl-project/sglang");
assert.equal(candidate.upstreamRevision, "faaff1eca8876b8b77d8704f080c3ee2064b8b65");
assert.equal(candidate.upstreamPullRequest, 39648);
assert.equal(candidate.ancestryVerified, true);
assert.equal(candidate.inheritsQualification, false);
assert.equal(candidate.productionDisposition, "HOLD");

const predecessors = Object.fromEntries(
  candidate.includedPredecessors.map((entry) => [entry.pullRequest, entry.revision]),
);
assert.equal(predecessors[39646], "91f691c4907739438e86ecb4e07dbd77cb93912f");
assert.equal(predecessors[39547], "954bb6804a6331bbf6e5ff88675f972aaf0f12b2");

assert.ok(candidate.deduplicatesUnder.includes("szl-holdings/szl-frontier#134"));
assert.ok(candidate.relatedButNonTransferringWaves.includes("szl-holdings/szl-frontier#150"));
assert.equal(candidate.executionOwners.independentModelAndKernelOracles, "szl-holdings/szl-forge#310");
assert.equal(candidate.executionOwners.servingProtocolFailureAndRollback, "szl-holdings/szl-serve#9");
assert.equal(candidate.executionOwners.acceleratorRuntimeAndMemoryClosure, "szl-holdings/szl-gpu-bridge#102");

assert.equal(candidate.upstreamEvidenceBoundary.newSparseIndexerKernelsHaveDedicatedRegisteredTests, false);
assert.equal(candidate.upstreamEvidenceBoundary.upstreamCiIsSzlQualification, false);
assert.ok(candidate.requiredEvidence.some((item) => item.includes("topk_bf16_small")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("NaN padding")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("SM90/SM100")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("D2H synchronization")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("UNAVAILABLE")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("rollback")));
assert.ok(candidate.requiredEvidence.some((item) => item.includes("UPSTREAM_REPORTED_NOT_SZL_MEASURED")));

assert.match(wave.projection.huggingFace, /UNTIL_QUALIFIED/);
assert.match(wave.projection["a11oy.net"], /MEASURED_RECEIPTS/);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log("2026-09-16 SGLang DeepSeek V4.1 kernel stack invariants OK");
