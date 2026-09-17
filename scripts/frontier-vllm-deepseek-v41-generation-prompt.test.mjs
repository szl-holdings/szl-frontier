/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-15-vllm-deepseek-v41-generation-prompt.json', import.meta.url),
    'utf8',
  ),
);

test('binds the exact vLLM DeepSeek renderer successor', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#134');
  assert.equal(wave.candidate.upstreamRepository, 'vllm-project/vllm');
  assert.equal(wave.candidate.upstreamRevision, '142020c6c2c0d4fec4d36df28290e3d9b654a385');
  assert.equal(wave.candidate.upstreamPullRequest, 56593);
  assert.equal(wave.candidate.releaseState, 'MAINLINE_EXACT_SOURCE_WATCH');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('deduplicates against the existing DeepSeek V4.1 execution owners', () => {
  assert.equal(wave.deduplication.deepSeekV41ForgeOwner, 'szl-holdings/szl-forge#310');
  assert.equal(wave.deduplication.deepSeekV41ServeOwner, 'szl-holdings/szl-serve#9');
  assert.equal(wave.deduplication.deepSeekV41GpuOwner, 'szl-holdings/szl-gpu-bridge#102');
  assert.equal(wave.deduplication.sglangRendererSuccessor, 'szl-holdings/szl-frontier#150');
  assert.equal(wave.deduplication.vllmAdaptiveAcceptanceSuccessor, 'szl-holdings/szl-frontier#149');
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.inheritsQualification, false);
});

test('treats add_generation_prompt as a byte-level protocol boundary', () => {
  assert.equal(wave.protocolBoundary.affectedOption, 'add_generation_prompt');
  assert.equal(wave.protocolBoundary.sourceOwnedProtocolRequired, true);
  assert.equal(wave.protocolBoundary.genericJinjaFallbackAuthorized, false);
  assert.deepEqual(wave.protocolBoundary.affectedDialects, [
    'DeepSeek V3.2',
    'DeepSeek V4',
    'DeepSeek V4.1',
  ]);
});

test('requires true and false generation-prompt fixtures plus tool/system/developer tails', () => {
  assert.ok(
    wave.requiredEvidence.some(
      (entry) => entry.includes('add_generation_prompt=true') && entry.includes('add_generation_prompt=false'),
    ),
  );
  for (const requiredCase of ['trailing system', 'trailing developer', 'merged tool-result', 'multi-turn']) {
    assert.ok(wave.requiredEvidence.some((entry) => entry.includes(requiredCase)));
  }
  assert.ok(
    wave.requiredEvidence.some(
      (entry) => entry.includes('continue_final_message') && entry.includes('reasoning mode'),
    ),
  );
});

test('keeps execution and downstream projection fail closed', () => {
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.projection['a-11-oy.com'], 'UNCHANGED');
  assert.match(wave.projection.huggingFace, /^NO_NEW_SZL_ARTIFACT_OR_RUNTIME_PROJECTION_/u);
  assert.equal(wave.evaluationOwners.productProjection, 'szl-holdings/a11oy');
  assert.equal(wave.evaluationOwners.proofProjection, 'szl-holdings/a11oy-net');
});
