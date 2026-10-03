# Evidence-bound research checks

`szl-frontier research` is a read-only boundary between an agent's proposed
experiment and a release decision. It checks local evidence bytes, reference
closure, source checkout identity, declared metric thresholds, and stop
conditions. It does not run a model, perform an experiment, validate the
scientific truth of an observation, grant data rights, or publish anything.

```bash
szl-frontier research \
  --root /path/to/experiment-evidence \
  --source-root /path/to/clean-szl-checkout \
  --proposal proposal.json

szl-frontier research \
  --root /path/to/experiment-evidence \
  --source-root /path/to/clean-szl-checkout \
  --proposal proposal.json \
  --result result.json
```

The evidence directory can be outside the source checkout. All file paths in
the JSON documents are relative to that evidence directory. The source
checkout must have an SZL GitHub origin, a clean working tree, and `HEAD` at
the proposal's exact 40-character commit. No network or provider credentials
are used. `python/tests/test_research.py` builds a complete local example and
tests both commands.

The proposal uses schema `szl.frontier.research-proposal.v1` with these exact
fields:

| Field | Contract |
| --- | --- |
| `proposalId`, `hypothesis` | Bounded identity and falsifiable statement. |
| `authority`, `productionPromotion`, `dataUse` | Exactly `evaluation-only`, `false`, `evaluation-only`. |
| `source` | `repository` under `szl-holdings` and exact Git `revision`. |
| `evidence` | 1-16 ID/path/SHA-256/`observedAt`/`expiresAt` records. |
| `claims` | 1-16 text claims, each citing retained evidence IDs. |
| `metrics` | 1-8 named `higher`, `lower`, or `zero` metrics with baseline, minimum improvement, and baseline evidence ID. |
| `stopConditions` | 1-12 unique machine-addressable hard-stop IDs. |
| `maxRuntimeSeconds`, `targetPaths` | Bounded run budget and explicit candidate integration files. |

Metric evidence files are UTF-8 JSON objects with a `metrics` object, such as
`{"metrics":{"task_success_rate":0.4}}`. The declared baseline and candidate
value must match the named number in the corresponding hashed file. Other
retained evidence files can contain arbitrary bytes but are never executed.

The optional result uses schema `szl.frontier.research-result.v1`. It repeats
the evaluation-only authority fields, binds the exact proposal file bytes with
`proposalSha256`, and supplies retained `observations`, one measured value and
observation ID per proposed metric, `triggeredStops`, and `elapsedSeconds`.
Evidence timestamps must be UTC, currently valid, and have at most a 30-day
validity window. Duplicate JSON keys, nonfinite numbers, extra fields, missing
or changed evidence, unknown citations, and path escapes are rejected.

Without a result, the command emits `PROPOSAL_CHECKED`; that is not an
experiment outcome. A complete result emits `PASS` only when every declared
metric meets its threshold and no stop condition or runtime limit is hit.
Otherwise it emits `HOLD` and exits 3. Invalid input exits 2. The result
includes an unsigned content-addressed receipt whose subject is
`frontier-research-evaluation-only` and whose payload keeps
`productionAuthorized: false`. Even a separately signed receipt with that
subject cannot satisfy Frontier's production-authorization subject.

The validator checks that claims cite retained bytes and that metric values
match retained summary files. It **does not** derive those summaries from raw
data or establish that a cited claim is true. Independent measurement review,
rights review, exact-head CI, and protected release gates remain necessary.
