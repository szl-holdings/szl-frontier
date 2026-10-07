# Offline watch-source coverage

`szl_frontier.watch_qualification` checks the consistency of retained watch
reports against a separately reviewed, content-bound expected-source file.
It does not contact GitHub or Hugging Face, run models, write files or receipts,
authenticate provenance, verify a runtime, or authorize a release.

From a source checkout, with `PYTHONPATH=python`:

```bash
python -m szl_frontier.watch_qualification \
  --checkout-root /path/to/szl-frontier \
  --config-path frontier/watch-expected.v1.json \
  --config-revision <independently-retained-40-hex-Git-revision> \
  --config-sha256 <independently-retained-64-hex-config-byte-hash> \
  --reports-root /path/to/stable-retained-evidence \
  --reports bundle.json \
  --run-revision <separately-retained-40-hex-run-source-revision>
```

The module can also be run directly as
`python python/szl_frontier/watch_qualification.py` with the same arguments.
It emits one JSON object to stdout. Exit 0 means only
`SOURCE_COVERAGE_ADVISORY`; exit 3 means `MISSING_BINDING`, `HISTORICAL`, or
`BLOCKED`. Invalid command-line usage exits 2. Every result keeps
`provenanceAuthenticated`, `runtimeVerified`, `productionAuthorization`, and
`productionPromotion` false, with `productionDisposition: HOLD`.

There is intentionally no `frontier/watch-expected.v1.json` in this change.
That path in the command is a proposed schema location, not an existing admitted
source configuration. The current live producers and jq combiner omit the
required source bindings and are **not qualified by this checker**. Counts alone
are insufficient. Do not derive expected identities from the observed report,
fill in missing component bindings after a run, or reuse the command's exit 0
as production admission.

The expected-source JSON schema is `szl.frontier.watch-expected.v1`. It has
`sourceRepository: szl-holdings/szl-frontier` and an exact `roles` object with
`js-manifest`, `python-admission`, and `edge-lane`. Each role contains a nonempty
array of `{id, aliases?}` entries. IDs and aliases must be unambiguous within
their role. The same asset may legitimately occur in different roles.

The retained `bundle.json` is an object with exactly those three role keys and
`combined`, each containing the original report object. All four reports need
the exact `sourceRepository`, `sourceRevision`, and `configSha256` binding tuple;
a top-level run declaration cannot replace component bindings. JS and edge use
`szl.frontier.watch-output.v1`; Python uses
`szl.frontier.python-watch-output.v1`; combined uses
`szl.frontier.combined-watch-output.v1`. Reports must declare literal `live: true`,
`productionPromotion: false`, no errors, and exact non-boolean integer counts.
Role rows must cover each expected identity exactly once. Combined rows must
match the complete component-row multiset, not just the aggregate count.

Expected config and reports are strict UTF-8 JSON, reject duplicate members and
nonfinite constants, and are bounded to 1 MiB and 64 levels of JSON nesting.
Paths must be relative to their respective roots; redirected components,
reparse points, nonregular files, and detected replacement/read-time changes
are rejected. These are defensive admission checks, not a claim of isolation
against an adversarial concurrent filesystem writer. Keep both roots stable.

Config revision/hash and run revision are caller-supplied retained declarations,
not signatures or provider authentication. A matching hash proves only the
retained bytes agree with that declaration. A complete bundle from a different
run revision is `HISTORICAL`, never current qualification. Authenticated source
capture, reviewed expected configuration, timestamp/freshness policy, independent
runtime witness, and release authority are separate future obligations.

Run the synthetic offline regression suite:

```bash
python -B python/tests/test_watch_qualification.py -v
```

The existing CI discovers this suite alongside the other Python controls. Its
fixtures establish software behavior only, not a live measurement or model
evaluation. No existing watch/publisher workflow, gate, or provider target is
changed. A future protected merge nevertheless triggers the repository's
existing canonical Space and dataset publisher because it runs on every main
push; that publication effect must be considered separately from draft-PR CI.
