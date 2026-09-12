# Governed inference binding contract v1

Wave record: `frontier/waves/2026-09-11-governed-inference-binding-contract.json`.
Tracks `szl-holdings/a11oy#1806` P1 ("Bind one governed inference route..."), unblocks
`szl-holdings/a11oy#2020` (workspace readout, whose step 1 is this binding), and frames
`szl-holdings/a11oy#1686` (engine bakeoff) so it measures bound routes, never unbound demos.

This wave changes nothing at runtime. It defines what **bound** means so the estate can never
again call an unbound plan inference.

## The contract

A route is bound only when a single DSSE receipt records evidence for all seven fields,
each against the exact named revisions:

| # | Field | The evidence, not the intent |
|---|---|---|
| 1 | `modelRevision` | Immutable revision (commit SHA or content-addressed artifact hash) from a license-admitted source. `main`, `latest`, or a floating tag is never a binding. |
| 2 | `tokenizerRevision` | Exact tokenizer revision, bound independently. A tokenizer that silently floats invalidates the route even if the model is pinned. |
| 3 | `benchmarkSuite` | Named benchmark set, pinned versions, committed harness. Results travel on receipts, not in prose. |
| 4 | `latencyCostEnvelope` | Declared p50/p95/p99 latency bounds and cost-per-token envelope measured on the exact bound revisions. Breach fails closed; it does not silently degrade. |
| 5 | `fallbackPolicy` | Named disposition for provider failure: abstain, downgrade to a separately bound route, or refuse. "Try anyway" is not a policy. |
| 6 | `piiBoundary` | Declared boundary: what may reach the provider, what is redacted, what is refused at the gate. |
| 7 | `failClosedBehavior` | Every failure mode — provider down, revision mismatch, envelope breach, benchmark regression, PII violation — terminates in refusal, never in a weaker silent route. |

## Binding and unbinding

- **Binding is a receipt, not a declaration.** The DSSE receipt binding all seven fields to exact
  revisions *is* the binding. No separate ceremony.
- **Drift unbinds.** If a revision floats, a benchmark regresses, or the envelope breaches
  persistently, the route unbinds automatically and the estate returns to plan state. Recovery
  is a new binding receipt, not a waiver.
- **The bakeoff inheritance.** Any engine candidate (vLLM, SGLang, transformers `serve`,
  llama.cpp/MLX sovereign lanes) is evaluated only behind this contract: the harness produces
  the seven-field receipt per candidate, and comparison happens between bound routes.
  An unbound demo is excluded from comparison by construction, not by reviewer discipline.

## Downstream: the workspace readout

`szl-holdings/a11oy#2020`'s measurement order step 1 (governed-inference-binding) is satisfied
by a receipt against this contract. Only then do steps 2-4 (residual capture, workspace readout,
property labeling) become executable. The binding receipt is the join key between the two waves.

## Python consumption (existing harness, no new runtime)

```sh
PYTHONPATH=python python -m szl_frontier.wave_plan \
  --wave frontier/waves/2026-09-11-governed-inference-binding-contract.json
```

## Bounds

- No inference is called; no model, tokenizer, benchmark, envelope, fallback, PII, or fail-closed
  evidence exists yet; no candidate is named.
- No production route, default, provider, policy, provenance, licensing, receipt, rollback,
  branch protection, visibility, hardware, model qualification, or autonomous authority is changed.
- An unbound plan remains a plan; the estate does not call it inference.
- Production disposition remains **HOLD**; automatic promotion is false.

Signed-off-by: Lutar, Stephen P. <stephenlutar2@gmail.com>
