# Codex handoff — Kimi-K3 NVIDIA routed-expert quant successor

Canonical governance: `szl-holdings/szl-frontier#180`  
Existing Kimi-K3 model admission: `szl-holdings/szl-frontier#47`  
Existing Kimi runtime successor owner: `szl-holdings/szl-frontier#168`  
Exact upstream source: `vllm-project/vllm@76d517fd1279805fa2318c28343fcd57b030ead3` / #57430  
Disposition: **EVALUATION / HOLD**

This is not a new Kimi-K3 model admission and not a replacement for the ROCm SiTUv2 A4W4 work. It is a later NVIDIA quantization-path correctness successor. The upstream model code previously created `routed_expert_down_proj` and `routed_expert_up_proj` with `quant_config=None`; the successor passes the configured quantization object into both projections. Source support does not prove that an SZL Kimi checkpoint, quant scheme, accelerator path or route is qualified.

## Execution order

1. Confirm actual exposure in the active estate. Record whether any admitted or evaluation-only Kimi-K3 path uses vLLM's NVIDIA implementation and a quantization mode that should cover the routed expert projections. If absent, receipt `NOT_EXPOSED`; do not change dependencies merely to manufacture exposure.
2. Bind exact vLLM image/source, the exact legally admitted Kimi-K3 artifact/revision selected under #47, tokenizer/config, quantization config/scheme, Torch/Triton/CUDA/driver, NVIDIA GPU identity and TP/EP topology. Do not float model or runtime revisions and do not rehost weights.
3. Build a structural known-bad control on the immediate predecessor. Inspect the actual routed-expert projection modules and prove that configured quantization is omitted there while surrounding expected modules are quantized. Candidate must show the intended quantized methods/state on both routed expert projections. An unsupported scheme must fail explicitly rather than silently falling back to full precision or another quantizer.
4. Close numerical correctness before memory/performance. Use deterministic expert-routing fixtures covering multiple experts, route boundaries, batched and repeated requests. Compare candidate routed-expert and full-model outputs/logits against an independently qualified BF16/FP16 or explicitly declared reference with predeclared tolerances. Include graph/eager, cancellation and restart where applicable.
5. Produce a per-layer quantization-coverage receipt. A partially quantized model must never be called fully quantized. Record weight/scale dtype and quantizer identity without exposing proprietary content. Only after correctness may memory footprint, latency and throughput be measured under the same model/input/topology.
6. Preserve the incumbent qualified route as rollback. Missing suitable NVIDIA hardware is `UNAVAILABLE`; absence of the affected path is `NOT_EXPOSED`; unrun numerical comparison is `UNQUALIFIED`.

## Ownership and projection

`szl-frontier#180` owns this dated successor wave. `#47` remains Kimi-K3 model/license/artifact admission authority; `#168` remains the related Kimi runtime-successor ledger and must not transfer ROCm qualification to this NVIDIA path. `szl-forge` owns deterministic fixture execution and historical exposure search. `szl-gpu-bridge` owns actual accelerator closure. Integrate in the active serving owner only after those gates pass. Then follow protected GitHub admission -> established Hugging Face publisher -> exact runtime readback -> `a-11-oy.com` -> `a11oy.net` measured proof.

Residual authority-chain issue #151 is independent. No Kimi source support closes public inventory/proof drift, grants tool/action authority, or authorizes a production default.

## Required receipt

Retain: predecessor and candidate vLLM SHA/image digest; Kimi artifact/config/tokenizer hashes; quant config; exact routed-expert module coverage before/after; output/logit fixture digests and tolerances; accelerator/runtime/topology; graph mode; cancellation/restart result; memory/performance only after correctness; exposure determination; license/provenance review inherited only where exact artifact identity remains valid; rollback target; owner PR and protected admitted source; downstream runtime/product/proof readbacks only when actually published.
