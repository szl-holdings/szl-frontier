# Residual-stream capture harness contract v1

Wave record: `frontier/waves/2026-09-11-residual-capture-harness-contract.json`.
Third wave of the governed-inference lane: **binding contract -> capture harness contract ->
workspace readout**. Tracks `szl-holdings/a11oy#2020` step 2, gated on `szl-holdings/a11oy#1806` P1
via the binding contract wave (`frontier/waves/2026-09-11-governed-inference-binding-contract.json`).

No residual stream has been captured. This wave changes no runtime; it defines the contract a future
capture harness must satisfy so that no readout claim can ever be anchored to an uncontracted capture.

## The join key

The binding receipt is the muscle of this contract: every capture receipt carries the DSSE receipt id
of the bound route it ran on. A capture without a valid binding receipt is **invalid by construction** —
not by reviewer discipline. The estate never captures on an unbound route.

## The contract

| # | Field | The evidence, not the intent |
|---|---|---|
| 0 | `bindingReceipt` (join key) | Valid binding receipt id per the binding contract wave. Precondition, not capture output. |
| 1 | `exactRevisions` | Model and tokenizer revisions echoed verbatim from the binding receipt. Mismatch fails the capture before it starts. |
| 2 | `captureConfig` | Layers sampled (all or explicit stride), hook points, dtype, sequence boundary policy — declared and hashed into the receipt. Undeclared captures cannot anchor a claim. |
| 3 | `storageClass` | Captured streams live in ephemeral storage only (tmpfs or equivalent) and never persist beyond the governed session boundary. |
| 4 | `captureReceipt` | Partial-DSSE receipt binding `bindingReceiptId + captureConfigHash + inferenceReceiptHash`. Readout steps consume only capture receipts. |
| 5 | `failureDisposition` | Capture failure, partial capture, or config drift produces abstention: no readout claim, no labeled receipt field, and no silent presentation of behavioral output alone as workspace evidence. |

## What unblocks when this binds

- `szl-holdings/a11oy#2020` step 2 (residual-stream-capture) is satisfied by a capture receipt against
  this contract, running on a route bound per the binding contract wave.
- Steps 3 (workspace readout) and 4 (property labeling) stay blocked until that receipt exists —
  and the regression guard in this wave keeps them blocked mechanically, not editorially.

## Python consumption (existing harness, no new runtime)

```sh
PYTHONPATH=python python -m szl_frontier.wave_plan \
  --wave frontier/waves/2026-09-11-residual-capture-harness-contract.json
```

## Bounds

- No inference is called; no capture occurs; no tensors persist anywhere.
- No production route, default, provider, policy, provenance, licensing, receipt, rollback,
  branch protection, visibility, hardware, model qualification, or autonomous authority is changed.
- Production disposition remains **HOLD**; automatic promotion is false.

Signed-off-by: Lutar, Stephen P. <stephenlutar2@gmail.com>
