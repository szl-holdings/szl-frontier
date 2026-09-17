/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-17-integrity-successors.json', import.meta.url),
    'utf8',
  ),
);

const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));
const revisions = new Set(wave.candidates.map((candidate) => candidate.upstreamRevision));

test('pins six exact-source integrity successors after the prior runtime wave', () => {
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#175');
  assert.equal(wave.predecessorWave, 'szl-holdings/szl-frontier#174');
  assert.equal(wave.sourceRevisionObserved, 'f2a4dc5d68159ba05444c8e3e48d592c54f3817b');
  assert.deepEqual(revisions, new Set([
    '882577451e764a515df2a386a055012e8f075a16',
    'aebae58b8c7894287a9ea8b5d844c65bbb58c9b2',
    '329ffc89b9129be3ef9135108cd74f7a699e819b',
    '4e5ffda19d897f3c34455167dc0503620f1b3e2a',
    'da9d2c460c24cd9b1ee215d6e824601b48fbf9d4',
    'f78d649ebf12dc13aa88b2d9a1c0800564d654ed',
  ]));
});

test('keeps every candidate non-inheriting and fail closed', () => {
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  for (const candidate of wave.candidates) {
    assert.equal(candidate.inheritsQualification, false);
    assert.equal(candidate.productionDisposition, 'HOLD');
    assert.match(candidate.upstreamRevision, /^[0-9a-f]{40}$/);
    assert.ok(candidate.requiredEvidence.length >= 4);
  }
});

test('preserves security and cache-integrity negative evidence requirements', () => {
  const unpickler = byId['sglang-safe-unpickler-exact-allowlists'].requiredEvidence.join('\n').toLowerCase();
  assert.match(unpickler, /negative fixtures/);
  assert.match(unpickler, /unrestricted pickle/);

  const mooncake = byId['sglang-mooncake-ssd-rank-isolation'].requiredEvidence.join('\n').toLowerCase();
  assert.match(mooncake, /known-bad predecessor/);
  assert.match(mooncake, /byte-for-byte/);
  assert.match(mooncake, /miss\/recompute/);
});

test('requires semantic model correctness rather than source-presence claims', () => {
  const swiglu = byId['sglang-flashinfer-trtllm-swiglu-clamp-correctness'].requiredEvidence.join('\n').toLowerCase();
  assert.match(swiglu, /activation-level fixtures/);
  assert.match(swiglu, /fixed-seed logits\/outputs/);

  const rope = byId['transformers-minimax-m2-partial-rope-parity'].requiredEvidence.join('\n').toLowerCase();
  assert.match(rope, /known-bad predecessor/);
  assert.match(rope, /frequency\/rotate-half reference/);
});

test('forces historical training receipts through content-integrity revalidation when affected', () => {
  const training = byId['trl-wrapped-packing-sliced-table-integrity'].requiredEvidence.join('\n').toLowerCase();
  assert.match(training, /content-hash/);
  assert.match(training, /known-bad predecessor/);
  assert.match(training, /needs_revalidation/);
  assert.match(training, /row\/token counts/);
});

test('does not promote autotune probes without complete runtime evidence', () => {
  const candidate = byId['vllm-flashinfer-bf16-autotune-isolation'];
  assert.match(candidate.materiality.join('\n'), /full pytest and end-to-end model serving were not completed/);
  const evidence = candidate.requiredEvidence.join('\n').toLowerCase();
  assert.match(evidence, /known-bad predecessor/);
  assert.match(evidence, /independent numerical reference/);
  assert.match(evidence, /unavailable/);
});

test('keeps authority-chain projection fail closed', () => {
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentPullRequest, 'szl-holdings/szl-frontier#159');
  assert.equal(wave.alignmentDependency.state, 'PARTIALLY_REPAIRED_INDEPENDENT_HOLD');
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});
