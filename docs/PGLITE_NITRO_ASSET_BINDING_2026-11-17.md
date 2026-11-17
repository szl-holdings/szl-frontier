# PGlite / Nitro private-server asset repair — 2026-11-17

## Observed root cause

In a clean Windows developer worktree of `szl-frontier`, `npm run build:dev` returned exit 0 but the Vite/Nitro preview crashed during PGlite initialization:
`ENOENT ... .vercel/output/functions/__server.func/_libs/pglite.data`.
The compiled `electric-sql__pglite.mjs` referenced `pglite.data`, `pglite.wasm` and `initdb.wasm` relative to its private server module, but the binary resources were absent from `_libs`. This was observed when the new read-only counterfactual API caused the server auth/PGlite module to enter the compiled graph; it is not evidence that every currently deployed route crashes.

Installed PGlite 0.5.16 package artifacts: `pglite.data` 6,242,272 bytes; `pglite.wasm` 9,086,480 bytes; `initdb.wasm` 298,788 bytes. The files are vendor package exports, not source-authored blobs. Public library reference: https://pglite.dev/docs/bundler-support . Nitro asset handling: https://nitro.build/guide/assets .

## Repair and build contract

`scripts/pglite-bundle.mjs` locates the three package assets, conditionally stages each *byte for byte* next to the built private server module, and checks SHA-256 equality. A manifest records the compiled module SHA, artifact hashes and lengths, and explicitly `publicAsset:false`, `productionAuthorized:false`, `runtimeVerified:false`. A verify-only command checks the installed bytes and bundled output without modifying them. Missing, corrupted, too-large, unexpected-layout, or changed-module output fails.

Some ordinary builds tree-shake the *optional* PGlite backend completely. Those builds now return an explicit `OPTIONAL_BACKEND_NOT_BUNDLED` state with no artifacts, rather than treating its absence as an error or copying ~15MB of unneeded resources. The generated private function directory must exist; a renamed PGlite module is an error, not an allowed omission. No binaries enter `public/` or the browser bundle.

Scripts:
- `npm run build:dev` stages optional private artifacts after Vite build.
- `npm run build` stages them before the existing migration action.
- `npm run verify:pglite-assets` independently checks output.
- `node --test scripts/pglite-bundle.test.mjs` exercises success and fail-closed mutation cases; the normal script test glob selects it.

## Source-bound observed evidence

The synthetic staging suite passed **7/7**, with native process exit 0. On the *unmodified main* baseline, the same worktree's generated Nitro function did not contain PGlite code; build and verify both returned `OPTIONAL_BACKEND_NOT_BUNDLED`, exit 0. The **combined read-only API candidate** at PR #340 did bundle PGlite; the exact source package artifacts were staged into its generated private function via the same `bindPgliteBinaries` function in scratch, then verified again. Artifacts hashes:

| File | Package/bundle SHA256 |
| --- | --- |
| pglite.data | d73cf4ba1b0bf92f80f088ce7d23b17f9bc175327d7584ec2a713b27e9758c31 |
| pglite.wasm | 5256d9ac379f631355f41ab30291e6a6d9f854242b5ee2a2d0940e28041d3fca |
| initdb.wasm | 63d8b9d54110f827711545a338a643621e65b5658f09e1acfcf36073be365ce2 |

After staging those resources in the combined candidate's generated `.vercel/output` (no source/committed binary changes), the Vite preview remained up, `GET /api/health` returned **HTTP 200**, and `POST /api/action-preview` returned **HTTP 503** with `reason=SERVER_AUTH_OR_EVIDENCE_UNAVAILABLE` and `executionAuthorized=false` because this workstation lacks configured federated client credentials. This is a liveness/negative-auth check, **not** a successful authenticated positive route or deployed production qualification. The historical broken scratch preview was not silently relabeled green.

## Limits and next gates

This forward patch only repairs private build asset propagation when optional PGlite is compiled into the Nitro server. It does not grant authentication, deploy any service, enable another tenant's database, verify independent witness operators, fix other possible bundle layouts or authorize production. Successful local tests cannot substitute for hosted Linux/macOS build checks, preview HTTP tests with a valid *test* user session, deployment source readback, and independent review.

Before protected admission, review the `.vercel/output/functions/__server.func/_libs` layout for current Nitro preset compatibility, the installed PGlite export semantics, and output artifact size. Roll back by protected forward revert; no runtime data migration or credential rotation is part of this change.
