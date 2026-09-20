import assert from "node:assert/strict";
import test from "node:test";
import {
  EnvelopeError,
  assertEnvelopeHolds,
  sealReceipt,
  sha256Hex,
  stableCanonical,
} from "./receipt-envelope.ts";

test("envelope cannot grant authority", async () => {
  const envelope = await sealReceipt({
    kind: "health",
    payload: { schema: "szl.frontier.health/v1", ok: true, productionAuthorization: false },
    producedAt: "2026-09-20T15:00:00Z",
  });
  assert.equal(envelope.authority, "NONE");
  assert.equal(envelope.productionAuthorization, false);
  assertEnvelopeHolds(envelope);
});

test("payload that claims production authorization is refused", async () => {
  await assert.rejects(
    () =>
      sealReceipt({
        kind: "ready",
        payload: { productionAuthorization: true },
      }),
    (err: unknown) => err instanceof EnvelopeError && err.code === "PRODUCTION_AUTHORIZATION_FORBIDDEN",
  );
});

test("digest is stable across key order", async () => {
  const a = await sha256Hex(stableCanonical({ b: 1, a: 2 }));
  const b = await sha256Hex(stableCanonical({ a: 2, b: 1 }));
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("mutating authority after seal is detected", async () => {
  const envelope = await sealReceipt({
    kind: "source",
    payload: { productionAuthorization: false },
  });
  const smuggled = { ...envelope, authority: "PRODUCTION" as const };
  assert.throws(
    () => assertEnvelopeHolds(smuggled as typeof envelope),
    (err: unknown) => err instanceof EnvelopeError && err.code === "AUTHORITY_NOT_NONE",
  );
});
