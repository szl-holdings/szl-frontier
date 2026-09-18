import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-17-late-correctness-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = new Map([
  ['transformers-assisted-sliding-window-cache-correctness', {
    repo: 'huggingface/transformers',
    revision: '12b6da1f12517dace0169e86116963137d2c5428',
    pr: 48280,
  }],
  ['vllm-xgrammar-choice-control-character-correctness', {
    repo: 'vllm-project/vllm',
    revision: '75c71390d5b399f5397a9166920fc45902f99f14',
    pr: 48115,
  }],
  ['peft-delete-active-adapter-fallback-trainability', {
    repo: 'huggingface/peft',
    revision: '451a247e9695c1d950093e24e3cab71190db0f64',
    pr: 3743,
  }],
]);

test('late correctness wave preserves canonical authority and HOLD', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-17-late-correctness-successors');
  assert.equal(wave.sourceOfTruth, 'szl-holdings/szl-frontier');
  assert.equal(wave.sourceRevisionObserved, '53e05d138e3e54232b66adf4a745a7ae3bcb71ed');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#177');
  assert.equal(wave.predecessorWave, 'szl-holdings/szl-frontier#176');
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate set is exact, unique, source-bound and non-inheriting', () => {
  assert.equal(wave.candidates.length, expected.size);
  assert.equal(new Set(wave.candidates.map((candidate) => candidate.id)).size, expected.size);
  for (const candidate of wave.candidates) {
    const pin = expected.get(candidate.id);
    assert.ok(pin, `unexpected candidate ${candidate.id}`);
    assert.equal(candidate.upstreamRepository, pin.repo);
    assert.equal(candidate.upstreamRevision, pin.revision);
    assert.equal(candidate.upstreamPullRequest, pin.pr);
    assert.match(candidate.upstreamRevision, /^[0-9a-f]{40}$/);
    assert.equal(candidate.sourceVerification, 'GITHUB_VERIFIED_SIGNATURE');
    assert.equal(candidate.inheritsQualification, false);
    assert.equal(candidate.productionDisposition, 'HOLD');
    assert.ok(candidate.requiredEvidence.length >= 5);
    const evidence = candidate.requiredEvidence.join(' ').toLowerCase();
    assert.match(evidence, /exact/);
    assert.match(evidence, /rollback/);
    assert.match(evidence, /known-bad|predecessor/);
  }
});

test('correctness-specific negative controls remain explicit', () => {
  const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));
  const assisted = byId['transformers-assisted-sliding-window-cache-correctness'].requiredEvidence.join(' ');
  assert.match(assisted, /get_mask_sizes/);
  assert.match(assisted, /greedy-versus-assisted/);
  assert.match(assisted, /eager and SDPA/);

  const grammar = byId['vllm-xgrammar-choice-control-character-correctness'].requiredEvidence.join(' ');
  assert.match(grammar, /C0\/DEL/);
  assert.match(grammar, /unconstrained generation/);
  assert.match(grammar, /tool\/human-approval/);

  const peft = byId['peft-delete-active-adapter-fallback-trainability'].requiredEvidence.join(' ');
  assert.match(peft, /requires_grad/);
  assert.match(peft, /optimizer parameter groups/);
  assert.match(peft, /NEEDS_REVALIDATION/);
});

test('downstream projections remain closed and alignment drift stays independent', () => {
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.match(wave.alignmentDependency.note, /cannot close public-membership or proof drift/i);
});
