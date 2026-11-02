/**
 * Offline contract for the dated public Hugging Face inventory projection.
 * Author-list totals remain exact while directly resolvable reserved assets are
 * recorded separately and cannot be double-counted.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "estate", "hf-public-inventory-2026-11-02.json"),
    "utf8",
  ),
);
const reconciliation = JSON.parse(
  readFileSync(
    join(here, "..", "frontier", "estate", "hf-public-inventory-reconciliation-2026-11-02.json"),
    "utf8",
  ),
);

test("author-list ids exactly match their dated counts", () => {
  for (const kind of ["models", "datasets", "spaces"]) {
    assert.equal(inventory.ids[kind].length, inventory.counts[kind]);
    assert.equal(new Set(inventory.ids[kind]).size, inventory.ids[kind].length);
  }
});

test("reserved public profile Space is reconciled without double counting", () => {
  assert.deepEqual(reconciliation.directlyResolvableSpecialAssets.spaces, [
    {
      apiUrl: "https://huggingface.co/api/spaces/SZLHOLDINGS/README",
      id: "SZLHOLDINGS/README",
      listedByAuthorEndpoint: false,
      pageUrl: "https://huggingface.co/spaces/SZLHOLDINGS/README",
      public: true,
      revision: "e96cb22c0fc3d9aef0384906cd4a9408535b3954",
    },
  ]);
  assert.equal(inventory.ids.spaces.includes("SZLHOLDINGS/README"), false);
  assert.equal(inventory.counts.spaces, 39);
});

test("special Space evidence and endpoint scope are explicit", () => {
  assert.equal(
    reconciliation.baseSnapshot.path,
    "frontier/estate/hf-public-inventory-2026-11-02.json",
  );
  assert.equal(reconciliation.baseSnapshot.capturedAt, inventory.capturedAt);
  assert.deepEqual(reconciliation.baseSnapshot.authorListCounts, inventory.counts);
  assert.equal(reconciliation.effect.authorListCountsChanged, false);
  assert.equal(reconciliation.effect.authorListIdsChanged, false);
  assert.deepEqual(reconciliation.sources.specialSpaces, [
    "https://huggingface.co/api/spaces/SZLHOLDINGS/README",
    "https://huggingface.co/spaces/SZLHOLDINGS/README",
  ]);
  assert.match(reconciliation.scope, /author-list snapshot/);
  assert.match(reconciliation.scope, /separate direct-resolution finding/);
  assert.match(reconciliation.effect.statement, /excluded from author-list totals and ids/);
});
