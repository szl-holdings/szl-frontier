# Counterfactual action preview: require a verified session

**Date:** 2026-11-17 UTC. **Authority:** source/test evidence only until protected admission and deployed readback. **Production authorization:** FALSE.

## Live defect reproduction on the former main

At 2026-11-17T04:38:50 UTC, with the deployed source readback exactly matching protected `main` revision `217aeb465aabba258ea45d1616d06e34b4611af3`, an **anonymous, credential-free** POST to `https://szlholdings-szl-frontier.hf.space/api/action-preview` returned **HTTP 200**, `kind:READ_ONLY_COUNTERFACTUAL`, `executionAuthorized:false`, `effectCommitted:false`, `productionReady:false`, `x-szl-authority:NONE`. No effect occurred. Nonetheless, this contradicted the route's authenticated-session requirement: `requireUserId()` intentionally returns shared `DEV_USER_ID` when sign-in is disabled with no configured database, which is acceptable for isolated development storage but **not** a verified principal for a public API.

This is not evidence of a production action or data leak; it is proof of anonymous analysis access where the code claimed a verified caller. The user/tenant binding of that report did not represent a real signed-in person.

## Source repair

The endpoint now obtains its principal from `getSessionUser()`, whose implementation resolves a Better Auth server-verified session from the request. `requireVerifiedPreviewIdentity` accepts only that returned, non-empty, well-formed session ID. If there is no verified session, the existing general `requireUserId()` helper is called **only to preserve** its established 401/503 diagnostics and its returned synthetic ID is always discarded; the preview rejects even if the fallback would have returned `dev-user` or another non-verified string. A missing session returns 401; unavailable federation may return 503. Hard-deny and non-execution flags remain unchanged; no JWT claims, unsigned headers, browser session state or caller-provided user IDs are accepted as authorization.

The route still uses same-site request isolation and a bounded strict-UTF8 JSON schema, and all responses remain no-store / non-authorizing. There is no token provisioning or credential bypass.

## Validation and limitations

The new regression tests cover verified-session positive, legacy `dev-user` refusal, arbitrary fallback ID refusal, unavailable federation 503 propagation, missing signed-in session 401 propagation, and malformed verified session IDs. The existing software policy/counterfactual tests and browser qualification remain separate gates.

Required after source admission: exact-head CI; anonymous deployed HTTP POST must return 401 or 503 with `executionAuthorized:false`; a **genuine** authenticated session in a controlled environment must yield a read-only 200 response without a committed effect; source readback must match protected `main`. An authenticated positive has **not** been established by the regression tests alone.

**Remaining preview UX constraint:** a partitioned iframe that authenticates via bearer instead of cookies needs an explicitly governed first-party bearer-forwarding path for this route; current plain fetch sends same-origin credentials only, and a missing cookie must deny rather than silently impersonate the shared development user. This capability is a separate reviewed integration, not an excuse to weaken server verification.

This patch does not establish witness-backed recall, durable multi-writer effects, independent signers, release admission, product monetization, trained model quality, or full production readiness.
