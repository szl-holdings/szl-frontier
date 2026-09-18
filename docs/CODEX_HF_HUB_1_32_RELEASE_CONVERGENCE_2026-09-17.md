# Codex handoff — Hugging Face Hub 1.32.0 stable convergence

Canonical release lineage: `szl-holdings/szl-frontier#74`. Sandbox security successor: `szl-holdings/szl-frontier#145`. Deterministic security execution owner: `szl-holdings/szl-forge#322`.

This handoff records a stable source target. It authorizes no live Sandbox/Job, provider write, dependency promotion or production publication.

## Exact stable source

- version: `huggingface_hub 1.32.0`
- annotated tag object: `917e4c271db593cd0f5e019d7da35620acd69573`
- peeled release commit: `8814aabc81298df547bece9e71e4e88d3e513928`
- tag and release commit verification observed by GitHub: **unsigned**
- previously governed Sandbox security head `1173050bc71b78c95a7a441796f07d49e8bc7b87` is an ancestor of the release source; this makes the stable release a convergence target, not an inherited PASS.

The release notes materially add shared cross-repo Xet blob storage through symlinks, the Sandbox hardening cluster, safer torch checkpoint loading/path validation, first-class kernel cache handling, Jobs UV launch configuration and deployment/cache changes. Evaluate only the surfaces the SZL estate actually consumes.

## Immediate post-release exclusion

`huggingface/huggingface_hub@618250b65875d388dc269752b111d5e4bf4ffb61` / upstream #4923 is a verified post-release commit, not part of 1.32.0. It stops publishing symlink support for a cache directory until `os.symlink` actually succeeds.

Do not silently backport this source into a `1.32.0` receipt or pretend the stable release contains it. Instead:

1. run stable 1.32.0 as the known-bad candidate for the affected first-use/concurrency predicate where the failure is reproducible;
2. run the exact post-release source as the successor control;
3. on a symlink-denied filesystem, require the capability cache to remain false/unknown until the probe finishes and shared-blob behavior to fall back without byte corruption;
4. bind any later released successor separately.

## Stable evaluation sequence

1. Build/install from exact release source and record wheel/source/archive digest, Python version, OS/filesystem identity and all relevant environment toggles. Preserve the unsigned upstream tag/commit observation.
2. Re-run the existing Forge #322 fake-server Sandbox security contract on the stable artifact. Do not inherit the moving-main result solely from ancestry.
3. Exercise shared-blob storage with two repositories referring to identical Xet content: first download, second reuse, deletion of first repo, cache remove/prune, stale refs, interrupted update, concurrent readers and symlink/read-only restrictions. Compare exact bytes/digests and ensure repo-local fallback cannot alias unrelated content.
4. Exercise the release's checkpoint-deserialization defaults using synthetic safe and intentionally unsafe fixtures. Validate embedded `..` path rejection and any repo-id validation the estate consumes. Never use production credentials or untrusted real checkpoints as a shortcut.
5. Exercise first-class kernel repository cache/download/verify behavior only against explicitly admitted public test assets and exact revisions. Remote code trust remains a separate gate.
6. Exercise Jobs UV configuration parsing locally with synthetic secret names/values. Do not start a billable remote Job or Sandbox under this contract.
7. Inventory active SZL pins. Do not mass-bump purpose-pinned workflows. For each consuming repository, create a separate exact-source change only after its own compatibility/rollback gates exist.
8. Keep exact v1.31 source/runtime as rollback until the consumed 1.32 surfaces have measured PASS receipts. Unexercised release features remain `UNQUALIFIED`.

## Promotion and authority chain

A green Frontier structural PR is not a Hub dependency promotion. Normal owning-repository controls must first admit any dependency change. Then verify the actual built/runtime source and package identity. Only after exact downstream runtime projection may the product state change; `a11oy.net` may publish only measured receipts and known bounds.

Preserve GitHub -> Hugging Face -> `a-11-oy.com` -> `a11oy.net`, branch protection, licensing/provenance, fail-closed errors, rollback/fallback and receipt integrity. No weight rehosting or unsupported security/capability claim.
