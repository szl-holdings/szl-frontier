/* Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wave = JSON.parse(
  readFileSync(
    new URL('../frontier/waves/2026-09-14-dynamo-request-trace-drain.json', import.meta.url),
    'utf8',
  ),
);

test('pins the exact Dynamo request-trace lifecycle source', () => {
  assert.equal(wave.schema, 'szl.frontier.integration-wave.v1');
  assert.equal(wave.canonicalIssue, 'szl-holdings/szl-frontier#37');
  assert.equal(wave.candidate.upstreamRepository, 'ai-dynamo/dynamo');
  assert.equal(wave.candidate.upstreamRevision, 'c0b88ba4837c694993cfa1357488df70fdc4b40a');
  assert.equal(wave.candidate.productionDisposition, 'HOLD');
});

test('does not inherit prior Dynamo qualification', () => {
  assert.equal(wave.deduplication.runtimeRetrievalCanonicalOwner, 'szl-holdings/szl-frontier#37');
  assert.equal(wave.deduplication.exactSourcePreviouslyAdmitted, false);
  assert.equal(wave.deduplication.inheritsPriorDynamoQualification, false);
  assert.equal(wave.deduplication.traceIntegrityEvidenceInherited, false);
});

test('preserves the clean-drain contract and abrupt-exit bound', () => {
  assert.equal(wave.runtimeContract.activeInputReferenceCounted, true);
  assert.equal(wave.runtimeContract.drainOwner, 'last active input release');
  assert.equal(wave.runtimeContract.failingInputStillDrains, true);
  assert.equal(wave.runtimeContract.shutdownReportNamesTimedOutSinks, true);
  assert.equal(wave.runtimeContract.startGateReopensAfterDrain, true);
  assert.equal(wave.runtimeContract.cancelOrPanicDropCanAwaitDrain, false);
  assert.equal(wave.runtimeContract.abruptExitGuaranteesCompleteFlush, false);
});

test('does not confuse request tracing with receipt authority', () => {
  assert.equal(wave.evidenceSemantics.requestTraceIsReceiptAuthority, false);
  assert.equal(wave.evidenceSemantics.requestTraceCanBeSupportingEvidenceOnlyAfterQualification, true);
  assert.equal(wave.evidenceSemantics.acceptedOntoTraceBusDoesNotMeanDurablyPersistedUntilDrainCompletes, true);
  assert.equal(wave.evidenceSemantics.timeoutOrDropMustRemainVisible, true);
  assert.equal(wave.evidenceSemantics.exactlyOnceClaimAuthorized, false);
});

test('keeps production and proof projection closed', () => {
  assert.equal(wave.productionDisposition, 'HOLD');
  assert.equal(wave.automaticProductionPromotion, false);
  assert.equal(wave.weightsRehosted, false);
  assert.equal(wave.policyOrProtectionWeakened, false);
  assert.equal(wave.projection['a-11-oy.com'], 'UNCHANGED');
  assert.equal(wave.projection['a11oy.net'], 'NO_TRACE_COMPLETENESS_OR_RECEIPT_SUCCESS_CLAIM_UNTIL_QUALIFIED');
});
