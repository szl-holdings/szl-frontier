import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-17-evening-runtime-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = new Map([
  ['vllm-hisparse-nixl-full-block-tail-correctness', ['vllm-project/vllm', '67e5b0acc9988afc50d019db64ad9da0dadaa15e', 57049]],
  ['sglang-dp-idle-rank-zero-token-logits-correctness', ['sgl-project/sglang', 'a98d921658b2cb78ca1257a4d72a6a3969620456', 39899]],
  ['sglang-exact-token-tensor-image-preprocessing', ['sgl-project/sglang', '25c9f724d4785eaa6921690d1634d20a3faac57b', 30368]],
  ['transformers-vllm-backend-video-token-accounting-part1', ['huggingface/transformers', '770e4c40d0436082a52dc380f07a9d3f389c99d4', 48894]],
  ['huggingface-hub-eval-results-invalid-entry-isolation', ['huggingface/huggingface_hub', '77b6b2b32972d54f5afef920414d15b510507c46', 4924]],
  ['trl-asyncgrpo-sync-threadpool-async-tools', ['huggingface/trl', '28884e7f8139e752b476de28474e7cf75e1e1cd5', 7175]],
]);

test('wave is exact-source governed and cannot promote itself', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-17-evening-runtime-successors');
  assert.equal(wave.sourceOfTruth, 'szl-holdings/szl-frontier');
  assert.equal(wave.sourceRevisionObserved, '469dbc1aeba92e1e9158f15dd47abc74859ec16e');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate set is unique, immutable, verified and non-inheriting', () => {
  assert.equal(wave.candidates.length, expected.size);
  assert.equal(new Set(wave.candidates.map((candidate) => candidate.id)).size, expected.size);
  assert.equal(new Set(wave.candidates.map((candidate) => `${candidate.upstreamRepository}@${candidate.upstreamRevision}`)).size, expected.size);
  for (const candidate of wave.candidates) {
    const pin = expected.get(candidate.id);
    assert.ok(pin, `unexpected candidate ${candidate.id}`);
    assert.equal(candidate.upstreamRepository, pin[0]);
    assert.equal(candidate.upstreamRevision, pin[1]);
    assert.equal(candidate.upstreamPullRequest, pin[2]);
    assert.match(candidate.upstreamRevision, /^[0-9a-f]{40}$/);
    assert.equal(candidate.sourceVerification, 'GITHUB_VERIFIED_SIGNATURE');
    assert.equal(candidate.inheritsQualification, false);
    assert.equal(candidate.productionDisposition, 'HOLD');
    assert.ok(candidate.requiredEvidence.length >= 4);
    assert.match(candidate.requiredEvidence.join(' ').toLowerCase(), /exact/);
  }
});

test('correctness and concurrency negative controls remain explicit', () => {
  const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));
  assert.match(byId['vllm-hisparse-nixl-full-block-tail-correctness'].requiredEvidence.join(' '), /1, 15, 16, 17, 31, 32, 33 and 127/);
  assert.match(byId['vllm-hisparse-nixl-full-block-tail-correctness'].requiredEvidence.join(' '), /abort during pending restore/);

  assert.match(byId['sglang-dp-idle-rank-zero-token-logits-correctness'].requiredEvidence.join(' '), /known-bad zero-token idle-rank/);
  assert.match(byId['sglang-dp-idle-rank-zero-token-logits-correctness'].requiredEvidence.join(' '), /mixed idle\/active ranks/);

  assert.match(byId['sglang-exact-token-tensor-image-preprocessing'].requiredEvidence.join(' '), /PIL and tensor-backed/);
  assert.match(byId['transformers-vllm-backend-video-token-accounting-part1'].requiredEvidence.join(' '), /known-bad predecessor/);
  assert.match(byId['transformers-vllm-backend-video-token-accounting-part1'].requiredEvidence.join(' '), /Part 2 or complete video parity/);

  const proof = byId['huggingface-hub-eval-results-invalid-entry-isolation'].requiredEvidence.join(' ');
  assert.match(proof, /predecessor all-entry loss/);
  assert.match(proof, /may never compute a complete PASS from the surviving subset alone/);

  const asyncTools = byId['trl-asyncgrpo-sync-threadpool-async-tools'];
  assert.equal(asyncTools.relatedGovernanceIssue, 'szl-holdings/szl-frontier#76');
  assert.match(asyncTools.requiredEvidence.join(' '), /bounded max_inflight_tasks concurrency/);
  assert.match(asyncTools.requiredEvidence.join(' '), /no duplicate consequential side effects/);
});

test('authority-chain projection remains fail closed', () => {
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.equal(wave.alignmentDependency.observedA11oySourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.equal(wave.alignmentDependency.sourceRuntimeProductIdentity, 'OBSERVED_EQUAL_NOT_WHOLE_CHAIN_CLOSED');
  assert.equal(wave.alignmentDependency.proofCapturedAt, '2026-09-12T01:25:04Z');
  assert.deepEqual(wave.alignmentDependency.proofCounts, {models: 46, datasets: 35, spaces: 21});
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
