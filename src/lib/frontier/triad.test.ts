import assert from "node:assert/strict";
import test from "node:test";
import { healthPayload, readyPayload, sourcePayload } from "./source.ts";
import {
  SPACE_TRIAD_SURFACES,
  TriadError,
  assertTriadDistinct,
  composeTriad,
  spaceTriadContract,
} from "./triad.ts";

test("health, ready, and source stay three schemas", () => {
  const health = healthPayload();
  const ready = readyPayload({ catalogLoaded: true, engineHydratable: true });
  const source = sourcePayload();
  assertTriadDistinct(health, ready, source);
  assert.notEqual(health.schema, ready.schema);
  assert.notEqual(health.schema, source.schema);
  assert.equal(health.ok, true);
  assert.equal(ready.ready, true);
  assert.equal(ready.productionReady, false);
  assert.equal(ready.productionAuthorization, false);
  assert.ok(ready.blockers.includes("PRODUCTION_HOLD"));
  assert.equal(source.sourceContentFilesRead, 0);
  assert.equal(source.semanticReviewComplete, false);
});

test("health ok never implies production ready", () => {
  const health = healthPayload();
  const ready = readyPayload({ catalogLoaded: true, engineHydratable: true });
  const source = sourcePayload();
  assert.equal(health.ok, true);
  assert.equal(ready.productionReady, false);
  assertTriadDistinct(health, ready, source);
});

test("smuggling productionReady true fails closed", () => {
  const health = healthPayload();
  const ready = {
    ...readyPayload({ catalogLoaded: true, engineHydratable: true }),
    productionReady: true,
  };
  const source = sourcePayload();
  assert.throws(
    () => assertTriadDistinct(health, ready, source),
    (err: unknown) => err instanceof TriadError && err.code === "PRODUCTION_READY_OVERCLAIM",
  );
});

test("operator not-ready still cannot authorize", () => {
  const ready = readyPayload({ catalogLoaded: false, engineHydratable: true });
  assert.equal(ready.ready, false);
  assert.equal(ready.status, "not_ready");
  assert.equal(ready.productionReady, false);
  assert.ok(ready.blockers.includes("CATALOG_NOT_LOADED"));
});

test("space triad inventory is contract not verification", () => {
  const contract = spaceTriadContract();
  assert.equal(contract.surfaces.length, SPACE_TRIAD_SURFACES.length);
  assert.equal(SPACE_TRIAD_SURFACES.length, 21);
  assert.equal(contract.runtimeVerified, false);
  assert.ok(contract.surfaces.every((row) => row.runtimeVerified === false));
});

test("composed triad envelopes cannot grant authority", async () => {
  const triad = await composeTriad({ catalogLoaded: true, engineHydratable: true });
  assert.equal(triad.productionAuthorization, false);
  assert.equal(triad.envelopes.health.authority, "NONE");
  assert.equal(triad.envelopes.ready.authority, "NONE");
  assert.equal(triad.envelopes.source.payload.fileAuditComplete, false);
});
