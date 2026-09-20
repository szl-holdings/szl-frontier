import assert from "node:assert/strict";
import test from "node:test";
import {
  KERNEL_ORG_CARD_COUNT,
  KERNEL_TAG_TYPED_IDS,
  classifyKernelId,
  kernelFamilyCatalog,
  refuseTrained,
} from "./kernel-family.ts";

test("kernel family keeps 14-vs-15 open", () => {
  const catalog = kernelFamilyCatalog();
  assert.equal(catalog.orgCardCount, 14);
  assert.equal(catalog.taggedCount, 15);
  assert.equal(catalog.conflict, "14-vs-15");
  assert.equal(catalog.chosenValue, null);
  assert.equal(catalog.trained, false);
  assert.equal(catalog.productionAuthorization, false);
});

test("collapsing the conflict is refused", () => {
  assert.throws(
    () => kernelFamilyCatalog({ orgCardCount: KERNEL_TAG_TYPED_IDS.length, taggedIds: KERNEL_TAG_TYPED_IDS }),
    /CONFLICT_COLLAPSED/,
  );
});

test("trained stamps are refused", () => {
  assert.throws(() => refuseTrained("KERNEL_SOFTWARE", true), /KERNEL_NOT_TRAINED/);
  assert.throws(() => refuseTrained("TRAINED_WEIGHTS", false), /KERNEL_NOT_TRAINED/);
});

test("ids classify as software not trained", () => {
  assert.equal(classifyKernelId(KERNEL_TAG_TYPED_IDS[0]), "KERNEL_SOFTWARE");
  assert.equal(KERNEL_ORG_CARD_COUNT, 14);
});
