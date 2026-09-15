# Codex handoff — Transformers / PEFT 0.20 adapter-load floor

Canonical issue: `szl-holdings/szl-frontier#142`  
Canonical wave: `frontier/waves/2026-09-14-transformers-peft-020-load-floor.json`  
Upstream Transformers source: `75c3583e042c0765874784306fb9ace2137925d1`  
Disposition: **WATCH / EVALUATION / HOLD**

## Objective

Qualify the new Transformers PEFT minimum-version boundary without changing production defaults or blanket-upgrading purpose-pinned environments. Upstream now requires PEFT >=0.20.0 for the integrated adapter path and states that 0.19.1 cannot correctly load adapter weights. SZL currently has explicit 0.19.1 pins in A11oy's training box and the GPU Bridge laptop stack; those current exact stacks are not declared broken by this handoff, but they cannot be inherited into a successor Transformers promotion without explicit compatibility evidence.

## Execution order

1. **Forge owns executable compatibility.** Reuse the existing PEFT evaluation surface rather than creating a parallel adapter framework. Add fixed synthetic/public LoRA fixtures for load, add, switch, delete, save, reload, tensor-identity, and output-parity checks. Bind every run to exact Transformers, PEFT, torch, safetensors, base-model fixture, and environment identities.
2. **Prove the negative contract.** A planned environment whose Transformers source declares `MIN_PEFT_VERSION >= 0.20.0` while the plan pins `peft==0.19.1` must fail closed before training/inference. Do not let dependency resolution silently substitute a different adapter runtime.
3. **Re-run Frontier #110 integrity cases** under the successor pair. Preserve gathered-vs-ungathered LoRA handling, serialized `lora_A`/`lora_B` shape/readability checks, exact base/adapter binding, and immutable artifact receipts.
4. **GPU Bridge owns hardware/laptop closure.** Only after Forge correctness passes, qualify the successor package set on the exact laptop/container lane. Record CUDA/driver/torch/accelerator identity, install freeze, resource envelope, cancellation/failure behavior, and rollback to the existing image/bootstrap stack.
5. **A11oy owns the training-box pin.** Change `training/box/requirements-box.txt` only if the exact successor Transformers target is being admitted and Forge/GPU evidence proves the resulting stack. Preserve the incumbent training box as rollback until the normal owner controls pass.
6. **Keep PEFT `e99fdd275075068d093f8996a59bc0eb865f71a2` separate.** That unreleased commit repairs `autocast_adapter_dtype=False` forwarding for affected subclasses/load paths. Evaluate it as WATCH evidence only; do not call it stable v0.20.0 behavior unless a later PEFT release actually contains it.
7. **Projection stays downstream of GitHub evidence.** No Hugging Face SZL artifact/runtime projection, a-11-oy.com product/default change, or a11oy.net success claim until exact-source measured receipts exist.

## Required evidence

- exact source/package digests and dependency freeze;
- deterministic fixture hashes and expected outputs;
- adapter state/tensor hash comparison across save/load;
- explicit expected failure for 0.19.1 under a successor Transformers floor;
- current-vs-successor compatibility matrix;
- #110 export-integrity regression results;
- rollback proof;
- licenses/provenance unchanged and no upstream weights rehosted merely for inventory.

## Hard bounds

No production route/default changes, no autonomous training/deployment, no secret expansion, no branch-protection or test weakening, no unsupported compatibility claim, and no promotion from package installation alone. Record unsupported hardware/runtime paths as `UNAVAILABLE`; record incomplete evidence as `HOLD`.
