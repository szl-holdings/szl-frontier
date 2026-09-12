# Workspace readout receipt contract v1

Wave record: `frontier/waves/2026-09-11-workspace-readout-receipt-contract.json`.
Keystone wave of the governed-inference lane: **binding contract -> capture harness contract ->
readout receipt contract**. Satisfies the claim side of `szl-holdings/a11oy#2020` steps 3-4 as a
contract; performs no readout.

No readout has run. This wave changes no runtime. It defines what a readout receipt must carry so
that no workspace disposition field can appear on a DSSE receipt without full receipt ancestry.

## The chain, complete

```
binding receipt  (a11oy#1806 P1, contract merged in wave 2)
      |
      v  join key
capture receipt  (a11oy#2020 step 2, contract merged in wave 3)
      |
      v  join key
readout receipt  (a11oy#2020 steps 3-4, contract defined in this wave)
      |
      v  labeled field
disposition on the DSSE receipt, beside the behavioral output
```

A readout without valid capture ancestry violates this contract. The offline guard checks the
wave's declared ancestry requirements. A future receipt consumer must validate the actual
binding -> capture -> readout chain before accepting a workspace disposition.

## The contract

| # | Field | The evidence, not the intent |
|---|---|---|
| 0 | `captureReceipt` (join key) | Valid capture receipt id per the capture harness wave. Precondition, not readout output. |
| 1 | `readoutMethod` | Named algorithm (J-lens-class or documented closest analog), pinned implementation version, pinned parameters. Floating methods cannot anchor a disposition. |
| 2 | `coverageMap` | Layers/hook points actually consumed, checked against the capture config hash. Partial coverage is declared, never silently widened. |
| 3 | `dispositionField` | Labeled field on the DSSE receipt: `{ property, state, method, captureReceiptId }`. Never replaces the behavioral output; never outruns the coverage map. |
| 4 | `unavailableSemantics` | Unexposed properties (directed modulation, internal reasoning, generalization) read UNAVAILABLE on every receipt. An absent field is a contract violation, not an omission. |
| 5 | `measuredUpgradeRule` | An organ flips MODELED -> MEASURED only with a readout receipt against this contract on a real bound route for that property. The flip is receipt-evidenced and reversible. |
| 6 | `failureDisposition` | Readout failure, ancestry break, or method drift: the field reads UNAVAILABLE with the failure code. Behavioral output alone is never workspace evidence. |

## Why this wave is the keystone

The first three waves prepared *inputs* to honesty. This one prepares the *claim itself*. A future
consuming surface — console, proof page, investor readout — must validate receipt ancestry, method
pins, coverage, and property labels before presenting a measured workspace disposition. Unexposed
properties or failed validation require UNAVAILABLE. This wave adds no consumer enforcement;
its static guard does not validate runtime receipts or estate surfaces.

## Execution gate for a11oy#2020 steps 3-4

[Step 3](https://github.com/szl-holdings/a11oy/issues/2020) requires a workspace-class readout on
the captured stream and a labeled disposition on the DSSE receipt beside the behavioral output.
Step 4 allows measuring reportability and selectivity without full internal access; directed
modulation, internal reasoning, and generalization remain UNAVAILABLE until exposed by the provider.

These execution steps remain blocked until a real governed-inference binding receipt satisfies
[a11oy#1806 P1](https://github.com/szl-holdings/a11oy/issues/1806) and a valid capture receipt
records the capture config hash and coverage on that bound route. The readout must consume that
capture receipt and emit its own receipt before any property can become MEASURED. Merging this
preparation contract does not supply those receipts or satisfy the execution gate.

## Validation

Contract waves are validated by their offline regression guard, not compiled by `wave_plan` —
`wave_plan` serves pinned upstream waves (it requires `--pins` and the integration-wave fields
`wave`, `alignment`, and `releases`, which contract waves deliberately lack). Validate this wave:

```sh
node --test scripts/frontier-workspace-readout-receipt.test.mjs
```

## Bounds

- No inference is called; no readout runs; no disposition field is emitted.
- No production route, default, provider, policy, provenance, licensing, receipt, rollback,
  branch protection, visibility, hardware, model qualification, or autonomous authority is changed.
- The output is not the truth of the computation; a disposition field is a labeled observation,
  not a verdict.
- Production disposition remains **HOLD**; automatic promotion is false.

Signed-off-by: Lutar, Stephen P. <stephenlutar2@gmail.com>
