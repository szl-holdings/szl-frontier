# Codex handoff — Sep 17 late correctness successors

This handoff advances `szl-holdings/szl-frontier#177`. It is an evaluation contract, not production authorization. Start from exact admitted GitHub source, preserve normal repository controls, and stop at HOLD when required evidence is unavailable.

## Immutable candidate pins

| Candidate | Exact upstream source | Upstream PR | Primary owner path |
|---|---|---:|---|
| Transformers assisted sliding-window cache | `huggingface/transformers@12b6da1f12517dace0169e86116963137d2c5428` | #48280 | Forge deterministic generation/cache fixtures; active serving owner only after unit closure |
| vLLM xgrammar control-character choices | `vllm-project/vllm@75c71390d5b399f5397a9166920fc45902f99f14` | #48115 | Forge grammar oracle + active serving owner for actual request-path verification |
| PEFT fallback trainability after active deletion | `huggingface/peft@451a247e9695c1d950093e24e3cab71190db0f64` | #3743 | Forge training/post-training correctness |

Do not replace any pin with moving `main`. Record the exact wheel/container/package/model/adapter digests actually executed. Upstream tests are source evidence, not SZL receipts.

## Execution order

1. **Audit exposure before changing dependencies.** Search the active estate for each affected path: assisted/speculative generation with sliding-window caches; vLLM structured `choice` output using xgrammar; PEFT adapter deletion/fallback during a trainable lifecycle. Record `NOT_EXPOSED` if the path is absent. Dependency presence alone is not exposure.
2. **Build deterministic known-bad controls.** Each harness must fail on the immediate pre-fix semantics and pass on the exact candidate source. A candidate that only passes a happy-path test is not qualified.
3. **Close package-level correctness before integration.** Bind all inputs and tolerances. Emit immutable machine-readable receipts containing source/package identity, fixture digest, result digest, environment identity, negative-control result and timestamp.
4. **Integrate only in the active owner.** Do not add a second serving stack, training service, Space, publisher or proof writer. If ownership has moved, update the Frontier issue with evidence before touching another repository.
5. **Run existing repository controls unchanged.** Do not remove path filters, required checks, CodeQL/security scanners, provenance checks, review requirements or branch protection to obtain a green result.
6. **Publish only after source admission.** If every owning-repository gate actually passes, follow its established protected merge and publisher path. Then verify exact Hugging Face runtime/artifact identity, then `a-11-oy.com`, then publish only measured proof to `a11oy.net`. Any missing leg remains HOLD.

## A — assisted/speculative sliding-window cache

Required deterministic fixtures:

- construct consecutive past-recording updates that exceed the advertised sliding-window width before crop; assert returned KV width equals the width implied by `get_mask_sizes` while the internal rollback buffer remains sufficient for rejection/crop;
- run the immediate predecessor as a known-bad control and require either the documented eager size mismatch or an explicit over-wide KV observation;
- fixed-seed target+assistant generation after crossing the sliding-window boundary under eager and SDPA, comparing assisted output/logits against the declared greedy/baseline oracle;
- multi-token draft bursts, accepted/rejected drafts, repeated crop, cancellation, restart/cache reset, concurrent requests, and non-recording updates;
- preserve exact target model, assistant model, tokenizer, generation configuration and attention backend identity in the receipt.

Do not infer correctness for FlashAttention/custom attention backends or model families that are not actually exercised.

## B — xgrammar structured choices

Use an independent literal-language oracle. At minimum enumerate U+0000–U+001F and U+007F, plus raw LF/CR/tab, quotes, backslashes, ASCII, non-ASCII, emoji and multiline choices. For every case:

- the exact intended literal must be accepted;
- shortened values, escaped-text lookalikes and extra-suffix variants must be rejected;
- the pre-fix source must fail at least one sentinel;
- the exact served structured-output request path must preserve the same language as direct grammar construction;
- malformed/oversized choices must fail explicitly; a grammar error must never downgrade to unconstrained sampling;
- cancellation/concurrency/restart must not cross-contaminate grammar state.

Grammar validity does not grant tool or action authority. Preserve existing human/policy approval gates independently.

## C — PEFT fallback trainability

Exercise exact adapter configurations for both ordinary `modules_to_save` and ShadowPEFT:

- create default/fallback plus a second active adapter; delete the active adapter and assert the fallback becomes active;
- assert exact `requires_grad` sets and optimizer parameter membership before and after deletion;
- run a deterministic one-step update and prove intended fallback parameters receive gradients/change while frozen parameters do not;
- include a path where the deleted adapter did not manage the `modules_to_save` module but the fallback does;
- cover save/load/delete/switch/hotswap and failed deletion/rollback;
- rerun relevant PEFT v0.21 state-dict/modules-to-save evidence without inheriting its PASS.

Search historical SZL training receipts for this exact deletion/fallback lifecycle. If exposure is demonstrated under an affected PEFT source, mark those receipts `NEEDS_REVALIDATION` until replayed or otherwise independently proven. Do not infer corruption merely from package presence.

## Evidence and projection rules

Every candidate has `inheritsQualification=false` and `productionDisposition=HOLD`. Missing hardware/runtime/model inputs are `UNAVAILABLE`; unexecuted paths are `UNQUALIFIED`. No source-support claim becomes a model, agent, serving or training capability claim by itself.

The residual authority-chain incident remains `szl-holdings/szl-frontier#151`. Candidate evaluation must not close that issue. Preserve GitHub -> Hugging Face -> `a-11-oy.com` -> `a11oy.net` order, exact-source binding, license/provenance review, rollback/fallback, receipts and branch protections. Do not rehost weights merely for inventory.
