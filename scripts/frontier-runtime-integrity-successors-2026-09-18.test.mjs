import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-runtime-integrity-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = new Map([
  ['vllm-dsv41-flashinfer-dspark-noncausal-attention', ['vllm-project/vllm', '80447d27655918da6bfbccd0d3a40e975bda220a', 57432]],
  ['vllm-rocm-glm53-logical-topk-readiness', ['vllm-project/vllm', 'e0050f287aae8b3ddbe2947a5af1c5dd23db2781', 57252]],
  ['vllm-rocm-aiter-mxfp8-enable-gate', ['vllm-project/vllm', '213c379fcafe5ac3bdc235a480e13140ee13c7b5', 57426]],
  ['vllm-diffusiongemma-commit-step-logprob-correctness', ['vllm-project/vllm', '2c88fb131c7ae0be01907cd8c276911db5e7aad4', 57414]],
  ['sglang-dsv4-rocm-aiter-fp4-dequant-correctness', ['sgl-project/sglang', '4f52a2756328df5c27c9c6b76011805f7f40e8f8', 35123]],
  ['sglang-pd-runtime-role-switch-lifecycle', ['sgl-project/sglang', '1f60ddef5dc2ae3bbfbe0c5cea45690c4b60a251', 28403]],
]);

test('successor wave is exact-source governed and cannot self-promote', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-runtime-integrity-successors');
  assert.equal(wave.sourceOfTruth, 'szl-holdings/szl-frontier');
  assert.equal(wave.sourceRevisionObserved, '469dbc1aeba92e1e9158f15dd47abc74859ec16e');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-17-evening-runtime-successors');
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate set is unique, verified, exact and non-inheriting', () => {
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

test('new correctness boundaries retain predecessor and negative controls', () => {
  const byId = Object.fromEntries(wave.candidates.map((candidate) => [candidate.id, candidate]));

  const dspark = byId['vllm-dsv41-flashinfer-dspark-noncausal-attention'].requiredEvidence.join(' ');
  assert.match(dspark, /known-bad predecessor/);
  assert.match(dspark, /causal and non-causal/);
  assert.match(dspark, /CUDA graph capture\/replay/);

  const glm = byId['vllm-rocm-glm53-logical-topk-readiness'].requiredEvidence.join(' ');
  assert.match(glm, /predecessor boot\/initialization failure/);
  assert.match(glm, /shared top-k buffer lifecycle/);

  const mxfp8 = byId['vllm-rocm-aiter-mxfp8-enable-gate'].requiredEvidence.join(' ');
  assert.match(mxfp8, /AITER-enabled and AITER-disabled controls/);
  assert.match(mxfp8, /disabled state must never silently select AITER/);
  assert.match(mxfp8, /TP plus EP/);

  const diffusion = byId['vllm-diffusiongemma-commit-step-logprob-correctness'].requiredEvidence.join(' ');
  assert.match(diffusion, /mixed committing and non-committing requests/);
  assert.match(diffusion, /no stale logprob crosses request identity/);

  const dequant = byId['sglang-dsv4-rocm-aiter-fp4-dequant-correctness'].requiredEvidence.join(' ');
  assert.match(dequant, /Known-bad predecessor/);
  assert.match(dequant, /AITER and Triton runners/);
  assert.match(dequant, /shuffle occurs only/);
});

test('runtime PD role switching is opt-in and unsupported combinations stay denied', () => {
  const candidate = wave.candidates.find((item) => item.id === 'sglang-pd-runtime-role-switch-lifecycle');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /keep the flag off by default/);
  assert.match(evidence, /P->D->P cycles/);
  assert.match(evidence, /heartbeat thread shutdown/);
  assert.match(evidence, /fail-closed service state/);
  assert.match(evidence, /unsupported combination hard-fails/);
  const materiality = candidate.materiality.join(' ');
  assert.match(materiality, /DP attention/);
  assert.match(materiality, /speculative decoding/);
});

test('authority-chain projection remains independently held', () => {
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
