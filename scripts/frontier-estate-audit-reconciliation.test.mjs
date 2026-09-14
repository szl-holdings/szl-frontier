/**
 * Regression guard for the 2026-09-13 estate audit reconciliation wave.
 * Asserts the audit record's own invariants: dated readback schema, HOLD
 * policy, exact open-PR inventory, HF public/private reconciliation with the
 * README-card inference honestly labeled UNVERIFIED, alignment state with the
 * owner dispatch outstanding, and claim surfaces. Offline; no network calls.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(readFileSync(join(here, "..", "frontier", "waves", "2026-09-13-estate-audit-reconciliation-01.json"), "utf8"));

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-13-estate-audit-reconciliation-01");
});

test("wave is preparation-class, fail-closed, with no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("GitHub org readback records exact open-PR inventory, all draft-held", () => {
  const gh = wave.audit.githubOrg;
  assert.equal(gh.reposEnumerated, 123);
  assert.equal(gh.openPullRequests, 5);
  assert.equal(gh.openPullRequestRefs.length, 5);
  assert.ok(gh.openPullRequestRefs.includes("szl-holdings/a11oy#2125"));
  assert.equal(gh.allOpenPullRequestsDraftHeld, true);
  assert.equal(gh.openIssuesTotal, 151);
});

test("P0 defect triad is recorded by exact issue reference", () => {
  const p0 = wave.audit.githubOrg.issueClassification.genuineDefectsP0.join(" ");
  assert.match(p0, /a11oy#2143/);
  assert.match(p0, /\.github#739/);
  assert.match(p0, /killinchu#441/);
});

test("HF inventory reconciliation matches public predicate on models and datasets", () => {
  const r = wave.audit.huggingFace;
  assert.equal(r.models.publicComputed, 46);
  assert.equal(r.datasets.enumerated - r.datasets.private, 35);
  assert.equal(r.reconciliation.modelsMatchExactly, true);
  assert.equal(r.reconciliation.datasetsMatchWhenPrivateExcluded, true);
});

test("space reconciliation carries an honestly labeled UNVERIFIED inference", () => {
  const s = wave.audit.huggingFace.reconciliation.spacesMatchWhenPrivateExcludedAndStaticReadmeCardExcluded;
  assert.equal(typeof s, "string");
  assert.match(s, /UNVERIFIED/);
  assert.match(wave.audit.huggingFace.reconciliation.statement, /does not declare clean alignment/);
});

test("alignment state records repair evidence as REPORTED and owner dispatch as outstanding", () => {
  const a = wave.audit.alignmentState;
  assert.match(a.devaReadinessIncident, /REPORTED/);
  assert.deepEqual(a.remainingBlockers, [
    "counsel:SOURCE_REVISION_MISMATCH",
    "finance:SOURCE_REVISION_MISMATCH",
    "terra:SOURCE_REVISION_MISMATCH",
  ]);
  assert.match(a.ownerActionOutstanding, /workflow_dispatch/);
  assert.match(a.ownerActionOutstanding, /repair=true/);
});

test("claim surfaces admit point-in-time readback and deny promotion authority", () => {
  const s = wave.claimSurfaces.join("\n");
  assert.match(s, /point-in-time/);
  assert.match(s, /intentional HOLDs remain open by design/);
  assert.match(s, /authorizes promotion/);
  assert.match(s, /MODELED or NO_ORGAN/);
});

test("deterministic self-merge is declared and bounded", () => {
  const dm = wave.deterministicMerge;
  assert.equal(dm.strategy, "python-merge");
  assert.equal(dm.selfEnforcing, true);
  assert.ok(dm.touchedPaths.some((p) => p.endsWith("2026-09-13-estate-audit-reconciliation-01.json")));
  for (const f of dm.forbidden) assert.ok(!dm.touchedPaths.includes(f));
});
