/**
 * The 2026-11-05 visibility drift record stays a failing observation.
 * It must not rewrite the dated public inventory or drop required Spaces.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const drift = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "estate", "hf-anonymous-visibility-drift-2026-11-05.json"),
    "utf8",
  ),
);
const inventory = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "estate", "hf-public-inventory-2026-11-02.json"),
    "utf8",
  ),
);
const seat = readFileSync(join(here, "..", "tools", "estate_outside_seat.py"), "utf8");

const REQUIRED = [
  "SZLHOLDINGS/README",
  "SZLHOLDINGS/immune-lattice",
  "SZLHOLDINGS/sentra",
  "SZLHOLDINGS/szl-constellation",
];

test("visibility drift keeps the anonymous verifier failing closed", () => {
  assert.equal(drift.schema, "szl.frontier.anonymous-visibility-drift.v1");
  assert.equal(drift.effect.baselineRemoved, false);
  assert.equal(drift.effect.verifierMayPass, false);
  assert.equal(drift.effect.productionDisposition, "HOLD");
  assert.equal(drift.effect.promotionEffect, "NONE");
  assert.equal(drift.failingObservation.exitCode, 2);
  assert.equal(drift.failingObservation.overallStatus, "INCOMPLETE");
  assert.equal(drift.predecessor.exitCode, 0);
  assert.equal(drift.predecessor.workflowRun, 41780533498);
  assert.equal(drift.failingObservation.workflowRun, 41975311709);
  assert.equal(drift.anonymousAuthError.httpStatus, 401);
  assert.equal(
    drift.anonymousAuthError.bodySha256,
    "65842e3d84e6b7f62a470c85204e80b953bb8f944e9b69813130a9d7f3eaa1d8",
  );
});

test("required Spaces stay on the baseline and in the historical inventory", () => {
  assert.deepEqual(
    drift.requiredBaseline.map((row) => row.id),
    REQUIRED,
  );
  for (const row of drift.requiredBaseline) {
    assert.equal(row.anonymousHttpStatusOnFailure, 401);
    assert.equal(row.lastAnonymousRuntimeStage, "RUNNING");
    assert.match(row.lastAnonymousSourceRevision, /^[0-9a-f]{40}$/);
  }
  for (const id of ["SZLHOLDINGS/immune-lattice", "SZLHOLDINGS/sentra", "SZLHOLDINGS/szl-constellation"]) {
    assert.equal(inventory.ids.spaces.includes(id), true);
  }
  assert.equal(inventory.ids.spaces.includes("SZLHOLDINGS/README"), false);
  for (const name of ["immune-lattice", "sentra", "szl-constellation"]) {
    assert.match(seat, new RegExp(`"${name}"`));
  }
  assert.match(seat, /ORG_PROFILE_SPACE = "SZLHOLDINGS\/README"/);
});

test("discovered withdrawals are recorded without becoming a silent pass", () => {
  const extras = drift.leftAnonymousAuthorListing.map((row) => row.id);
  assert.equal(new Set(extras).size, extras.length);
  assert.equal(extras.length, 12);
  for (const row of drift.leftAnonymousAuthorListing) {
    assert.equal(row.inventory, "discovered-extra");
    assert.equal(REQUIRED.includes(row.id), false);
    assert.equal(inventory.ids.spaces.includes(row.id), true);
  }
  assert.equal(drift.readOnlyOrgLookup.private.length, 16);
  for (const id of REQUIRED.concat(extras)) {
    assert.equal(drift.readOnlyOrgLookup.private.includes(id), true);
  }
});
