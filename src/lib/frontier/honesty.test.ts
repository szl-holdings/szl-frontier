import assert from "node:assert/strict";
import test from "node:test";
import {
  HonestyError,
  displayUnknown,
  honestyLayers,
  refuseUnknownAsZero,
} from "./honesty.ts";

test("UNKNOWN is never rendered as a measured zero", () => {
  assert.equal(displayUnknown(null), "UNKNOWN");
  assert.equal(displayUnknown(undefined), "UNKNOWN");
  assert.equal(displayUnknown(0), "0");
  assert.equal(refuseUnknownAsZero(null), null);
  assert.equal(refuseUnknownAsZero(14), 14);
});

test("file audit cannot complete when no files were read", () => {
  assert.throws(
    () =>
      honestyLayers({
        membershipMeasured: true,
        sourceContentFilesRead: 0,
        fileAuditComplete: true,
        runtimeVerified: false,
      }),
    (err: unknown) => err instanceof HonestyError && err.code === "FILE_AUDIT_OVERCLAIM",
  );
});

test("membership measured does not qualify runtime or content", () => {
  const layers = honestyLayers({
    membershipMeasured: true,
    sourceContentFilesRead: 0,
    fileAuditComplete: false,
    runtimeVerified: false,
  });
  assert.equal(layers.layers.membership, "MEASURED");
  assert.equal(layers.layers.tree, "NOT_PERFORMED");
  assert.equal(layers.layers.content, "NOT_PERFORMED");
  assert.equal(layers.layers.qualification, "NOT_CLAIMED");
  assert.equal(layers.productionAuthorization, false);
  assert.equal(layers.runtimeVerified, false);
});
