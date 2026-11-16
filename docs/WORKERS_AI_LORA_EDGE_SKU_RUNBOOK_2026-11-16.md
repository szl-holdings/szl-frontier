# Workers AI LoRA Edge-SKU Execution Runbook (2026-11-16)

CTO lane, szl-holdings estate. Companion to docs/CF_FULL_SURFACE_MONETIZATION_AUDIT_2026-11-16.md (ranked build item 2). Every fact below was measured this session unless marked otherwise.

## 1. Rail state (measured, account d2d4084c615189c795286ea5eaec2229)

- GET /accounts/{acc}/ai/finetunes returns 200 with [] (endpoint live, zero fine-tunes on account; measured 2026-11-16 ~01:30Z).
- Feature is in open beta and free during this period. Up to 100 LoRA adapters per account.
- Full API (measured from Cloudflare API reference, 2026-11-16 ~03:0xZ):
  - POST /accounts/{acc}/ai/finetunes with JSON {model, name, description?, public?} -> result.id (UUID).
  - POST /accounts/{acc}/ai/finetunes/{finetune_id}/finetune-assets with multipart form data {file, file_name} where file_name is exactly adapter_config.json or adapter_model.safetensors.
  - GET /accounts/{acc}/ai/finetunes (list), GET /accounts/{acc}/ai/finetunes/public.
  - Assets cannot be edited after upload; a revised adapter requires a new finetune.
- Hard limits (measured from the LoRA docs): adapter rank r <= 32; adapter file < 300 MB; exact filenames adapter_config.json + adapter_model.safetensors; adapter_config.json must include model_type as one of llama, mistral, gemma; base must be a Workers AI -lora model (unquantized).
- Supported -lora base models (measured from the model catalog):
  - @cf/google/gemma-2b-it-lora (smallest; the edge-SKU target class)
  - @cf/google/gemma-7b-it-lora
  - @cf/meta-llama/llama-2-7b-chat-hf-lora
  - @cf/mistral/mistral-7b-instruct-v0.2-lora
  - (llama-3 8b class lora variants; verify at launch time)

## 2. Honest gap (measured)

- The estate's trained LoRA adapters today are Qwen3-based (SZLHOLDINGS/salad-x402-frontier-v1: base Qwen/Qwen3-1.7B, r=32, adapter_model.safetensors 51.4 MB). Qwen3 is not an accepted model_type and has no Workers AI -lora base. INCOMPATIBLE as-is; do not attempt the upload with these files.
- No estate adapter currently has a llama / mistral / gemma base. The edge SKU therefore requires ONE new Salad LoRA train on @cf/google/gemma-2b-it (model_type gemma) using an estate SFT dataset. Measured dataset candidates (HF org, public): SZLHOLDINGS/szl-1-doctrine-sft, SZLHOLDINGS/szl-quant-sft-v1, SZLHOLDINGS/szl-frontier-sft-mix-v2, SZLHOLDINGS/a11oy-verifiable-corpus (4,189 downloads), SZLHOLDINGS/killinchu-osint-corpus (145,080 downloads).
- The training launch is a GPU-lane decision (Salad, owner / parallel-lane). This lane does NOT fire it blind: it spends credits and the data-format choice (prompt/completion vs messages) materially affects the product.

## 3. Launch sequence (when a gemma / llama / mistral base adapter lands)

1. Precheck the adapter: rank <= 32; total size < 300 MB; filenames exact; adapter_config.json carries model_type gemma (PEFT writes base_model_name_or_path; add model_type explicitly) and task_type CAUSAL_LM.
2. POST /ai/finetunes with {model: "@cf/google/gemma-2b-it-lora", name: "szl-<dataset>-gemma2b-lora", description: "...", public: false}. Record the finetune UUID (receipt).
3. Upload adapter_config.json then adapter_model.safetensors via finetune-assets (multipart). Record both success booleans (receipts). No wrangler on the estate laptop is required: the dash same-origin proxy can submit multipart FormData, or run npx wrangler ai finetune create once available.
4. GET /ai/finetunes to verify the new entry and its asset state.
5. Serving PR (a11oy lane): route the model through the szl-router AI Gateway exactly as PR #3500 does, pass { lora: <finetune name-or-id> } in the run options, sit behind the x402 wall (0.02 USDC/call, eip155:8453), and log through the existing revenue-tracker (dataset x402_revenue — NOT szl_revenue_events; see 2026-11-16 ledger correction).
6. Receipts to the ledger: finetune UUID, asset upload results, first live served request, and the AI Gateway analytics delta.

## 4. Monetization placement (per audit #327)

The LoRA edge SKU is a catalog entry behind the single monetizing surface: edge -> x402 wall -> Workers AI (gemma-2b-it-lora + estate adapter) -> revenue-tracker receipt. 1.5B-4B classes stay on Salad upstream. PyPI stays free top-of-funnel. No new workers are created for this SKU (one-component-per-layer doctrine).
