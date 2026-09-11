import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const wave = JSON.parse(
  fs.readFileSync(
    path.join(root, "frontier/waves/2026-09-11-hf-harbor-private-datasets.json"),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.policy.noWeightRehostingForInventory, true);
assert.equal(wave.candidate.repository, "huggingface/harbor-hf");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "8685727908e8d9ee5ccde48586864a851e24ff79",
);
assert.equal(
  wave.candidate.upstream.priorObservedRevision,
  "271303d7a21fa595a5a71e46ce5524b0aff6bb9f",
);
assert.equal(wave.candidate.upstream.commitsAhead, 7);
assert.notEqual(
  wave.candidate.upstream.observedRevision,
  wave.candidate.upstream.priorObservedRevision,
);

const changes = wave.candidate.materialChanges.join("\n").toLowerCase();
for (const required of [
  "private hugging face dataset sources",
  "credential helper restricted to huggingface.co",
  "git lfs",
  "fails before source resolution",
  "moving-jobs pagination",
  "token non-disclosure",
]) {
  assert.ok(changes.includes(required), `missing material-change boundary: ${required}`);
}

const acceptance = wave.candidate.evaluation.acceptance.join("\n").toLowerCase();
for (const required of [
  "non-sensitive private dataset",
  "cryptographic digests",
  "answers only for huggingface.co",
  "trial agent/model environments never receive the control hf_token",
  "missing git lfs",
  "read-only dataset access",
  "credential rotation/revocation",
  "partial-history state",
]) {
  assert.ok(acceptance.includes(required), `missing fail-closed requirement: ${required}`);
}

assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.equal(wave.trackingIssue, 83);

console.log("Harbor private-dataset frontier contract: PASS");
