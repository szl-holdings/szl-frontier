# Codex handoff — Transformers PEFT load/restoration successor + PEFT v0.21.0 release convergence

Canonical issue: `szl-holdings/szl-frontier#142`  
Canonical wave: `frontier/waves/2026-09-14-transformers-peft-020-load-floor.json`  
Transformers load-floor source: `huggingface/transformers@75c3583e042c0765874784306fb9ace2137925d1`  
Transformers `modules_to_save` successor: `huggingface/transformers@dbbd551285e9d591a5c9692154341531531dac6c`  
PEFT release source: `huggingface/peft@9dc6fa2d2093853dec3889b790d4f251efe7fcac` (`v0.21.0`)  
PEFT annotated tag object: `ec824fda1917cbe768fe34f7aa8d953db35dcf32` (unsigned; peels to the release source above)  
Previously watched PEFT source now contained by v0.21.0: `e99fdd275075068d093f8996a59bc0eb865f71a2`  
Disposition: **WATCH / EVALUATION / HOLD**

## Why this materially advances the existing wave

The predecessor wave admitted the post-5.17 Transformers PEFT 0.20 floor because Transformers reported that PEFT 0.19.1 could not correctly load adapter weights. The later Transformers successor fixes a concrete restoration defect on that path: `AutoModel.from_pretrained` could ignore the key mapping returned by `AuxiliaryTrainingWrapper.adapter_state_dict_load_map`, leaving `modules_to_save` weights unrestored.

On 2026-09-15, upstream PEFT created the exact `v0.21.0` annotated tag. Its tag object `ec824fda1917cbe768fe34f7aa8d953db35dcf32` peels to release commit `9dc6fa2d2093853dec3889b790d4f251efe7fcac`. The tag is unsigned, so this handoff records that fact rather than converting tag existence into a stronger provenance claim. Compared with the v0.20.0 source revision `a5526d27a9d47d1e8264d5e1b1f96c0fdc79464e`, the v0.21.0 source is 105 commits ahead and materially changes save/load, state-dict, tuner, mixed-adapter and hotswap surfaces.

The previously separate PEFT watch at `e99fdd275075068d093f8996a59bc0eb865f71a2` is an ancestor of the v0.21.0 release source. That means the `autocast_adapter_dtype=False` forwarding fix has converged into the tagged source boundary; it does **not** mean the released stack is qualified for SZL.

This handoff does not assert that a wheel or sdist has been published, installed, or verified merely because the source tag exists. Executable qualification must bind the exact package artifact actually used by digest and provenance.

## Execution order

1. **szl-frontier** — preserve the three exact source boundaries: Transformers load floor `75c3583e...`, Transformers `modules_to_save` successor `dbbd5512...`, and PEFT v0.21.0 `9dc6fa2d...` / tag object `ec824fda...`. Do not follow moving upstream main.
2. **szl-forge** — extend the adapter compatibility lane with fixed, non-secret local fixtures covering adapter load/add/switch/delete, save/load, state-dict round trips, hotswap/load failures and mixed-adapter deletion behavior on the exact v0.21.0 artifact.
3. Add a `modules_to_save` fixture that saves a LoRA adapter with a wrapped module, mutates that module to a deterministic sentinel, and proves the sentinel is restored through `from_pretrained`; include a classification-head case and record the actual key mapping exercised.
4. Under v0.21.0, explicitly exercise the formerly unreleased `autocast_adapter_dtype=False` path from `e99fdd275...`. Release inclusion is source evidence only; the test must establish behavior on the exact evaluated artifact.
5. Re-run the distributed LoRA export/load integrity coverage governed by Frontier #110 so gathered-vs-ungathered tensor checks and exact base/adapter binding remain intact across the successor.
6. **szl-gpu-bridge** — qualify the exact successor pair on the governed accelerator/laptop lane where applicable. Do not mutate the purpose-pinned `peft==0.19.1` environments simply to make dependency resolution succeed.
7. **a11oy** — only after Forge and GPU Bridge evidence is exact-source, deterministic and green, prepare a separate pin-convergence PR if the active training-box lane actually needs the successor stack.
8. **Hugging Face -> a-11-oy.com -> a11oy.net** — no artifact/runtime projection or product/proof claim changes until repository-native gates pass. Publish only exact measured receipts and known bounds.

## Minimum deterministic witness

The executable witness must record:

- exact Transformers revision used for each compatibility case;
- exact PEFT source revision `9dc6fa2d2093853dec3889b790d4f251efe7fcac` and tag object `ec824fda1917cbe768fe34f7aa8d953db35dcf32`;
- exact installed PEFT wheel or sdist identity and cryptographic digest, with package/source provenance;
- Python, Torch, Transformers, PEFT, accelerator runtime and relevant dependency versions;
- fixed fixture hashes and adapter configuration;
- `modules_to_save` module name, sentinel value, serialized keys and restoration mapping;
- pre-save, serialized and post-load tensor equality checks;
- adapter add/switch/delete and mixed-adapter deletion outcomes;
- `autocast_adapter_dtype=False` forwarding behavior;
- deterministic negative cases for malformed/mismatched state, missing adapter state, failed hotswap/load and rollback;
- zero production authority and zero Hugging Face write authority during evaluation.

Do not use a network-only test as the sole gate. A bounded optional upstream smoke may supplement local deterministic fixtures, but promotion must remain reproducible without silently depending on mutable Hub state.

## Non-negotiable bounds

- no production default or route change;
- no blanket dependency bump;
- no rehosting upstream weights for inventory;
- no treating an unsigned source tag as a signed provenance receipt;
- no treating source-tag existence as proof of package publication or package bytes;
- no weakening of provenance, tests, rollback, licensing, receipts, branch protection, or exact-source binding;
- no inheritance of qualification across `v0.20.0 -> v0.21.0`, `75c3583e... -> dbbd5512...`, or unreleased-source -> release-source boundaries;
- keep automatic production promotion `false` until the owning repositories' normal controls prove the exact successor artifacts.
