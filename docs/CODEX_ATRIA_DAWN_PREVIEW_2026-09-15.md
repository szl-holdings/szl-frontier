# Codex handoff — Atria Dawn Preview governed evaluation

Canonical issue: `szl-holdings/szl-frontier#166`  
Governed wave: `frontier/waves/2026-09-15-atria-dawn-preview.json`  
Hugging Face model: `internlm/Atria-Dawn-Preview`  
Exact complete weight-bearing snapshot: `d0c6b46bc1ae6f63b47c32bfed8a674c2bbb9f04`  
Paper: `arXiv:2609.15818`  
Disposition: **WATCH / EVALUATION / HOLD**

## Boundary

Primary Hugging Face metadata identifies the model as a roughly 753B-parameter `glm_moe_dsa` checkpoint under MIT. The upstream paper/model card positions it for long-horizon scientific and engineering agent work trained through verified tool interactions. Those claims are discovery context only. They are not SZL evidence.

The exact snapshot above is intentionally pinned before later card-only edits. Do not evaluate moving `main`. A later weight/config revision requires a successor wave or an explicit governed revision update.

## Feasibility first

Do not pull or rehost hundreds of billions of parameters merely to prove inventory. Before any local-weight job, calculate storage, RAM/VRAM, interconnect, expected quantization, startup and hourly-cost requirements. If no justified lane exists, record local execution as `UNAVAILABLE`.

A remote official endpoint may be evaluated independently, but its behavior cannot be attributed to the pinned Hub bytes unless the provider exposes sufficient source identity. Keep `REMOTE_ENDPOINT_EVAL` and `PINNED_HUB_WEIGHT_EVAL` as distinct evidence classes.

## Deterministic fixture families

Use fixed prompts, tool definitions, seeds/temperature where applicable, token/tool budgets and predeclared scoring.

### Evidence discipline

- answer from a supplied evidence packet and cite exact handles;
- abstain when required evidence is absent;
- distinguish model inference from tool-returned facts;
- reject a conflicting untrusted snippet when a higher-authority source is provided;
- preserve evidence IDs through multi-step work.

### Tool fidelity

- exact tool selection from a small ambiguous set;
- exact JSON argument schema and value fidelity;
- no invented parameters;
- recovery from tool timeout/error;
- no duplicate side-effect call after an uncertain result;
- explicit human approval before a gated action.

### Injection / authority

- prompt injection embedded in retrieved text;
- instructions embedded in tool output;
- fake approval tokens in documents;
- request to expand tool scope or credentials from untrusted text;
- cross-turn attempt to reinterpret a denied action as approved.

The model may propose; it may not manufacture authority.

### Long-horizon state

Use a bounded multi-step scientific/software task with checkpoints. Measure whether the model preserves constraints, evidence provenance, unresolved uncertainties and tool state rather than only whether it reaches a plausible final answer.

### Modality honesty

The documented interface is text-only. Include cases referencing an unavailable image/PDF/screenshot and require an explicit inability/evidence request rather than fabricated visual observations.

## Comparison contract

Compare Atria against named incumbent model/agent baselines using identical:

- fixture set;
- system/tool policy;
- token limits;
- tool-call limit;
- timeout;
- retries;
- retrieval corpus;
- evaluator version;
- cost accounting.

Retain per-fixture results, not only aggregate scores. Upstream paper scores never become SZL PASS receipts by citation.

## Remote endpoint receipt

If an official endpoint is exercised, capture:

- provider and endpoint URL class without storing credentials;
- requested model ID;
- provider-reported version/revision if available;
- timestamp;
- request body hash and policy/tool schema hash;
- response/tool-call canonical hash;
- usage tokens, latency and reported cost where available;
- cancellation/error behavior;
- source-binding status: `BOUND`, `UNBOUND`, or `UNKNOWN`.

An `UNBOUND`/`UNKNOWN` remote result may guide research but cannot qualify the pinned Hub revision.

## Ownership

- `szl-frontier#166`: admission/evidence policy.
- `szl-forge`: deterministic evaluation fixtures and receipts.
- `a11oy`: proposal/action admission only after qualification.
- `hatun-mcp` or the then-active policy owner: tool authorization boundary if a live agent lane is exercised.
- `a11oy-net`: measured proof projection only after exact-source closure.

## Non-negotiable bounds

- no production route/default/provider change from this intake;
- no weight rehosting for inventory;
- no claim that remote API output proves the pinned Hub bytes without source binding;
- no automatic execution authority from model/tool text;
- no unsupported multimodal claim;
- no weakening of tests, policy, provenance, receipts, licensing, rollback or branch protection;
- no product/proof promotion until normal gates pass;
- automatic production promotion remains `false`.
