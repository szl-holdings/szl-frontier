import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wave = JSON.parse(
  readFileSync(
    new URL("../frontier/waves/2026-09-12-estate-alignment-drift.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.kind, "authority-chain-alignment-drift");
assert.equal(wave.candidate.priority, "P0");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "578bf8a2291ab345dd98cfe6716a65d55943ec70",
);
assert.equal(wave.candidate.upstream.nativeVerifierRun, 34663464127);
assert.equal(wave.candidate.upstream.nativeIncident, "szl-holdings/a11oy#2010");
assert.equal(wave.candidate.evaluation.relatedPullRequest, 2124);
assert.equal(wave.candidate.evaluation.frontierIssue, 96);
assert.equal(wave.candidate.evaluation.status, "ALIGNMENT_REPAIR_REQUIRED");

assert.deepEqual(wave.observedBlockers, [
  "counsel:SOURCE_REVISION_MISMATCH",
  "finance:SOURCE_REVISION_MISMATCH",
  "lyte:SOURCE_REVISION_MISMATCH",
  "terra:SOURCE_REVISION_MISMATCH",
]);

assert.equal(
  wave.observedSourceVector.a11oy,
  "578bf8a2291ab345dd98cfe6716a65d55943ec70",
);
assert.equal(wave.observedSourceVector.counsel, wave.observedSourceVector.a11oy);
assert.equal(wave.observedSourceVector.finance, wave.observedSourceVector.a11oy);
assert.equal(wave.observedSourceVector.terra, wave.observedSourceVector.a11oy);
assert.equal(
  wave.observedSourceVector.lyte,
  "9ce4e6b5f36fe0b094a07308abe3665cd2a210c1",
);

assert.equal(wave.inventoryPredicate.scope, "hf-public-author-membership/v1");
assert.equal(wave.inventoryPredicate.state, "ALIGNED");
assert.equal(wave.inventoryPredicate.models, 46);
assert.equal(wave.inventoryPredicate.datasets, 35);
assert.equal(wave.inventoryPredicate.spaces, 21);
assert.equal(wave.inventoryPredicate.itemDeltas, false);

const acceptance = wave.candidate.evaluation.acceptance.join("\n");
assert.match(acceptance, /Do not create a second writer/i);
assert.match(acceptance, /existing A11oy domain\/vertical writer/i);
assert.match(acceptance, /existing A11oy single-writer path/i);
assert.match(acceptance, /freeze and record the expected protected source vector/i);
assert.match(acceptance, /HTTP 200.*is not source alignment/i);
assert.match(acceptance, /fresh native estate-release-train receipt/i);
assert.match(acceptance, /do not delete, hide, retype or duplicate assets/i);
assert.match(acceptance, /NOT_REQUESTED or BLOCKED/i);
assert.match(acceptance, /do not rewrite historical receipts/i);

assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.match(wave.authorityChain.huggingFaceProjection, /HOLD/);
assert.match(wave.authorityChain.proofEvidence, /must not claim/i);
assert.match(wave.alignment.claimBoundary, /previous aligned receipt remains valid historical evidence/i);
assert.match(wave.alignment.claimBoundary, /currently divergent/i);

console.log("Estate authority-chain drift record: PASS");
