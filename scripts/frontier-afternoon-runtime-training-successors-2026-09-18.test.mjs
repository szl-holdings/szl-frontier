import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-afternoon-runtime-training-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = Object.fromEntries(wave.candidates.map((c) => [c.id, c]));

const expectedPins = {
  'vllm-rocm-dsv4-sparse-indexer-logits-layout': ['vllm-project/vllm', '71fc70d3ae1df53300a23ec69f6d97b7207a109f', 50455],
  'sglang-triton-speculative-runtime-token-width': ['sgl-project/sglang', '248c202b46d4a44ad46a3f09d48661b0d9ce6257', 39859],
  'vllm-kv-offload-backpressure-remediation': ['vllm-project/vllm', '23e26e058839fb2a3e77c78fbf2184f563593227', 50045],
  'sglang-router-backpressure-breaker-semantics': ['sgl-project/sglang', '4e0b56c8119a2673d0bf3bd748b8d9a895af79cb', 39464],
  'trl-grpo-streamed-logprob-projection': ['huggingface/trl', 'a98fa6a4428f9aae58dfb26d729d7437f662f27a', 7077],
  'transformers-composite-special-token-alignment': ['huggingface/transformers', 'ea31b0c6ab0d1368130b0482aee7293a014c3a38', 48847],
};

test('afternoon successor wave is exact-source, non-promoting and independently held', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-afternoon-runtime-training-successors');
  assert.equal(wave.sourceRevisionObserved, '10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-18-kimi-k3-routed-expert-quant-successor');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.candidates.length, 6);
});

test('all candidates are exact SHA-bound and cannot inherit qualification', () => {
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

test('ROCm sparse indexer requires affected-hardware negative control and reference logits', () => {
  const evidence = byId['vllm-rocm-dsv4-sparse-indexer-logits-layout'].requiredEvidence.join(' ');
  assert.match(evidence, /gfx942 or gfx950/);
  assert.match(evidence, /known-bad control/);
  assert.match(evidence, /UNAVAILABLE/);
  assert.match(evidence, /compression ratios 1, 2 and 4/);
  assert.match(evidence, /eager reference/);
  assert.match(evidence, /rollback/);
});

test('speculative verification binds runtime width across masks, KV and graph paths', () => {
  const evidence = byId['sglang-triton-speculative-runtime-token-width'].requiredEvidence.join(' ');
  assert.match(evidence, /num_tokens_per_req/);
  assert.match(evidence, /gamma versus gamma\+1/);
  assert.match(evidence, /qo-indptr/);
  assert.match(evidence, /CUDA-graph replay/);
  assert.match(evidence, /non-speculative or independently qualified reference/);
});

test('KV offload pressure cannot silently advertise dropped data', () => {
  const evidence = byId['vllm-kv-offload-backpressure-remediation'].requiredEvidence.join(' ');
  assert.match(evidence, /no dropped store is later advertised as durable\/available/);
  assert.match(evidence, /stale or foreign KV data/);
  assert.match(evidence, /high\/low watermark hysteresis/);
  assert.match(evidence, /P2P to refuse unsupported detector/);
  assert.match(evidence, /rollback/);
});

test('router neutral backpressure remains separately observable', () => {
  const c = byId['sglang-router-backpressure-breaker-semantics'];
  const materiality = c.materiality.join(' ');
  const evidence = c.requiredEvidence.join(' ');
  assert.match(materiality, /429\/503/);
  assert.match(materiality, /does not detect a worker that returns 503 indefinitely/);
  assert.match(evidence, /500, 502, 504/);
  assert.match(evidence, /chronic-429\/503 control/);
  assert.match(evidence, /separate higher-level health\/pressure signal/);
  assert.match(evidence, /half-open probe/);
});

test('streamed GRPO logprobs require numerical, gradient and mixed-precision parity before memory claims', () => {
  const evidence = byId['trl-grpo-streamed-logprob-projection'].requiredEvidence.join(' ');
  assert.match(evidence, /streamed versus full-logit/);
  assert.match(evidence, /log-probabilities, entropies, losses, gradients and optimizer updates/);
  assert.match(evidence, /token-chunk boundary/);
  assert.match(evidence, /BF16\/FP16 autocast/);
  assert.match(evidence, /fully masked completions/);
  assert.match(evidence, /Measure peak memory and throughput only after numerical\/training parity/);
});

test('composite special-token alignment proves text-subconfig ownership and round-trip behavior', () => {
  const evidence = byId['transformers-composite-special-token-alignment'].requiredEvidence.join(' ');
  assert.match(evidence, /Llava-like image-text model/);
  assert.match(evidence, /text-only control/);
  assert.match(evidence, /BOS\/EOS\/PAD/);
  assert.match(evidence, /save\/reload round trips/);
  assert.match(evidence, /fail closed on ambiguous composite text configuration/);
});

test('owner routing and authority-chain projection remain fail-closed', () => {
  assert.equal(wave.owners.canonicalGovernance, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.owners.deterministicEvaluation, 'szl-holdings/szl-forge');
  assert.equal(wave.owners.acceleratorClosure, 'szl-holdings/szl-gpu-bridge');
  assert.equal(wave.owners.productProjectionAfterQualification, 'szl-holdings/a11oy');
  assert.equal(wave.owners.proofProjectionAfterMeasuredReceipts, 'szl-holdings/a11oy-net');
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.equal(wave.alignmentDependency.observedA11oySourceRevision, '43058398fb8ea346a7bd977f1a35391aeec1bf1a');
  assert.deepEqual(wave.alignmentDependency.proofCounts, {models: 46, datasets: 35, spaces: 21});
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
