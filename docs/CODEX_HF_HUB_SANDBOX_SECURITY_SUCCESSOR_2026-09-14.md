# Codex handoff — Hugging Face Hub post-1.31 Sandbox security successor

Canonical Frontier issue: `szl-holdings/szl-frontier#145`  
Implementation/evaluation owner: `szl-holdings/szl-forge#322`  
Stable predecessor owner: `szl-holdings/szl-frontier#74`  
Stable release: `huggingface/huggingface_hub@495b17c8529614759ae0f1ccf1ebe9a61c148b7c` (`1.31.0`)  
Unreleased security cluster: `1fb5b3b3216c9d164e78a7e0312b3c2b1ffbdbc0..1173050bc71b78c95a7a441796f07d49e8bc7b87`  
Disposition: **WATCH / EVALUATION / HOLD**

## Why this is a material successor

The cluster changes the trust, cost, lifecycle, and secret-handling boundary of Hugging Face Sandbox clients rather than adding a cosmetic API. The exact head is seven commits ahead of the cluster start. The sequence narrows sandbox authority, rejects hostile pool adoption/cache transports before credential transmission, bounds output/transfer allocations, repairs process termination and pool teardown semantics, verifies the root-executed sandbox server by digest/protocol, and moves governed secret usage away from argv.

This is not a stable 1.31 qualification. The stable release commit and this mainline successor compare as divergent, so do not inherit any 1.31 pass into the successor and do not follow moving main into production.

## Exact constituent contracts

1. `1fb5b3b3216c9d164e78a7e0312b3c2b1ffbdbc0` / upstream #4832 — per-sandbox capability tokens for scoped calls.
2. `ef2662fac2bca2e4c0d2aaadbcc2b99a05b3922a` / #4834 — backend-asserted host admission before credentials.
3. `40efc5e89b4f3881059f72cefcc0550f33a86cc1` / #4838 — endpoint/principal/namespace-bound pool cache, transport URL admission, redirect refusal, filesystem hardening.
4. `0613ead586fb5897052db1edf26da49caa2a83b8` / #4839 — bounded command output/read allocations and streaming transfer paths.
5. `c7e60d81a4959841ea9008191841d632510056b4` / #4840 — per-host ownership, in-flight-create drain, explicit teardown failure, best-effort distributed host cap wording.
6. `ec619930857c9eefbc7b21d5646b55e209cf13db` / #4836 — kill background processes by server opaque id, not observational OS pid.
7. `0219ad56d42318411bb04f6f95688ead7f78568f` / #4837 — digest-addressed/verified `sbx-server` plus protocol compatibility gate.
8. `1173050bc71b78c95a7a441796f07d49e8bc7b87` / #4835 — avoid secret values in argv where supported; correct env/secrets CLI guidance.

## Forge execution contract

Implement the deterministic evaluation in `szl-forge` under issue #322. Use only synthetic credentials and a local/fake server unless a later issue explicitly authorizes a live paid provider probe.

The lane must be able to demonstrate failure against deliberately broken fixtures/implementations, not merely pass against the successor. Minimum adversarial witnesses:

- **Capability separation:** sandbox A token must fail against sandbox B and host-management routes. Host token and sandbox token roles must be distinct.
- **Host-adoption credential barrier:** wrong initiator, namespace, image, flavor, bootstrap command, plaintext URL, wrong job URL, or extra exposed endpoint must produce zero credential-bearing requests to the candidate host.
- **Cache authority barrier:** wrong endpoint, credential fingerprint, or namespace is a cache miss. Moved/malformed cache content and redirects cannot redirect credentials. Temporary/cache files preserve the upstream fail-closed filesystem expectations.
- **Resource ceilings:** bounded `run()` capture and `read()` fail above explicit local ceilings with deterministic errors; callback/no-capture and disk streaming paths do not accumulate the full payload. Upload streaming must not read the whole fixture into memory.
- **Process identity:** kill uses opaque server id; a legacy/missing opaque id refuses rather than sending a pid the server does not address.
- **Lifecycle ownership:** `close()` cancels locally booted hosts only, does not cancel discovered hosts, drains already-registered creates within the upstream timeout contract, and retains failed-cancel state for operator recovery.
- **Bootstrap integrity:** exact expected digest executes only after verification; corrupted bytes never execute; missing hash tooling fails closed on the qualified path; protocol mismatch is explicit. Any upstream unverified-server escape hatch appears only in a negative/non-qualified case.
- **Secret hygiene:** synthetic values passed by environment-name or stdin secret file never appear in argv snapshots or persisted receipts. Do not use a real HF token in fixtures.

Record exact Python, Torch if used, `huggingface_hub` git identity, fake-server protocol identity, fixture hashes, ceilings, negative cases, test command, exit code, and immutable evidence digest.

## Publication and promotion order

`GitHub source -> governed Forge evaluation -> released exact Hub successor -> consumer compatibility -> Hugging Face projection -> a-11-oy.com product/runtime state -> a11oy.net measured proof`

Do not skip from source admission to provider or product claims. A released package must be separately exact-pinned; the unreleased mainline head is not a production dependency target.

## Non-negotiable bounds

- no billable Hugging Face Sandbox/Job execution from this handoff;
- no real secret values in source, argv fixtures, logs, or receipts;
- no production dependency/default/route change;
- no weight or artifact mirror for inventory;
- no weakening of tests, branch protection, provenance, licensing, rollback, or receipts;
- no inference that an HTTP 200, source merge, or upstream test count proves SZL runtime qualification;
- preserve the stable 1.31 evaluation baseline as rollback until a separately released successor passes normal controls.
