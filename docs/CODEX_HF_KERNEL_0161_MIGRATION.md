# Codex handoff — Hugging Face Kernel Hub 0.16.1 migration

## Disposition

**EVALUATION / HOLD.** This is a deadline-driven compatibility and provenance migration, not a production-kernel promotion.

Canonical authority remains:

`szl-holdings/szl-frontier` → merged GitHub implementation → `SZLHOLDINGS` Hub projection → `a-11-oy.com` product state → `a11oy.net` proof state.

## Primary upstream contract

Hugging Face's current Kernels migration guidance says:

- kernels are first-class Hub repositories of type `kernel`;
- the loader no longer supports legacy `model`-type kernel repositories;
- retained legacy model-type kernel repositories are scheduled for removal starting **2026-09-13**;
- Hub loads require either a major version or a revision.

The stable candidate is `huggingface/kernels` **v0.16.1**, exact source commit
`1dc5c9d05683e8a594bb6d7a1ab18318b89e2caa`. Do not qualify against upstream
`main`. The 2026-09-09 upstream commit
`65ad13efcf490d1a3b4f06172a01f9823a013b90` (move `kernels-data` Python binding
into `kernels`) is WATCH-only until deliberately admitted as part of a release.

## Merged implementation

Runtime/migration implementation belongs in `szl-holdings/szl-forge`, not this
catalog repository.

Protected implementation closure:

- `szl-holdings/szl-forge#203` — **MERGED**
- evaluated PR head `0707fa9e8767becccfac640432017b56d35e031c`
- protected merge revision `aaf61372654b1b53133ea25a05d286e689568665`
- dedicated workflow run `34355675248`, job `102479607786`: PASS
- all observed exact-head Forge workflows: PASS before protected merge

The merged implementation:

1. requires `kernels==0.16.1` in the bounded migration lane;
2. verifies `repo_type="kernel"`;
3. rejects legacy model-type repositories;
4. requires exact 40-character `main` and `v1` branch revisions;
5. verifies runtime loads use the exact `v1` revision;
6. checks the public `SZLHOLDINGS/szl-kernels` first-class projection without
   mutating it.

This closes the **source-code migration guard** under normal controls. It does not
prove kernel performance, production model quality, public product readiness, or
authorization to change default routes.

## Codex completion contract

Work only in the repository that owns each responsibility.

### `szl-holdings/szl-frontier`

Keep this wave as the canonical intake/provenance record and bind the protected
Forge merge above. Do not duplicate the already-canonical TRL GRPO or VLM Run
admissions.

### `szl-holdings/szl-forge`

Treat `aaf61372654b1b53133ea25a05d286e689568665` as the current implementation
source. Preserve all migration tests and guards in successors. Add no fallback
that silently treats a `model` repository as a kernel. Any runtime load from an
untrusted publisher must remain an explicit `trust_remote_code`/allowlist
decision; metadata verification must not imply that trust.

### `szl-holdings/szl-kernels`

Confirm every production-relevant projection that must survive the cutoff is a
first-class `kernel` repository. Exact `main` and `v1` revisions must be recorded.
If a required build/backend is unavailable, emit `UNAVAILABLE`; do not simulate a
pass.

### Hugging Face projection

Do not manually patch Hub resources from a verifier. Publication must use the
existing canonical publisher path with exact-source binding. Do not rehost
upstream weights for inventory.

### Product and proof

Do not change `a-11-oy.com` routing or capability claims from this migration
alone. `a11oy.net` may record the migration only after the relevant immutable
runtime/evaluation evidence exists.

## Promotion gates

Promotion is prohibited until normal controls independently prove:

- first-class repository identity and exact Hub branch revisions;
- runtime compatibility on required backends;
- deterministic functional and negative-path tests;
- provenance/licensing and explicit remote-code trust posture;
- rollback/fallback to the previous passing immutable closure;
- matched performance evidence when performance is claimed;
- no unresolved production-blocking authority-chain drift.

Independent estate blockers `.github#728` and `lyte-services#18` remain outside
this migration and continue to keep the broader estate in HOLD.
