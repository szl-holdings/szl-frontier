import assert from "node:assert/strict";
import test from "node:test";
import {
  PinError,
  mintHeadShaPin,
  mintMembershipIdentityPin,
  pinDiff,
  refuseHeadPinWithoutShas,
} from "./estate-pin.ts";

test("UNKNOWN family count stays null, not zero", async () => {
  const pin = await mintMembershipIdentityPin([
    { family: "kernels", status: "UNAVAILABLE", ids: [] },
    { family: "models", status: "MEASURED", ids: ["SZLHOLDINGS/a", "SZLHOLDINGS/b"] },
  ]);
  const kernels = pin.families.find((row) => row.family === "kernels");
  const models = pin.families.find((row) => row.family === "models");
  assert.equal(kernels?.count, null);
  assert.equal(models?.count, 2);
  assert.equal(pin.fileAuditComplete, false);
  assert.equal(pin.sourceContentFilesRead, 0);
});

test("head SHA pin refuses missing revisions", async () => {
  assert.throws(
    () => refuseHeadPinWithoutShas([]),
    (err: unknown) => err instanceof PinError && err.code === "HEAD_SHA_PIN_REFUSED_WITHOUT_REVISIONS",
  );
  assert.throws(
    () => refuseHeadPinWithoutShas([{ id: "szl-holdings/szl-frontier", sha: null }]),
    (err: unknown) => err instanceof PinError && err.code === "HEAD_SHA_PIN_REFUSED_WITHOUT_REVISIONS",
  );
  await assert.rejects(
    () => mintHeadShaPin([{ id: "szl-holdings/szl-frontier", sha: undefined }]),
    (err: unknown) => err instanceof PinError && err.code === "HEAD_SHA_PIN_REFUSED_WITHOUT_REVISIONS",
  );
});

test("pinDiff reports added and removed without inventing counts", () => {
  const diff = pinDiff(["a", "b"], ["b", "c"]);
  assert.deepEqual(diff.added, ["c"]);
  assert.deepEqual(diff.removed, ["a"]);
  assert.equal(diff.unchanged, 1);
});
