# Workspace readout preparation — measurement order

Anchors the Anthropic J-lens wave record (`frontier/waves/2026-09-11-workspace-readout-preparation.json`)
to the estate's blocked interpretability lane, `szl-holdings/a11oy#2020`, and its prerequisite,
`szl-holdings/a11oy#1806` P1 (governed inference binding). This is a preparation specification:
no inference is called, nothing is deployed, production disposition stays **HOLD**, promotion effect is **none**.

## Why this exists now

The paper ("Verbalizable Representations Form a Global Workspace in Language Models", transformer-circuits.pub, 2026)
measures a per-layer "J-space" of verbalizable disposition and shows the workspace can surface strategic
deliberation — leverage, manipulation, panic, recognition of being evaluated — that never reaches the output.
That is the mechanistic version of this estate's core rule: **the output is not the truth of the computation**.
Every estate interpretability organ is currently labeled MODELED (simulator). This spec pins the exact order in
which that label may change, so no future executor upgrades MODELED -> MEASURED without the receipt chain below.

## Measurement order (fail-closed)

1. **Governed inference binding** (`a11oy#1806` P1). Exact model revision, tokenizer revision, benchmark suite,
   latency/cost envelope, fallback policy, PII boundary, fail-closed behavior. Until this exists, the rest of
   this spec is inert. Do not call an unbound plan inference.
2. **Residual-stream capture** (`a11oy#2020`). On the bound route, capture per-layer residual streams or the
   provider-disclosed equivalent. Capture config (layers sampled, hooks, dtype) is recorded on the receipt.
3. **Workspace readout** (`a11oy#2020`). Apply a J-lens-class readout (or closest implementable analog) to the
   captured stream. The workspace disposition travels as a **labeled field on the DSSE receipt** alongside the
   behavioral output — never replacing it.
4. **Property labeling** (`a11oy#2020`). Reportability and selectivity are measurable without full internal
   access once step 1 lands. Directed modulation, internal reasoning, and generalization remain **UNAVAILABLE**
   until the provider exposes them. No organ flips to MEASURED without a real-model, bound-route receipt.

## Estate organ mapping (labels verbatim)

| Workspace property | Estate organ | State today |
|---|---|---|
| Reportability | `szl_a11oy_interpretability.py` | MODELED |
| Directed modulation | `static/3d/surfaces/steering.js` | MODELED |
| Internal reasoning | `szl_circuit_graphs.py` | MODELED |
| Generalization | `szl_lgmi.py` | MODELED |
| Selectivity | — | NO_ORGAN |

## Python consumption (existing harness, no new runtime)

This wave records to the standard ledger and is consumable by the existing wave-plan bridge exactly like the
prior pinned waves; no new agent framework, scheduler, or publisher is introduced:

```sh
PYTHONPATH=python python -m szl_frontier.wave_plan \
  --wave frontier/waves/2026-09-11-workspace-readout-preparation.json
```

## Bounds

- No production route, default, provider, policy, provenance, licensing, receipt, rollback, branch protection,
  visibility, hardware, model qualification, or autonomous authority is changed.
- Upstream paper remains an external source and never an authority inside this estate.
- SIM and OBSERVED provenance labels are preserved; simulator content stays labeled MODELED.
- The output is not the truth of the computation; a workspace readout is a labeled observation, not a verdict.

Signed-off-by: Lutar, Stephen P. <stephenlutar2@gmail.com>
