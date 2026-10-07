# Frontier estate auditor

Collect GitHub and Hugging Face metadata into a verifiable local snapshot,
compare snapshots, and explore the results in an offline dashboard. This is
an optional source tool; the existing `szl-frontier` package and outside-seat
observer keep their own commands and evidence contracts.

Requires Python 3.11 or newer. The runtime uses the standard library; an
installed Hugging Face SDK is optional for resolving an existing login.

## Run from the repository root

```sh
python -B tools/frontier_auditor/szl_frontier_codex.py self-test
python -B tools/frontier_auditor/szl_frontier_codex.py all --output artifacts/frontier-audit-new --workers 4
python -B tools/frontier_auditor/szl_frontier_codex.py verify --output artifacts/frontier-audit-new
python -B tools/frontier_auditor/szl_frontier_codex.py serve --output artifacts/frontier-audit-new --port 8788
```

Open <http://127.0.0.1:8788>, or open the generated `dashboard.html` directly.
The viewer binds only to loopback, makes no background network requests, and
shows a saved snapshot. It does not refresh provider evidence automatically.
Stop the server with Ctrl+C.

Every collection needs a new, empty output directory. Keep interrupted output
for diagnosis and choose another directory for the next run. Generated evidence
belongs in the repository's ignored `artifacts/` directory; captured inventories,
credentials, receipts, and delivery archives are not part of this source tool.

## Scope and credentials

Defaults are `--github-org szl-holdings --hf-org SZLHOLDINGS`. Credentials come
from `GITHUB_TOKEN` / `GH_TOKEN`, then the existing GitHub CLI login. Hugging Face
uses supported token environment variables, then the official SDK resolver if
available. The collector redacts resolved token values from its outputs.

Public inventory requires an explicit `private: false` provider declaration.
Missing or malformed privacy values are excluded and make coverage incomplete.
`--include-private` explicitly includes accessible private assets: keep that
output private. Even public inventory can contain operational metadata; review
each output before publishing it.

Collection uses bounded timeouts, response sizes, retries, pagination and
request budgets. Failures retain successful observations and record coverage
gaps. GitHub trees and checks bind to captured commits. Provider metadata is
`DECLARED`; application readiness and publication authorization remain `UNKNOWN`.
`REPORTED` is reserved for admitted owner-signed evidence, which this collector
does not verify. `MEASURED` applies only to the local collection/verification
harness within its stated scope.

Optional `--probe-spaces` performs unauthenticated HEAD requests to validated
Space hosts and may wake sleeping Spaces. Reachability is not application
readiness. `--local-root PATH` records Git metadata from a local repository or
its immediate child repositories without executing repository code.
`--max-repos N` deliberately limits GitHub details and reports partial coverage.

## Integrity and comparison

Save each printed `bundle_sha256` outside the snapshot. Receipts and manifests
are unsigned; a bundle that contains its own hashes cannot independently prove
authenticity. Verify against a separately retained digest:

```sh
python -B tools/frontier_auditor/szl_frontier_codex.py verify --output artifacts/frontier-audit-new --expected-bundle-sha256 RETAINED_64_HEX_DIGEST
python -B tools/frontier_auditor/szl_frontier_codex.py diff --baseline artifacts/frontier-audit-old --output artifacts/frontier-audit-new --baseline-bundle-sha256 OLD_RETAINED_DIGEST --expected-bundle-sha256 NEW_RETAINED_DIGEST
```

Verification checks actual file bytes, sealed membership, required artifacts,
inventory projections, receipt sequence and predecessor links, and artifact
bindings. `verification.json` is an unsealed convenience record. GET, HEAD and
verification do not append receipts. Collection and planning record local
artifact writes; these receipts are not signed authorization.

Comparison reports newly observed and missing records, source/CI/provider
changes, and coverage changes. Absence does not establish deletion. Repeated
observation timestamps alone do not establish a changed source revision.

The `inventory` command collects without planning; `plan` verifies that bundle,
adds review tasks and null scorecards, and reseals it once. Plans never authorize
migration or tool execution. No command pushes, merges, publishes, changes
visibility, trains models or starts paid inference.

## Verification limits

Run `self-test` for offline synthetic fixtures, adversarial bundle tests,
mocked transport, safe dashboard rendering and an actual loopback HTTP check.
Node.js enables dashboard JavaScript behavior tests. Platform-dependent skips
are reported. These checks do not establish provider runtime or model quality.

Exit codes: `0` completed operation, `1` command/configuration error, `2` partial
inventory, `3` failed integrity verification, and `130` interrupted.

Effective branch protections, deployment identity, content-level secret review,
model evaluation, signature trust and publication authorization require separate
evidence. Successful inventory or byte verification does not qualify a release.

Provider references: [GitHub trees API](https://docs.github.com/en/rest/git/trees),
[GitHub pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api),
and [Hugging Face Hub API](https://huggingface.co/docs/hub/api).

License: the repository's [Apache-2.0 license](../../LICENSE).
