import assert from "node:assert/strict";
import test from "node:test";
import {
  PreviewSessionRequired,
  requireVerifiedPreviewIdentity,
} from "./verified-preview-identity.ts";

test("a verified session binds a real id and never consults the legacy fallback", async () => {
  let fallbackCalls = 0;
  const id = await requireVerifiedPreviewIdentity(
    async () => ({ id: "real-better-auth-user-0123" }),
    async () => { fallbackCalls++; return "dev-user"; },
  );
  assert.equal(id, "real-better-auth-user-0123");
  assert.equal(fallbackCalls, 0);
});

test("shared dev-user fallback can never authorize counterfactual preview", async () => {
  let called = 0;
  await assert.rejects(
    requireVerifiedPreviewIdentity(
      async () => null,
      async () => { called++; return "dev-user"; },
    ),
    (error: unknown) => error instanceof PreviewSessionRequired &&
      error.status === 401 && error.name === "PreviewSessionRequired",
  );
  assert.equal(called, 1);
});

test("a returned arbitrary legacy user id still cannot be mistaken for a verified session", async () => {
  await assert.rejects(
    requireVerifiedPreviewIdentity(async () => null, async () => "someone-else"),
    (error: unknown) => error instanceof PreviewSessionRequired,
  );
});

test("auth configuration unavailable keeps its 503 rather than reverting to a dev user", async () => {
  const refused = Object.assign(new Error("Federation refused"), { status: 503 });
  await assert.rejects(
    requireVerifiedPreviewIdentity(async () => null, async () => { throw refused; }),
    (error: unknown) => error === refused,
  );
});

test("signed-out real-session path preserves the 401 verdict", async () => {
  const signedOut = Object.assign(new Error("Unauthorized"), { status: 401 });
  await assert.rejects(
    requireVerifiedPreviewIdentity(async () => null, async () => { throw signedOut; }),
    (error: unknown) => error === signedOut,
  );
});

test("missing and malformed verified session ids refuse even if fallback returns", async () => {
  for (const session of [
    null, { id: "" }, { id: " " }, { id: "bad user " }, { id: 123 },
  ]) {
    await assert.rejects(
      requireVerifiedPreviewIdentity(
        async () => session as never,
        async () => "dev-user",
      ),
      (error: unknown) => error instanceof PreviewSessionRequired &&
        error.status === 401,
    );
  }
});
