import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-late-runtime-integrity-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = new Map([
  ['vllm-dsv41-nan-candidate-block-preservation', ['vllm-project/vllm', '64563d0ec4b761745d5babbc5750b263f0783926', 57454]],
  ['vllm-glm53-kpool-tail-slot-mapping-oob', ['vllm-project/vllm', '70df48dc3d01fe1bb3206f7d8a832c7e8de348e8', 57317]],
  ['vllm-rocm-kv-offload-private-pinned', ['vllm-project/vllm', '7b942936276d59cc1912185a442b97dea8d2386c', 57160]],
  ['sglang-flashinfer-moe-fused-finalize-default', ['sgl-project/sglang', 'c46bf5e990bdd99e2c200214b04683022100e4df', 40105]],
  ['transformers-device-map-largest-leaf-buffer', ['huggingface/transformers', '4618eba18322b19e162b0eb7b33464a4d6a50ddd', 47211]],
  ['vllm-dsv4-missing-string-tool-parser', ['vllm-project/vllm', '39e33db7f3b10ebd3aca6a0008f2990978f118e7', 56271]],
]);

test('late successor is exact-source governed and cannot self-promote', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-late-runtime-integrity-successors');
  assert.equal(wave.sourceOfTruth, 'szl-holdings/szl-frontier');
  assert.equal(wave.sourceRevisionObserved, '469dbc1aeba92e1e9158f15dd47abc74859ec16e');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-18-runtime-integrity-successors');
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate pins are unique, verified and non-inheriting', () => {
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

test('DeepSeek candidate preservation requires known-bad and finite controls', () => {
  const candidate = wave.candidates.find((item) => item.id === 'vllm-dsv41-nan-candidate-block-preservation');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /known-bad predecessor/);
  assert.match(evidence, /NaN and mixed-NaN/);
  assert.match(evidence, /finite-score controls/);
  assert.match(evidence, /must not be claimed as numerical sanitization/);
  assert.match(candidate.materiality.join(' '), /DeepGEMM expects unique indices/);
});

test('KpoolTail memory-safety boundary retains poison-row and long-context negatives', () => {
  const candidate = wave.candidates.find((item) => item.id === 'vllm-glm53-kpool-tail-slot-mapping-oob');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /known-bad predecessor poison-row and out-of-bounds regression/);
  assert.match(evidence, /500k-input regime/);
  assert.match(evidence, /neighboring-request or past-table memory/);
  assert.match(evidence, /unaffected KV groups/);
});

test('ROCm KV offload requires real eviction/reload integrity and a CUDA control', () => {
  const candidate = wave.candidates.find((item) => item.id === 'vllm-rocm-kv-offload-private-pinned');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /predecessor shared-registration failure/);
  assert.match(evidence, /private per-rank pinned allocation/);
  assert.match(evidence, /GPU eviction, CPU-to-GPU reload and post-eviction replay/);
  assert.match(evidence, /CUDA control/);
  assert.match(evidence, /no cross-rank data loss/);
});

test('SGLang fused finalize cannot convert an upstream accuracy rationale into a pass', () => {
  const candidate = wave.candidates.find((item) => item.id === 'sglang-flashinfer-moe-fused-finalize-default');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(candidate.materiality.join(' '), /did not run model accuracy tests/);
  assert.match(evidence, /old-default enabled versus new-default disabled/);
  assert.match(evidence, /independent trusted reference/);
  assert.match(evidence, /performance tradeoff must never be relabeled as correctness/);
  assert.match(evidence, /do not silently re-enable fused finalize/);
});

test('Transformers placement requires both meta regression and representative quantized load', () => {
  const candidate = wave.candidates.find((item) => item.id === 'transformers-device-map-largest-leaf-buffer');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /known-bad meta\/fake-budget case/);
  assert.match(evidence, /actual representative 4-bit model load/);
  assert.match(evidence, /never silently spills required quantized modules to CPU\/disk/);
  assert.match(evidence, /valid CPU\/disk offload behavior/);
});

test('DeepSeek V4 tool parser keeps effectors disabled until exact serving parser is qualified', () => {
  const candidate = wave.candidates.find((item) => item.id === 'vllm-dsv4-missing-string-tool-parser');
  assert.ok(candidate);
  const evidence = candidate.requiredEvidence.join(' ');
  assert.match(evidence, /known-bad omitted-string fixture/);
  assert.match(evidence, /complete and streaming parses/);
  assert.match(evidence, /both frontends/);
  assert.match(evidence, /raw model-output hash/);
  assert.match(evidence, /external effectors disabled/);
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
