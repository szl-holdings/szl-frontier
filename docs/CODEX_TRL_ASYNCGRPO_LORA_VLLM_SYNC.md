# Codex handoff — TRL AsyncGRPO LoRA / vLLM adapter synchronization

## Exact source

Evaluate only `huggingface/trl@f540773f5250c816e992ae3d35a41142ef3625c0`. This is a post-v1.13.0 `main` commit, not a stable release; never silently follow moving `main` and never replace the stable TRL 1.13 production/evaluation baseline merely because this feature exists.

## Owner and objective

Executable work belongs in `szl-holdings/szl-forge`. Extend the existing TRL tooling lane rather than creating a second generic TRL harness. Use a fixed, non-secret, locally controlled task/rollout fixture and a locally controlled vLLM endpoint. No provider credential or external production endpoint is part of this evaluation.

Measure adapter-only synchronization against merged-weight synchronization under the same model/config/hardware where available: transferred bytes, sync pause, rollout generation throughput, policy-version identity, peak resource usage and recovery after failure. Preserve upstream measurements as upstream observations only; generate SZL-owned receipts for any local result.

## Required failure and integrity cases

Prove fail-closed behavior for server without `--enable-lora`, runtime adapter updates unavailable, insufficient `--max-lora-rank`, insufficient `--max-loras`, staleness window rollover, load-before-evict ordering, missing/non-shared adapter cache path, path escape/symlink attempts, server restart, partially written adapter state, cache eviction, and checkpoint disabled/missing. Checkpoints must be the durable trained artifact; the `.vllm_lora` serving cache is not evidence of durable training output.

For hybrid/recurrent architectures, explicitly test or mark UNAVAILABLE the upstream warning that packed-row recurrent state can make trainer log probabilities diverge from server generation. Do not convert absence of suitable hardware or model support into PASS.

## Authority boundary

No runtime adapter update endpoint receives autonomous production authority. No result authorizes production training, production serving, provider writes, secret access, branch-protection changes, merge/deploy authority, route changes or model promotion. A successful evaluation remains EVALUATION until a separate normal-control qualification binds exact model, runtime, data, policy, rollback and immutable proof evidence.
