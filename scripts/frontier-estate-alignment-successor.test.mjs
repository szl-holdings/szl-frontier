/**
 * Offline guard for the post-closure estate-alignment successor.
 *
 * The test fixes evidence shape and fail-closed semantics only. It performs no
 * provider write, publication, production promotion, or inventory mutation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "waves", "2026-09-15-estate-alignment-successor.json"),
    "utf8",
  ),
);

const CURRENT = "7bb46fd93da77431bd31b7d35b0b341fe240d2e4";
const STALE = "a7bf14a576bc79b4db1945384c55a3c56b109670";
const ADDED_MODEL = "SZLHOLDINGS/szl-receiptagent-qwen35-0.8b-v2-merged";

test("successor is additive, divergent, and fail-closed", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.wave, "2026-09-15-estate-alignment-successor");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
  assert.equal(wave.policy.exactSourceBindingRequired, true);
  assert.equal(wave.policy.noManualProviderRepair, true);
  assert.equal(wave.alignment.state, "DIVERGENT");
  assert.equal(wave.alignment.productionDisposition, "HOLD_NO_PRODUCTION_PROMOTION");
  assert.equal(wave.candidate.status, "HOLD_ALIGNMENT_DRIFT");
  assert.match(wave.alignment.claimBoundary, /production_authorization remains false/);
});

test("historical closure remains immutable instead of being rewritten", () => {
  const history = wave.candidate.historicalClosure;
  assert.equal(history.frontierIssue, 96);
  assert.equal(history.wave, "2026-09-12-estate-alignment-drift");
  assert.equal(history.terminalSource, STALE);
  assert.equal(history.disposition, "PRESERVE_AS_IMMUTABLE_HISTORICAL_EVIDENCE");
  assert.equal(wave.candidate.deduplication.historicalAlignmentWaveReopened, false);
});

test("current protected source cannot be qualified by stale runtime bytes", () => {
  const source = wave.candidate.currentProtectedSource;
  const build = wave.candidate.runtimeObservation.canonicalSpaceBuildInfo;
  assert.equal(source.repository, "szl-holdings/a11oy");
  assert.equal(source.branch, "main");
  assert.equal(source.revision, CURRENT);
  assert.equal(build.expectedSourceRevision, CURRENT);
  assert.equal(build.observedSourceRevision, STALE);
  assert.notEqual(build.expectedSourceRevision, build.observedSourceRevision);
  assert.equal(build.sourceBound, false);
  assert.equal(build.httpReachable, true);
  assert.equal(wave.candidate.runtimeObservation.status, "NOT_VERIFIED");
});

test("independent health plane classifies source integrity as drift", () => {
  const health = wave.candidate.independentHealthObservation;
  assert.equal(health.owner, "szl-holdings/szl-org-health#41");
  assert.equal(health.surface, "a11oy");
  assert.equal(health.state, "INCIDENT");
  assert.equal(health.sourceStatus, "DRIFT");
  assert.ok(health.consecutiveFailures > 0);
  assert.match(health.reason, /cannot be repaired by a runtime restart/);
});

test("public membership delta is admitted publication with stale declaration", () => {
  const inv = wave.candidate.publicInventoryObservation;
  const cls = inv.modelDelta.classification;
  assert.equal(inv.scope, "hf-public-author-membership/v1");
  assert.equal(inv.scopeSha256, "9060fa8d7edcd5c246b86bcfcf1916df44b18038253325336f2f46208f8001ae");
  assert.equal(inv.state, "DIVERGENT");
  assert.deepEqual(inv.expected, { models: 46, datasets: 35, spaces: 21 });
  assert.deepEqual(inv.observed, { models: 47, datasets: 35, spaces: 21 });
  assert.deepEqual(inv.modelDelta.added, [ADDED_MODEL]);
  assert.deepEqual(inv.modelDelta.removed, []);
  assert.equal(cls.state, "ADMITTED_PUBLISHED_DECLARATION_STALE");
  assert.equal(cls.githubOwner, "szl-holdings/szl-forge");
  assert.equal(cls.candidateStatus, "PUBLISHED");
  assert.equal(cls.publicationState, "MEASURED_HF_READBACK_VERIFIED");
  assert.equal(cls.base, "unsloth/Qwen3.5-0.8B@23c69c53358a07516b5827588b3fdb12ae78fd65");
  assert.equal(cls.intendedFileCount, 8);
  assert.equal(cls.intendedBytes, 3432006714);
  assert.match(cls.remainingPublicationReceiptGap, /Hub release revision SHA/);
  assert.match(cls.repairBoundary, /do not delete or hide the admitted model/);
  assert.match(wave.candidate.acceptance.join("\n"), /do not delete, hide, retype, duplicate, or mirror/i);
});

test("existing owners are reused and no parallel writer is introduced", () => {
  const dedupe = wave.candidate.deduplication;
  assert.equal(dedupe.nativeIncidentReused, "szl-holdings/a11oy#2010");
  assert.equal(dedupe.estateReadbackReused, "szl-holdings/.github#298");
  assert.equal(dedupe.healthWitnessReused, "szl-holdings/szl-org-health#41");
  assert.equal(dedupe.fullCheckpointMetadataDriftReused, "szl-holdings/szl-forge#319");
  assert.match(dedupe.modelAdmissionEvidenceReused, /szl-holdings\/szl-forge@df0bc50/);
  assert.match(dedupe.result, /admitted published inventory delta is classified/);
  assert.match(wave.candidate.acceptance.join("\n"), /no manual Space edit or second writer/i);
});

test("Codex handoff requires source-first repair and same-run closure evidence", () => {
  const handoff = wave.candidate.codexHandoff;
  assert.equal(handoff.mode, "SOURCE_FIRST_ALIGNMENT_REPAIR");
  assert.ok(handoff.steps.some((step) => step.includes("normal reviewed writer")));
  assert.ok(handoff.steps.some((step) => step.includes("Hub release revision SHA")));
  assert.ok(handoff.steps.some((step) => step.includes("deterministic source/inventory tests")));
  assert.ok(handoff.steps.some((step) => step.includes("existing publisher")));
  assert.ok(handoff.steps.some((step) => step.includes("ALIGNED with zero configured required blockers")));
  assert.equal(wave.authorityChain.githubSource, `AUTHORITATIVE_AT_${CURRENT}`);
  assert.equal(wave.authorityChain.huggingFaceProjection, `DRIFT_OBSERVED_AT_${STALE}`);
});
