# Codex handoff — Sep 19 overnight cache, multimodal and security successors

Canonical governance: `szl-holdings/szl-frontier#180` / PR #181.

This handoff is additive to Waves A–G. It does not supersede, rewrite, or inherit qualification from any earlier wave. GitHub source remains authoritative; any admitted source change must flow GitHub -> canonical Hugging Face projection/runtime -> `a-11-oy.com` product/runtime -> `a11oy.net` measured proof. Missing evidence is `UNAVAILABLE` or `UNQUALIFIED`, never zero or PASS.

## Exact upstream pins

| Candidate | Exact upstream source | PR | Initial owner |
|---|---|---:|---|
| vLLM multimodal hash framing/cache isolation | `vllm-project/vllm@a8d1aa9c99b8698a2a78b611b7a10c30e6b3995b` | #54283 | Forge + active serving owner |
| vLLM Aria expert weight name/layout | `vllm-project/vllm@01c7bf88135458940d89584c05ae47404aac77cb` | #57487 | Forge -> GPU Bridge |
| SGLang SafeUnpickler nested-storage successor | `sgl-project/sglang@5b42d10edfa4b626b1e37026577eb5706e89b69a` | #40259 | Forge security lane |
| SGLang GLM-OCR MTP multimodal/MRoPE | `sgl-project/sglang@929230a6f015dcc4042ef8d06ef10c0c81f17327` | #39088 | Forge -> GPU Bridge |
| SGLang published runtime-context rank placement | `sgl-project/sglang@3a5f52e14419b7f1d25d7a3833ebaecf10d484b4` | #40071 | Forge -> GPU Bridge/serving |

Do not float to a newer main commit while executing a candidate. If a later upstream fix is needed, record a new successor pin rather than silently changing this evidence scope.

## 1. vLLM multimodal hash framing

Goal: prove that distinct caller-controlled multimodal preprocessing inputs cannot alias a processor-cache or prefix-cache identity through ambiguous byte concatenation.

Required execution:
1. Materialize exact predecessor and candidate worktrees. Record source commits, dependency lock/runtime and test command.
2. Reproduce the documented collision families on the predecessor: key/value boundary shifts; nested mapping versus dotted key; sequence versus string-index mapping; `None` versus empty serialized values; empty container versus omitted input. Preserve the two full inputs and resulting digest for each case.
3. On the candidate, require distinct digests for every distinct pair and identical digest for identical normalized inputs. Do not merely assert that an upstream test passes.
4. Drive the real multimodal processor cache and prefix-cache paths with those pairs. A cache entry created for request A must never satisfy B. Cover cache hit/miss, concurrency, multimodal batching, restart/cold cache and multiple tenant/session contexts used by the owning SZL runtime.
5. Record preprocessing cost only after correctness. Cache-disable remains rollback. Never claim the framing scheme solves arbitrary cryptographic hash collisions.

Owner mapping: deterministic/adversarial fixtures in `szl-forge`; serving integration only in the active serving owner after qualification; A11oy projection only after source admission.

## 2. vLLM Aria expert loading

Goal: close exact checkpoint-to-runtime weight identity before treating Aria as runnable.

Required execution:
1. Resolve the exact public Aria checkpoint/config/tokenizer/processor revision and file identities. If this cannot be resolved through an allowed primary source, stop the lane as `UNAVAILABLE` rather than substituting another model.
2. Run the immediate predecessor and retain the expert-name and post-name-fix tensor-shape failure evidence.
3. On the candidate, record every expected expert and shared-expert source key, destination parameter, transform/transpose and final shape. Fail for missing, duplicate, leftover or unexpected tensors.
4. Compare a qualified Hugging Face reference with vLLM over FP32/BF16, top-k 1/2 and multiple token counts. Add the relevant quantization configurations while proving config mapper names remain correct.
5. Accelerator full-model inference is mandatory for serving qualification; upstream CPU parity is supporting evidence only. No checkpoint is mirrored solely for inventory.

## 3. SGLang SafeUnpickler nested-storage successor

This is a successor to the earlier governed SafeUnpickler revision `882577451e764a515df2a386a055012e8f075a16`; it may not inherit that revision's qualification.

Required execution:
1. Pin Python, Torch, SGLang and the exact serialization/weight-cache protocol versions.
2. Build negative payloads for callable globals admitted by prefix trust, `torch.storage._load_from_bytes`, unexpected reconstruction helpers and non-storage nested results. Where the predecessor defect is executable, retain known-bad admission evidence.
3. Candidate must use exact `(module, name)` policy and `torch.load(..., weights_only=True)` for nested storage, then validate the returned storage type. Unexpected objects fail closed with no remote-code execution or policy fallback.
4. Preserve valid tensor/storage, encoder metadata and weight-cache round trips. CPU success does not qualify model-server, distributed, accelerator or weight-cache production paths that were not exercised.
5. Never broaden the allowlist or disable `weights_only` to recover compatibility. Any required additional global is a separately reviewed exact entry with a regression test.

## 4. SGLang GLM-OCR MTP multimodal/MRoPE

Goal: prove memory-safe image speculative decoding and positional-state parity.

Required execution:
1. Bind target/draft checkpoint revisions, processor, exact multimodal inputs, EAGLE/MTP settings, SGLang/Torch/CUDA stack and graph/eager mode.
2. Run predecessor image+MTP with memory checking where feasible and retain CUDA OOB/equivalent failure evidence.
3. Candidate must reuse target multimodal embeddings rather than vocabulary lookup of image placeholders. Record embedding shapes/ownership and reject mismatched placeholders.
4. Track MRoPE positions across target -> draft, every speculative step and CUDA graph buffer replay. Require deterministic equality with an independently computed/reference positional sequence.
5. Compare greedy candidate output against non-MTP baseline for graph on/off, several image sizes/counts, single and at least five concurrent requests. Add text-only and malformed multimodal controls, cancellation, restart and graph recapture.
6. Any OOB, NaN, positional divergence or cache ownership ambiguity is a hard failure. Non-MTP remains rollback.

## 5. SGLang published rank placement/runtime context

Goal: prove one coherent topology account across launcher-known placement, process groups and speculative scopes.

Required execution:
1. Bind entrypoint/launcher, TP/PP/DP/CP/EP widths, all ranks, distributed backend, scheduler mode, draft mode and accelerator topology.
2. Cross-check published placement versus process-group-derived values over a topology matrix. `dp_rank=None` must remain an intentional answer where specified. Preserve the documented `moe_dp_rank` fallthrough where launcher and group semantics intentionally differ.
3. Exercise pipeline and tensor-parallel group swaps and all six speculative worker construction / attention-backend-init / graph-capture scopes. Verify target and draft topology cannot leak across scope boundaries and that frozen reports retain the runner's intended placement after scope exit.
4. Compare deterministic decode against a qualified baseline for runnable TP/PP/DP shapes.
5. **PP + speculative decoding remains `UNQUALIFIED`** until an actually supported checkpoint/runtime path executes successfully; unit tests and non-speculative token parity cannot close that predicate.

## Global acceptance and publication rules

For every candidate:
- Exact source/checkpoint/runtime identities and license/provenance evidence are mandatory.
- Known-bad predecessor/negative controls must fail for the expected reason where executable.
- Candidate-specific deterministic tests and full owner repository tests must pass without suppression.
- Accelerator-dependent assertions require measured hardware receipts; unavailable hardware is `UNAVAILABLE`.
- No production dependency/default, provider, route, effector, credential scope, branch protection, test, policy, receipt, rollback or fallback is weakened.
- Do not rehost weights merely for inventory.
- A green `szl-frontier` governance PR qualifies only the governance contract. It does not qualify the upstream runtime/model.
- After protected owner-source admission, publish through the existing single writer, read back exact HF source/runtime identity, then product identity, then publish proof only from measured same-scope receipts.

Residual authority-chain closure remains owned by `szl-holdings/szl-frontier#151`. The observed A11oy GitHub/HF/product source identity is `43058398fb8ea346a7bd977f1a35391aeec1bf1a`; the proof record remains dated 2026-09-12 and must not be combined with later observations into a synthetic whole-chain PASS.
