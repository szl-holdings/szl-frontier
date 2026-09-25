import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-evening-model-serving-integrity-successors.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = Object.fromEntries(wave.candidates.map((c) => [c.id, c]));

const expectedPins = {
  'vllm-mistral-large3-yarn-attention-scale': ['vllm-project/vllm', '2bdae2a5a83fe8e5640078a3d4bfe86cce323d0b', 57563],
  'vllm-dsv4-fused-moe-ep-expert-distribution': ['vllm-project/vllm', '017dced6a6fd3cf430e4686a47b354da1cadfbf5', 57465],
  'sglang-top1-moe-routed-scaling': ['sgl-project/sglang', '7714b182f223bdcd1b376c6ade369d9c48dfb7ac', 40187],
  'sglang-mistral-common-tool-prompt-roundtrip': ['sgl-project/sglang', '21e6c98ccbb3d85e716e7639786e7f6135c6d86c', 39773],
  'peft-rslora-weighted-adapter-scaling': ['huggingface/peft', 'fd3a7b1f310c6507ccb8191eb05f404aaf4b36ce', 3449],
  'diffusers-qwen-image21-block-causal-kvcache': ['huggingface/diffusers', '6256aa7666cedd47443adc8f82da9a10e110b09c', 14804],
  'hf-hub-jobs-cli-format-flag-consumption': ['huggingface/huggingface_hub', '83ba61a53721caaf3cc2d53e65a25315519be122', 4936],
  'vllm-fast-prefill-active-lora-padding': ['vllm-project/vllm', 'a1bf8ac12d9f1537ff2d233f5ab3d1346fd8bd44', 56456],
};

test('evening model/serving wave is exact-source, non-promoting, and held', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-evening-model-serving-integrity-successors');
  assert.equal(wave.sourceRevisionObserved, '10d88c01f174acddefaa0bf5f10c0ef8c9ffd63e');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.predecessorWave, '2026-09-18-afternoon-runtime-training-successors');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.candidates.length, 8);
});

test('all candidates are exact SHA-bound, independent, and not production-qualified', () => {
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

test('Mistral-Large-3 lane requires a known-bad scaling control and long-context reference', () => {
  const e = byId['vllm-mistral-large3-yarn-attention-scale'].requiredEvidence.join(' ');
  assert.match(e, /known-bad control/);
  assert.match(e, /attention_factor=1\.0/);
  assert.match(e, /long-context logits/);
  assert.match(e, /apply_scale=true/);
  assert.match(e, /rollback/);
});

test('DeepSeek-V4 fused MoE lane binds ownership to EP rather than TP', () => {
  const c = byId['vllm-dsv4-fused-moe-ep-expert-distribution'];
  assert.match(c.materiality.join(' '), /expert-parallel process group/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /TP size differs from EP size/);
  assert.match(e, /exactly once with no gaps or overlap/);
  assert.match(e, /non-fused or otherwise qualified reference/);
});

test('SGLang MoE scaling cannot bypass non-unit routed scaling', () => {
  const e = byId['sglang-top1-moe-routed-scaling'].requiredEvidence.join(' ');
  assert.match(e, /top-k=1/);
  assert.match(e, /non-unit factors/);
  assert.match(e, /explicit post-route scaling reference/);
  assert.match(e, /LoRA hooks/);
});

test('Mistral tool-call prompt lane requires exact token identity and keeps effectors disabled', () => {
  const c = byId['sglang-mistral-common-tool-prompt-roundtrip'];
  assert.match(c.materiality.join(' '), /tool_choice=auto/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /compare final model input IDs exactly/);
  assert.match(e, /never double-inserts BOS\/control tokens/);
  assert.match(e, /No tool effector may be enabled/);
});

test('PEFT weighted rslora lane keeps the known SVD defect outside qualification', () => {
  const c = byId['peft-rslora-weighted-adapter-scaling'];
  assert.match(c.materiality.join(' '), /sqrt\(new_rank\)/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /linear\/cat composition/);
  assert.match(e, /SVD UNQUALIFIED/);
  assert.match(e, /provenance\/license/);
});

test('Qwen-Image 2.1 lane refuses substitution when exact model identity is unavailable', () => {
  const c = byId['diffusers-qwen-image21-block-causal-kvcache'];
  assert.equal(c.primaryModelReference, 'Qwen/Qwen-Image-2.1');
  assert.match(c.modelReferenceEvidence, /PRIMARY_HF_DIFFUSERS_DOCS_REFERENCE/);
  const e = c.requiredEvidence.join(' ');
  assert.match(e, /keep the lane UNAVAILABLE/);
  assert.match(e, /do not substitute another Qwen image model/);
  assert.match(e, /KV cache on\/off/);
  assert.match(e, /do not mirror weights merely for inventory/);
});

test('HF Jobs lane treats CLI format flags as launch integrity, not successful workload proof', () => {
  const e = byId['hf-hub-jobs-cli-format-flag-consumption'].requiredEvidence.join(' ');
  assert.match(e, /alter forwarded image\/script arguments/);
  assert.match(e, /respects --/);
  assert.match(e, /never treat successful submission as workload success/);
  assert.match(e, /Do not change production schedules\/credentials\/compute defaults/);
});

test('active-LoRA fast-prefill lane binds graph padding to the real adapter count', () => {
  const e = byId['vllm-fast-prefill-active-lora-padding'].requiredEvidence.join(' ');
  assert.match(e, /num_active_loras/);
  assert.match(e, /1\/2\/4 active adapters/);
  assert.match(e, /compare with fast prefill disabled/);
  assert.match(e, /rollback/);
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
