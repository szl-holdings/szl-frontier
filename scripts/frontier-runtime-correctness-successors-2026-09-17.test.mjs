/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-17-runtime-correctness-successors.json', import.meta.url),
    'utf8',
  ),
);

const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));
const revisions = new Set(wave.candidates.map((candidate) => candidate.upstreamRevision));

test('pins the three post-173 exact-source correctness successors', () => {
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#168');
  assert.equal(wave.predecessorWave, 'szl-holdings/szl-frontier#173');
  assert.deepEqual(revisions, new Set([
    '19b6ff62f24d477a2760602b9e94eb6e4dd7dcdd',
    '0443e3179fa9feada0b90e03be8567218fedad47',
    '4c85172f3a05d7959a69f8179587b6ac92494d06',
  ]));
});

test('keeps every candidate non-inheriting and fail closed', () => {
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  for (const candidate of wave.candidates) {
    assert.equal(candidate.priority, 'P0');
    assert.equal(candidate.inheritsQualification, false);
    assert.equal(candidate.productionDisposition, 'HOLD');
    assert.equal(candidate.sourceVerification, 'GITHUB_VERIFIED_SIGNATURE');
    assert.ok(candidate.requiredEvidence.length >= 5);
  }
});

test('requires independent negative controls for the ROCm descale regression', () => {
  const candidate = byId['vllm-rocm-aiter-unquantized-cache-descale-correctness'];
  const evidence = candidate.requiredEvidence.join('\n').toLowerCase();
  assert.match(evidence, /non-neutral stale scale/);
  assert.match(evidence, /fp8 caches/);
  assert.match(evidence, /known-bad predecessor/);
  assert.match(candidate.materiality.join('\n'), /0\.000/);
});

test('does not misclassify an SM103 memory-ordering race as a CPU-only qualification', () => {
  const candidate = byId['sglang-kda-prefill-async-proxy-fence'];
  const bounds = candidate.upstreamEvidenceBounds.join('\n').toLowerCase();
  const evidence = candidate.requiredEvidence.join('\n').toLowerCase();
  assert.match(bounds, /cpu test cannot exercise/);
  assert.match(evidence, /fence\.proxy\.async\.shared::cta/);
  assert.match(evidence, /fence-removed negative control/);
  assert.match(evidence, /probabilistic absence of a race/);
});

test('requires MXFP8 payload and scale integrity plus unsupported-path refusal', () => {
  const candidate = byId['sglang-hicache-mxfp8-scale-roundtrip'];
  const evidence = candidate.requiredEvidence.join('\n').toLowerCase();
  assert.match(evidence, /payload-and-scale round-trip/);
  assert.match(evidence, /poisoned destination scale rows/);
  assert.match(evidence, /fail explicitly/);
  assert.match(evidence, /device-hit versus host-restore/);
});

test('keeps downstream projection closed and independent alignment residue visible', () => {
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentPullRequest, 'szl-holdings/szl-frontier#159');
  assert.equal(wave.alignmentDependency.state, 'PARTIALLY_REPAIRED_INDEPENDENT_HOLD');
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
