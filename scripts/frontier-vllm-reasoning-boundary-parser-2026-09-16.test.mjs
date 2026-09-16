import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-16-vllm-reasoning-boundary-parser.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#168");
assert.equal(wave.disposition, "EVALUATION_HOLD");
assert.equal(wave.automaticProductionPromotion, false);

const candidate = wave.candidate;
assert.equal(candidate.upstreamRepository, "vllm-project/vllm");
assert.equal(candidate.upstreamRevision, "8be5205abbabf4c377c603d6c4180a99373f6415");
assert.equal(candidate.upstreamPullRequest, 56635);
assert.equal(candidate.inheritsQualification, false);
assert.equal(candidate.productionDisposition, "HOLD");
assert.match(candidate.exposureGate, /NOT_EXPOSED/);
assert.ok(candidate.requiredEvidence.some((x) => x.includes("tool-call boundary")));
assert.ok(candidate.requiredEvidence.some((x) => x.includes("fresh-turn")));
assert.ok(candidate.requiredEvidence.some((x) => x.includes("Qwen3Parser")));
assert.ok(candidate.requiredEvidence.some((x) => x.includes("Glm47MoeParser")));
assert.ok(candidate.requiredEvidence.some((x) => x.includes("rollback")));
assert.match(wave.projection.huggingFace, /UNTIL_QUALIFIED/);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.productionDefaultsChanged, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log("2026-09-16 vLLM reasoning boundary parser invariants OK");
