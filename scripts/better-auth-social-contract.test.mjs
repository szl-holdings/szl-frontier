import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

const PREVIEW_ORIGIN = "https://preview.grok-sandbox.com";

/**
 * A network-free copy of the app's broker-facing Better Auth configuration.
 *
 * This protects the 1.7 migration boundary: generic OAuth providers now use
 * the core social sign-in endpoint and the core `/api/auth/callback/:id`
 * callback. The broker endpoints are inert example URLs so this test never
 * contacts an identity provider.
 */
const auth = betterAuth({
  baseURL: PREVIEW_ORIGIN,
  secret: "test-only-secret-at-least-32-bytes",
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "grok-google",
          clientId: "preview-test-client",
          clientSecret: "test-only-client-secret",
          authorizationUrl: "https://auth.example.test/api/auth/oauth2/authorize",
          tokenUrl: "https://auth.example.test/api/auth/oauth2/token",
          userInfoUrl: "https://auth.example.test/api/auth/oauth2/userinfo",
          scopes: ["openid", "profile", "email"],
          authorizationUrlParams: { idp: "google", prompt: "login" },
        },
      ],
    }),
  ],
});

test("Better Auth 1.7 social sign-in preserves the broker contract", async () => {
  const response = await auth.api.signInSocial({
    body: {
      provider: "grok-google",
      callbackURL: "/",
      errorCallbackURL: "/",
    },
    headers: new Headers({ origin: PREVIEW_ORIGIN }),
    asResponse: true,
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.redirect, true);
  assert.equal(typeof body.url, "string");

  const authorization = new URL(body.url);
  assert.equal(authorization.origin, "https://auth.example.test");
  assert.equal(authorization.pathname, "/api/auth/oauth2/authorize");
  assert.equal(authorization.searchParams.get("idp"), "google");
  assert.equal(authorization.searchParams.get("prompt"), "login");
  assert.equal(
    authorization.searchParams.get("redirect_uri"),
    `${PREVIEW_ORIGIN}/api/auth/callback/grok-google`,
  );
});
