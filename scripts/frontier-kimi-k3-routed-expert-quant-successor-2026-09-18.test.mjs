import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = new URL('../frontier/waves/2026-09-18-kimi-k3-routed-expert-quant-successor.json', import.meta.url);
const wave = JSON.parse(fs.readFileSync(path, 'utf8'));
const c = wave.candidate;

test('Kimi routed-expert quant successor is exact-source and held', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.wave, '2026-09-18-kimi-k3-routed-expert-quant-successor');
  assert.equal(wave.sourceRevisionObserved, 'b8e8f5a8146b3f8b6484db463646d1fdeb9e8047');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#180');
  assert.equal(wave.existingModelAdmissionOwner, 'szl-holdings/szl-frontier#47');
  assert.equal(wave.existingKimiRuntimeOwner, 'szl-holdings/szl-frontier#168');
  assert.deepEqual(wave.authorityChain, ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net']);
  assert.equal(wave.disposition, 'EVALUATION_HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.productionDefaultsChanged, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
});

test('candidate is exact-pinned and cannot inherit Kimi or ROCm qualification', () => {
  assert.equal(c.id, 'vllm-kimi-k3-nvidia-routed-expert-quant');
  assert.equal(c.upstreamRepository, 'vllm-project/vllm');
  assert.equal(c.upstreamRevision, '76d517fd1279805fa2318c28343fcd57b030ead3');
  assert.equal(c.upstreamPullRequest, 57430);
  assert.match(c.upstreamRevision, /^[0-9a-f]{40}$/);
  assert.equal(c.sourceVerification, 'EXACT_GITHUB_COMMIT_OBSERVED');
  assert.equal(c.inheritsQualification, false);
  assert.equal(c.productionDisposition, 'HOLD');
  assert.match(c.materiality.join(' '), /quant_config=None/);
  assert.match(c.materiality.join(' '), /#47/);
  assert.match(c.materiality.join(' '), /#168/);
});

test('qualification requires negative structural control and numerical parity', () => {
  const evidence = c.requiredEvidence.join(' ');
  assert.match(evidence, /immediate predecessor as a known-bad structural control/);
  assert.match(evidence, /routed_expert_down_proj\/up_proj ignore the requested quantization configuration/);
  assert.match(evidence, /fail if the selected quant scheme is unsupported rather than silently falling back/);
  assert.match(evidence, /independently qualified BF16\/FP16 or declared reference/);
  assert.match(evidence, /per-layer quantization coverage/);
  assert.match(evidence, /preserve the incumbent runtime as rollback/);
  assert.match(evidence, /do not rehost weights/);
});

test('projection and alignment remain independent holds', () => {
  assert.equal(wave.alignmentDependency.canonicalResidualAlignmentIssue, 'szl-holdings/szl-frontier#151');
  assert.equal(wave.alignmentDependency.state, 'INDEPENDENT_HOLD');
  assert.equal(wave.projection.huggingFace, 'NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_UNTIL_QUALIFIED');
  assert.equal(wave.projection['a-11-oy.com'], 'NO_CAPABILITY_CHANGE_FROM_DISCOVERY');
  assert.equal(wave.projection['a11oy.net'], 'EXACT_MEASURED_RECEIPTS_ONLY_AFTER_QUALIFICATION');
});
