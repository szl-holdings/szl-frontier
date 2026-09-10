import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const wave = JSON.parse(
  fs.readFileSync(
    path.join(root, "frontier/waves/2026-09-10-hf-harbor-provider-refs.json"),
    "utf8",
  ),
);

assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
assert.equal(wave.policy.defaultEffect, "hold");
assert.equal(wave.policy.automaticProductionPromotion, false);
assert.equal(wave.candidate.repository, "huggingface/harbor-hf");
assert.equal(
  wave.candidate.upstream.observedRevision,
  "271303d7a21fa595a5a71e46ce5524b0aff6bb9f",
);
assert.equal(
  wave.candidate.upstream.priorObservedRevision,
  "ba67b21d625227abf084eba7b605737e4a057575",
);
assert.equal(wave.candidate.upstream.commitsAhead, 3);
assert.notEqual(
  wave.candidate.upstream.observedRevision,
  wave.candidate.upstream.priorObservedRevision,
);

const acceptance = wave.candidate.evaluation.acceptance.join("\n").toLowerCase();
for (const required of [
  "no real credential value",
  "reference-only storage",
  "invalidate prior review",
  "expected-revision conflicts",
  "never fall back",
  "dispatch and restart",
  "independent egress allowlist/firewall",
  "single-writer invariant",
  "native key-only/null-url",
  "already-running-worker revocation as unsupported",
]) {
  assert.ok(acceptance.includes(required), `missing fail-closed requirement: ${required}`);
}

const changes = wave.candidate.materialChanges.join("\n").toLowerCase();
assert.ok(changes.includes("without accepting or storing provider key values"));
assert.ok(changes.includes("review metadata rather than firewall enforcement"));
assert.ok(changes.includes("does not remotely revoke already-running workers"));
assert.equal(wave.candidate.evaluation.status, "EVALUATION");
assert.equal(wave.alignment.productionDisposition, "HOLD");
assert.equal(wave.alignment.automaticPromotion, false);
assert.equal(wave.trackingIssue, 72);

console.log("Harbor provider-reference frontier contract: PASS");
