# Codex handoff — Transformers PEFT `modules_to_save` restoration successor

Canonical issue: `szl-holdings/szl-frontier#142`  
Canonical wave: `frontier/waves/2026-09-14-transformers-peft-020-load-floor.json`  
Predecessor source: `huggingface/transformers@75c3583e042c0765874784306fb9ace2137925d1`  
Successor source: `huggingface/transformers@dbbd551285e9d591a5c9692154341531531dac6c`  
Upstream PR: `huggingface/transformers#48595`  
Disposition: **WATCH / EVALUATION / HOLD**

## Why this materially advances the existing wave

The predecessor wave admitted the post-5.17 PEFT 0.20 floor because Transformers reported that PEFT 0.19.1 could not correctly load adapter weights. The upstream successor now fixes a concrete restoration defect on that path: `AutoModel.from_pretrained` could ignore the key mapping returned by `AuxiliaryTrainingWrapper.adapter_state_dict_load_map`, leaving `modules_to_save` weights unrestored. The exact successor adds `WeightRenaming` mappings and an upstream sentinel regression for a saved classification head.

This does **not** mean current SZL pins are broken, and it does not authorize a package bump. It means qualification at the predecessor SHA cannot be treated as evidence for this successor behavior.

## Execution order

1. **szl-frontier** — keep the successor exact-bound to `dbbd551285e9d591a5c9692154341531531dac6c`; preserve HOLD and the existing rollback boundary.
2. **szl-forge** — extend the adapter compatibility lane with a fixed, non-secret local fixture that saves and reloads a LoRA adapter with `modules_to_save`, mutates the wrapped module to a known sentinel, and proves the sentinel is restored after `from_pretrained`.
3. Exercise at least a classification-head case and the existing adapter add/switch/delete/save-load cases. Re-run the distributed LoRA export/load integrity coverage owned by Frontier #110.
4. **szl-gpu-bridge** — evaluate the exact successor pair on the governed accelerator/laptop lane. Do not change the purpose-pinned `peft==0.19.1` environment merely to make resolution succeed.
5. **a11oy** — only after Forge and GPU Bridge evidence is exact-source, deterministic, and green, prepare a separate pin-convergence PR if the active training-box lane actually needs the successor stack.
6. **Hugging Face -> a-11-oy.com -> a11oy.net** — no projection or claim change until the repository-native gates have passed. Publish only measured receipts and exact identities; never infer product alignment from a package install.

## Minimum deterministic witness

The executable witness must fail on a source lacking the restoration mapping and pass on the exact successor. It must record:

- exact Transformers revision and PEFT package/source identity;
- model/fixture identity and hashes for any local serialized fixture;
- `modules_to_save` module name and deterministic sentinel value;
- pre-save, serialized, and post-load tensor equality checks;
- adapter name and key mapping actually exercised;
- runtime Python/Torch/Transformers/PEFT versions;
- zero production authority and zero Hugging Face write authority.

Do not use a network-only test as the sole gate. A bounded optional upstream smoke may supplement the local deterministic fixture, but promotion must remain reproducible without silently depending on mutable Hub state.

## Non-negotiable bounds

- no production default or route change;
- no blanket dependency bump;
- no rehosting upstream weights for inventory;
- no weakening of provenance, tests, rollback, licensing, receipts, branch protection, or exact-source binding;
- no claim that the upstream regression alone proves SZL compatibility;
- no inheritance of predecessor qualification across `75c3583e... -> dbbd5512...`;
- keep automatic production promotion `false` until the owning repositories' normal controls prove the successor.
