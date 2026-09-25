import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-midday-cross-stack-integrity-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = new Map([
  ['transformers-vibevoice-asr-long-audio-token-count', ['huggingface/transformers', '719d8090f4040de8563ccf05496419b212fb395f', 48864]],
  ['peft-lora-hotswap-rank-alpha-pattern-scaling', ['huggingface/peft', '50a277e7c87db460ef7444055788f9da29f2da71', 3752]],
  ['trl-kto-liger-ddp-wrapper-gradient-reduction', ['huggingface/trl', '03b22f5f93868a8aa73c5089ab99fbceb05ae144', 7247]],
  ['diffusers-disk-offload-compute-stream-lifetime', ['huggingface/diffusers', 'a3e0b8ec235c27a6c17a21976daf7fd32d819d05', 14657]],
  ['vllm-tritonmla-causal-multitoken-decode-memory-safety', ['vllm-project/vllm', '32636580a6f1c3bc41deefc4bf7800f850c24034', 51065]],
  ['hf-hub-http-get-positioned-file-integrity', ['huggingface/huggingface_hub', '0ba990ae4b7974f68d281064aca4bb1b1cc61ad0', 4937]],
]);

test('midday successor is exact-source governed and cannot self-promote', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-midday-cross-stack-integrity-successors');
  assert.equal(wave.sourceOfTruth, 'szl-holdings/szl-frontier');
  assert.equal(wave.sourceRevisionObserved, 'b8e8f5a8146b3f8b6484db463646d1fdeb9e8047');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-18-late-runtime-integrity-successors');
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate pins are unique, explicit and non-inheriting', () => {
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
    assert.equal(candidate.sourceVerification, 'EXACT_GITHUB_COMMIT_OBSERVED');
    assert.equal(candidate.inheritsQualification, false);
    assert.equal(candidate.productionDisposition, 'HOLD');
    assert.ok(candidate.requiredEvidence.length >= 4);
    const evidence = candidate.requiredEvidence.join(' ').toLowerCase();
    assert.match(evidence, /exact/);
    assert.match(evidence, /(known-bad|predecessor)/);
    assert.match(evidence, /(rollback|qualified trainer path)/);
  }
});

test('VibeVoice ASR requires integer-boundary and full-model speech controls', () => {
  const c = wave.candidates.find((item) => item.id === 'transformers-vibevoice-asr-long-audio-token-count');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.equal(c.primaryArtifact, 'microsoft/VibeVoice-ASR-HF');
  assert.match(c.materiality.join(' '), /2\^24/);
  assert.match(evidence, /immediately below\/at\/above 2\^24/);
  assert.match(evidence, /processor and model audio-token counts to agree exactly/);
  assert.match(evidence, /hour-scale inputs/);
  assert.match(evidence, /Do not rehost model weights/);
});

test('PEFT hotswap requires normal-load equivalence, rslora and rollback', () => {
  const c = wave.candidates.find((item) => item.id === 'peft-lora-hotswap-rank-alpha-pattern-scaling');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.match(c.materiality.join(' '), /silently change even when reloading the same checkpoint/);
  assert.match(evidence, /normal load versus hotswap scaling\/output divergence/);
  assert.match(evidence, /A->B->A/);
  assert.match(evidence, /rslora on\/off/);
  assert.match(evidence, /NEEDS_REVALIDATION/);
});

test('KTO Liger distributed loss requires gradient and update parity', () => {
  const c = wave.candidates.find((item) => item.id === 'trl-kto-liger-ddp-wrapper-gradient-reduction');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.match(c.materiality.join(' '), /DDP gradient-reducer hooks/);
  assert.match(evidence, /single-process oracle versus DDP loss, lm_head gradients and one optimizer update/);
  assert.match(evidence, /ZeRO-3, FSDP\/FSDP2/);
  assert.match(evidence, /rank failure\/restart/);
});

test('Diffusers disk offload must reproduce the allocator lifetime corruption boundary', () => {
  const c = wave.candidates.find((item) => item.id === 'diffusers-disk-offload-compute-stream-lifetime');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.match(c.materiality.join(' '), /foreign data/);
  assert.match(evidence, /allocator reuse pressure/);
  assert.match(evidence, /disk offload, memory offload and no-offload/);
  assert.match(evidence, /record_stream true\/false/);
  assert.match(evidence, /finite deterministic result/);
});

test('TritonMLA memory safety requires per-query rows and explicit DCP refusal', () => {
  const c = wave.candidates.find((item) => item.id === 'vllm-tritonmla-causal-multitoken-decode-memory-safety');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.match(c.materiality.join(' '), /read outside metadata rows/);
  assert.match(evidence, /query lengths 2,3,4,5,8/);
  assert.match(evidence, /expand block_table\/seq_lens per q row/);
  assert.match(evidence, /explicit DCP causal rejection/);
  assert.match(evidence, /memory-safety\/poison-canary/);
});

test('Hub positioned-file download never destroys caller-owned prefix bytes', () => {
  const c = wave.candidates.find((item) => item.id === 'hf-hub-http-get-positioned-file-integrity');
  assert.ok(c);
  const evidence = c.requiredEvidence.join(' ');
  assert.match(c.materiality.join(' '), /truncate caller-owned prefix bytes/);
  assert.match(evidence, /nonzero initial file position with Range honored and Range ignored/);
  assert.match(evidence, /preservation of all caller-owned bytes/);
  assert.match(evidence, /incomplete artifact to success/);
  assert.match(evidence, /preserve v1.32 rollback/);
});

test('authority-chain projection stays fail-closed and independently owned', () => {
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.equal(wave.alignmentDependency.observedA11oySourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.equal(wave.alignmentDependency.sourceRuntimeProductIdentity, 'REQUIRES_FRESH_SAME_WINDOW_RECHECK_FOR_WHOLE_CHAIN_CLOSURE');
  assert.equal(wave.alignmentDependency.proofCapturedAt, '2026-09-12T01:25:04Z');
  assert.deepEqual(wave.alignmentDependency.proofCounts, {models: 46, datasets: 35, spaces: 21});
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
