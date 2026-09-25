import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-19-overnight-cache-multimodal-security-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = Object.fromEntries(wave.candidates.map((c) => [c.id, c]));

const expectedPins = {
  'vllm-multimodal-hash-framing-cache-isolation': ['vllm-project/vllm', 'a8d1aa9c99b8698a2a78b611b7a10c30e6b3995b', 54283],
  'vllm-aria-expert-weight-name-layout': ['vllm-project/vllm', '01c7bf88135458940d89584c05ae47404aac77cb', 57487],
  'sglang-safe-unpickler-nested-storage-successor': ['sgl-project/sglang', '5b42d10edfa4b626b1e37026577eb5706e89b69a', 40259],
  'sglang-glm-ocr-mtp-multimodal-mrope': ['sgl-project/sglang', '929230a6f015dcc4042ef8d06ef10c0c81f17327', 39088],
  'sglang-runtime-context-published-rank-placement': ['sgl-project/sglang', '3a5f52e14419b7f1d25d7a3833ebaecf10d484b4', 40071],
};

test('Sep 19 overnight wave is exact-source, non-promoting, and held', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-19-overnight-cache-multimodal-security-successors');
  assert.equal(wave.sourceRevisionObserved, '10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-18-evening-model-serving-integrity-successors');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.candidates.length, 5);
});

test('all candidates are independently exact-pinned and held', () => {
  assert.deepEqual(Object.keys(byId).sort(), Object.keys(expectedPins).sort());
  for (const [id, [repo, sha, pr]] of Object.entries(expectedPins)) {
    const c = byId[id];
    assert.equal(c.upstreamRepository, repo);
    assert.equal(c.upstreamRevision, sha);
    assert.equal(c.upstreamPullRequest, pr);
    assert.match(c.upstreamRevision, /^[0-9a-f]{40}$/);
    assert.equal(c.sourceVerification, 'EXACT_GITHUB_COMMIT_OBSERVED');
    assert.equal(c.inheritsQualification, false);
    assert.equal(c.productionDisposition, 'HOLD');
    assert.ok(c.requiredEvidence.length >= 4);
  }
});

test('multimodal hash framing must prove cross-request cache isolation, not merely different test hashes', () => {
  const c = byId['vllm-multimodal-hash-framing-cache-isolation'];
  assert.match(c.materiality.join(' '), /prefix-cache block hashing/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /equal-digest evidence/);
  assert.match(e, /distinct digests/);
  assert.match(e, /no cache entry created for one request is returned for a distinct framed input/);
  assert.match(e, /cache-disable as rollback/);
});

test('Aria lane requires exact checkpoint loading and accelerator-level output parity', () => {
  const c = byId['vllm-aria-expert-weight-name-layout'];
  assert.match(c.materiality.join(' '), /extra \.weight suffix/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /every expected expert\/shared-expert tensor exactly once/);
  assert.match(e, /HF-reference and vLLM MoE outputs\/logits/);
  assert.match(e, /full-model accelerator inference/);
  assert.match(e, /no model artifact is mirrored for inventory/);
});

test('SafeUnpickler successor cannot inherit the earlier allowlist qualification', () => {
  const c = byId['sglang-safe-unpickler-nested-storage-successor'];
  assert.equal(c.predecessorGovernedRevision, '882577451e764a515df2a386a055012e8f075a16');
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /do not inherit its qualification/);
  assert.match(e, /nested torch\.storage bytes/);
  assert.match(e, /weights_only/);
  assert.match(e, /never weaken deserialization policy/);
});

test('GLM-OCR MTP lane binds multimodal embeddings, MRoPE and memory safety together', () => {
  const c = byId['sglang-glm-ocr-mtp-multimodal-mrope'];
  assert.match(c.materiality.join(' '), /CUDA out-of-bounds/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /known-bad image\/MTP path/);
  assert.match(e, /target embeddings are reused/);
  assert.match(e, /MRoPE positions/);
  assert.match(e, /no OOB\/NaN/);
  assert.match(e, /non-MTP as rollback/);
});

test('runtime context lane keeps unsupported PP plus speculative topology explicitly unqualified', () => {
  const c = byId['sglang-runtime-context-published-rank-placement'];
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /published ranks against process-group-derived ranks/);
  assert.match(e, /moe_dp_rank fallthrough/);
  assert.match(e, /all six speculative worker/);
  assert.match(e, /PP plus speculative decoding remains UNQUALIFIED/);
});

test('authority-chain projection remains fail-closed and proof-lagged', () => {
  assert.equal(wave.owners.canonicalGovernance, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.owners.deterministicEvaluation, 'szl-holdings/szl-forge');
  assert.equal(wave.owners.acceleratorClosure, 'szl-holdings/szl-gpu-bridge');
  assert.equal(wave.owners.productProjectionAfterQualification, 'szl-holdings/a11oy');
  assert.equal(wave.owners.proofProjectionAfterMeasuredReceipts, 'szl-holdings/a11oy-net');
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.equal(wave.alignmentDependency.observedA11oySourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.equal(wave.alignmentDependency.observedHfRuntimeSourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.equal(wave.alignmentDependency.observedProductRuntimeSourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.equal(wave.alignmentDependency.proofCapturedAt, '2026-09-12T01:25:04Z');
  assert.deepEqual(wave.alignmentDependency.proofCounts, {models: 46, datasets: 35, spaces: 21});
  assert.equal(wave.alignmentDependency.proofOperational, false);
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
