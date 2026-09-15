import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(new URL("../frontier/waves/2026-09-15-atria-dawn-preview.json", import.meta.url), "utf8"),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
assert.deepEqual(wave.authorityChain, ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"]);
assert.equal(wave.canonicalIssue, "szl-holdings/szl-frontier#166");
assert.equal(wave.candidate.huggingFaceRepository, "internlm/Atria-Dawn-Preview");
assert.equal(wave.candidate.weightBearingRevision, "d0c6b46bc1ae6f63b47c32bfed8a674c2bbb9f04");
assert.equal(wave.candidate.license, "MIT");
assert.equal(wave.upstreamClaimsAreEvidence, false);
assert.equal(wave.deduplication.inheritsQualification, false);
assert.ok(wave.requiredEvidence.some((x) => x.includes("UNAVAILABLE")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("prompt-injection")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("text-only")));
assert.ok(wave.requiredEvidence.some((x) => x.includes("rollback/fallback")));
assert.equal(wave.projection.huggingFace, "NO_SZL_REHOST_OR_RUNTIME_PROJECTION_FROM_INTAKE");
assert.equal(wave.projection["a-11-oy.com"], "UNCHANGED");
assert.equal(wave.productionDisposition, "HOLD");
assert.equal(wave.automaticProductionPromotion, false);
assert.equal(wave.weightsRehosted, false);
assert.equal(wave.policyOrProtectionWeakened, false);

console.log("Atria Dawn Preview frontier intake invariants: PASS");
