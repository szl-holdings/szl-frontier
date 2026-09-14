/**
 * Terminal closure guard for the existing estate-alignment wave.
 *
 * This is an offline evidence-shape test. It does not probe providers, publish
 * assets, authorize production, or turn non-required observations into gates.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "waves", "2026-09-12-estate-alignment-drift.json"),
    "utf8",
  ),
);

const SOURCE = "a7bf14a576bc79b4db1945384c55a3c56b109670";
const REQUIRED = ["a11oy", "counsel", "finance", "terra", "lyte", "killinchu", "vertical-services"];

test("existing governed wave records protected-main closure without promotion", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.wave, "2026-09-12-estate-alignment-drift");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.alignment.state, "ALIGNED");
  assert.equal(wave.alignment.productionDisposition, "ALIGNMENT_REPAIRED_NO_PRODUCTION_PROMOTION");
  assert.equal(wave.alignment.automaticPromotion, false);
  assert.match(wave.alignment.claimBoundary, /production_authorization remains false/);
});

test("terminal evidence is bound to exact owner dispatch, run, attempt and source", () => {
  const terminal = wave.candidate.terminalProtectedMainEvidence;
  assert.equal(terminal.repairRun, 34791261715);
  assert.equal(terminal.runAttempt, 1);
  assert.equal(terminal.event, "workflow_dispatch");
  assert.equal(terminal.sourceRevision, SOURCE);
  assert.equal(terminal.state, "ALIGNED");
  assert.deepEqual(terminal.blockers, []);
  assert.equal(terminal.canonicalWriterDispatch.reason, "PRODUCT_AND_VERTICAL");
  assert.equal(terminal.canonicalWriterDispatch.verticalFlagships, true);
  assert.equal(terminal.canonicalWriterDispatch.approvedPlanBoundToSource, true);
  assert.equal(terminal.canonicalWriterDispatch.productionAuthorization, false);
  assert.match(terminal.artifactDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(terminal.estateReceiptSha256, /^[0-9a-f]{64}$/);
  assert.match(terminal.publicInventoryReceiptSha256, /^[0-9a-f]{64}$/);
  assert.match(terminal.publicInventoryRecordSha256, /^[0-9a-f]{64}$/);
});

test("configured required runtime witnesses are exact and complete", () => {
  const witnesses = wave.candidate.terminalProtectedMainEvidence.requiredRuntimeWitnesses;
  assert.deepEqual(Object.keys(witnesses).sort(), [...REQUIRED].sort());
  for (const key of ["a11oy", "counsel", "finance", "terra"]) {
    assert.equal(witnesses[key], SOURCE);
  }
  for (const [key, revision] of Object.entries(witnesses)) {
    assert.match(revision, /^[0-9a-f]{40}$/, key);
    assert.equal(wave.currentRuntimeWitnesses[key], revision);
  }
  assert.equal(wave.configuredRequiredComponentState, "ALIGNED_PROTECTED_MAIN_NATIVE_RECEIPT");
});

test("public Hugging Face membership stays exact under the declared scope", () => {
  const inv = wave.candidate.terminalProtectedMainEvidence.publicInventory;
  assert.equal(inv.state, "ALIGNED");
  assert.equal(inv.scope, "hf-public-author-membership/v1");
  assert.equal(inv.scopeSha256, "9060fa8d7edcd5c246b86bcfcf1916df44b18038253325336f2f46208f8001ae");
  assert.deepEqual(
    { models: inv.models, datasets: inv.datasets, spaces: inv.spaces },
    { models: 46, datasets: 35, spaces: 21 },
  );
  assert.equal(inv.itemDeltas, false);
});

test("product/proof authority chain is source exact while provider evidence is retained", () => {
  const terminal = wave.candidate.terminalProtectedMainEvidence;
  assert.equal(terminal.product.sourceRevision, SOURCE);
  assert.equal(terminal.product.semanticParity, true);
  assert.match(terminal.product.semanticSha256, /^[0-9a-f]{64}$/);
  assert.match(
    terminal.product.providerScriptRetainedAsEvidence,
    /^https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js\//,
  );
  assert.equal(terminal.proof.aligned, true);
  assert.match(terminal.proof.sourceRevision, /^[0-9a-f]{40}$/);
  assert.match(wave.authorityChain.huggingFaceProjection, /source-exact and RUNNING/);
});

test("historical failure and candidate evidence remain immutable context", () => {
  assert.equal(wave.candidate.history.failingRun, 34729765971);
  assert.equal(
    wave.candidate.history.failingArtifactDigest,
    "sha256:8434e97b4a4b9d17a8f5019a5acd257e516539e2669e416c34bc2d16597dfe7a",
  );
  assert.equal(wave.candidate.currentCandidateEvidence.verifierRun, 34733259799);
  assert.equal(wave.candidate.currentCandidateEvidence.state, "ALIGNED");
  assert.deepEqual(wave.candidate.currentCandidateEvidence.blockers, []);
});

test("non-required observations remain explicit and cannot qualify required scope", () => {
  const optional = wave.candidate.terminalProtectedMainEvidence.nonRequiredObservations;
  assert.equal(optional.sentra.required, false);
  assert.equal(optional.sentra.aligned, false);
  assert.ok(optional.sentra.blockers.length > 0);
  assert.equal(optional["david-leads"].required, false);
  assert.equal(optional["david-leads"].aligned, false);
  assert.ok(optional["david-leads"].blockers.length > 0);
  assert.match(
    wave.candidate.materialChanges.join("\n"),
    /Sentra and David Leads remain explicitly non-required/,
  );
});

test("incident closure and semantic repair are bounded to alignment only", () => {
  const terminal = wave.candidate.terminalProtectedMainEvidence;
  assert.equal(terminal.incident.a11oyIssue, 2010);
  assert.equal(terminal.incident.state, "closed");
  assert.equal(terminal.incident.stateReason, "completed");
  assert.equal(wave.candidate.evaluation.status, "PROTECTED_MAIN_ALIGNMENT_REPAIRED");
  assert.equal(
    wave.semanticDriftRootCause.repairDisposition,
    "RESOLVED_BY_ADMITTED_VERIFIER_AND_CANONICAL_WRITER_REPAIR",
  );
  assert.match(wave.candidate.materialChanges.at(-1), /production_authorization=false/);
});
