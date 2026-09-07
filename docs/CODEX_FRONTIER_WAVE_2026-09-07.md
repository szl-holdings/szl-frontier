# Codex execution contract — Hugging Face frontier wave 2026-09-07

## Objective

Advance the SZL Holdings estate without creating model sprawl or unverifiable production claims.

The authority chain is:

`GitHub source -> governed evaluation/admission -> Hugging Face artifact projection -> a-11-oy.com product status -> a11oy.net proof record`

`szl-holdings/szl-frontier` owns frontier discovery, materiality, deduplication, admission state, and the cross-repository handoff. Consumer repositories own their implementation details. Hugging Face is an artifact/runtime projection, not the source of truth. a-11-oy.com is the product surface. a11oy.net is the evidence/proof surface.

The machine-readable wave is `frontier/waves/2026-09-07.json`.

## Current state to preserve

Do not rebuild controls that already exist.

- `frontier-watch.yml` already performs scheduled Hugging Face discovery, materiality filtering, deduplication, machine-readable evidence output, and deduplicated issue notification.
- `hf-sync.yml` already publishes the SZL Frontier Space from merged GitHub source and verifies that the running Space reports the exact GitHub SHA.
- WebGPU kernels, NeoMME, and VibeVoice are already represented in the canonical frontier catalog. Do not duplicate them.
- Production promotion is intentionally fail-closed and must remain separate from evaluation admission.

## New wave

### P0 — zai-org GLM-5.3 / GLM-5.3-Flash

Primary evaluation target: `zai-org/GLM-5.3-Flash`.

Reference target: `zai-org/GLM-5.3`.

Required work:

1. Add the family to the canonical frontier release catalog with immutable source metadata, materiality signals, evaluation gates, production gates, and watch metadata.
2. Treat licensing as mixed: Flash is MIT; the larger GLM-5.3 card reports a non-standard/other license. No redistribution assumption.
3. In `szl-nemo`, add a capability/provider profile for reasoning, coding, tools, long context, and image-text input. Keep provider selection behind the existing router contract.
4. In `szl-forge`, add an evaluation recipe, not a pretend local-training claim. Record source revision, runtime/container, prompts, fixtures, outputs, and metrics.
5. In `szl-serve`, add supported serving profiles only after reading the upstream deployment contract. Do not claim vLLM/SGLang compatibility unless the selected revision and runtime are actually exercised.
6. In `a11oy`, expose the route as `EVALUATION` until benchmark and production gates pass. It must never become action authority.
7. Benchmark against current SZL incumbent routes on coding, tool use, long context, multimodal tasks, refusal/governance, latency, VRAM, and cost.

### P0 — deepseek-ai/DeepSeek-V4-Flash-Vision-Exp

Required work:

1. Add the MIT-licensed upstream artifact to the canonical frontier catalog.
2. Add checksummed image/document/UI fixtures and multimodal tool-use tests.
3. Wire the capability through `szl-nemo`, `szl-forge`, and `szl-serve` using existing route abstractions rather than a one-off DeepSeek path.
4. Use `szl-second-brain` only for evidence-bearing visual retrieval/reasoning paths. Do not blend private memory into public test data.
5. Use `szl-command-lab` only as an evaluation/rehearsal consumer. No physical or consequential action authority.
6. In `a11oy`, require provenance, policy evaluation, approval where applicable, and a receipt for any downstream governed transition.
7. Measure multimodal quality, tool correctness, hallucination/refusal behavior, TTFT, p50/p95 latency, VRAM, and fallback behavior.

### P1 — nvidia/Qwen3.8-Flash-Next-NVFP4

Required work:

1. Add the NVIDIA quantized artifact and its base-model relationship to the canonical frontier catalog.
2. Treat licensing as review-required until the NVIDIA artifact and base-model terms are explicitly cleared for the intended use.
3. `szl-gpu-bridge` owns hardware/runtime qualification. Add a fail-closed device preflight and pin ModelOpt/runtime/container versions.
4. `szl-serve` owns serving profile and fallback behavior.
5. `szl-khipu` may consume benchmark evidence for the own-metal program; it must not imply that the upstream Qwen weights are an SZL-trained KHIPU model.
6. Compare quality retention and operational economics against FP8/current routes: cold start, TTFT, decode throughput, p50/p95, VRAM, and cost.
7. Promote only when the measured deployment benefit is positive and the fallback path is tested.

## Repository ownership matrix

| Repository | Responsibility in this wave |
| --- | --- |
| `szl-frontier` | canonical release intake, materiality, gates, watch metadata, wave status, receipts |
| `szl-nemo` | model/provider capability registry and governed model routing |
| `szl-forge` | reproducible evaluation and qualification recipes |
| `szl-serve` | inference/serving profiles, runtime pins, fallback |
| `szl-gpu-bridge` | NVIDIA hardware/runtime qualification and performance evidence |
| `szl-khipu` | own-metal consumption of measured inference evidence; never relabel upstream weights |
| `szl-second-brain` | evidence-bearing retrieval/reasoning integration only |
| `szl-command-lab` | bounded rehearsal/evaluation, no production authority |
| `a11oy` | policy-gated route exposure and runtime status |
| `a11oy-net` | proof projection: source, receipts, evaluations, known bounds |

Do not revive archived repositories to satisfy this wave. If a target responsibility has moved, use the current active owner and update the wave manifest accordingly.

## Required canonical changes in `szl-frontier`

1. Merge the three new candidates into `src/lib/frontier/release-catalog.js`.
2. Advance `FRONTIER_CATALOG_EVALUATED_AT` to the actual evaluation time.
3. Regenerate `public/frontier/release-evaluation-manifest.v1.json` with the existing generator; never hand-edit generated output if the generator can produce it.
4. Add tests covering:
   - unique candidate IDs;
   - exact upstream repository IDs;
   - materiality >= threshold for these three candidates;
   - `productionDisposition === HOLD` before production gates and sealed authorization pass;
   - licensing posture cannot be accidentally widened;
   - deduplication does not reopen the same upstream revision repeatedly.
5. Keep `productionPromotion` false for this wave until measured evidence explicitly satisfies the existing production contract.

## GitHub -> Hugging Face projection

The publish path must remain source-bound.

- GitHub merged `main` is authoritative.
- `SZLHOLDINGS/szl-frontier` receives the admitted manifest/status from the exact merged GitHub SHA.
- `SZLHOLDINGS/a11oy` may expose product-facing route status only after its own source repository admits the change.
- Do not copy full upstream weights into SZLHOLDINGS merely to create inventory. Prefer source references, adapters owned by SZL, benchmark artifacts, manifests, and receipts unless there is a concrete licensed reason to mirror weights.
- Any Hub publication must identify source repository and source revision.
- A Hub build being reachable is transport evidence only, not capability proof.

## Domain projection

### a-11-oy.com

Expose only product/runtime state that the source and runtime can support:

- candidate name and category;
- current state such as `EVALUATION`, `BENCHMARK`, `HOLD`, or `ADMITTED`;
- model route if actually configured;
- evidence class and last evaluated revision;
- fallback state;
- link to proof registry.

Do not display upstream benchmark claims as SZL measurements.

### a11oy.net

Expose the evidence record:

- upstream artifact URI and pinned revision;
- GitHub implementation PR/commit;
- benchmark receipt identifiers and fixture digests;
- runtime/container/model revision;
- measured result and known limitations;
- license posture;
- promotion disposition.

The two domains must agree on release identity and state, but they have different jobs: product vs proof.

## Autonomous frontier loop

Implement/retain this behavior:

1. **Discover** primary Hugging Face models, datasets, Spaces, blogs, kernels, runtimes, agent frameworks, retrieval/reranking, multimodal, speech, training/post-training, and deployment infrastructure.
2. **Deduplicate** by canonical artifact/revision and prior admitted/ignored state.
3. **Score materiality** against estate fit, evidence quality, integration readiness, and risk.
4. **Ignore low signal**: routine card edits, demo Spaces, cosmetic updates, minor version churn, and community noise.
5. **Create a governed proposal** for material candidates: wave manifest + issue/branch/PR.
6. **Run deterministic tests and bounded evaluations** in the owning repositories.
7. **Merge only green source changes** through normal repository controls.
8. **Project to Hugging Face from merged source** with exact-SHA verification.
9. **Project product state to a-11-oy.com** only after runtime admission.
10. **Project proof to a11oy.net** with receipts and known bounds.
11. **Never automatically change the production default solely because a new upstream model scored well.** Automatic discovery and PR creation are desired; production promotion remains evidence-gated.

## Codex working method

For every repository touched:

1. Read repository-local `AGENTS.md`, contributor instructions, package metadata, CI workflows, and current routing/evidence contracts before editing.
2. Reuse existing abstractions and terminology; do not create parallel provider registries or duplicate model routers.
3. Make the smallest coherent change that satisfies the repository's ownership responsibility.
4. Add deterministic tests before claiming completion.
5. Use a feature branch and PR. Do not push directly to protected `main`.
6. Do not weaken branch protection, provenance, policy, receipt, or overclaim gates to make CI green.
7. Do not place credentials, tokens, private datasets, or private memory in code, fixtures, logs, issues, or Hub artifacts.
8. If an upstream capability cannot be reproduced, record `UNAVAILABLE`/`HOLD` with evidence instead of inventing success.

## Definition of done

This wave is complete only when:

- the three candidates are present once in the canonical frontier catalog;
- generated manifests and tests agree;
- each consumer implementation lives in the repository that owns the responsibility;
- evaluation evidence is reproducible and source-pinned;
- GitHub and Hugging Face show the same admitted source revision;
- a-11-oy.com and a11oy.net show the same release identity and disposition;
- fallback paths are tested;
- no production default has moved without all production gates and authorization evidence passing;
- there are no duplicate model cards or vanity Spaces created merely to make the estate look larger.
