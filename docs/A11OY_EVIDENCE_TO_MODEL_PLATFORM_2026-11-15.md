# A11oy: Evidence-to-Model Platform — Architecture Direction (2026-11-15)

Status: ADOPTED DIRECTION (owner decision 2026-11-15, CTO lane). Spec-of-record for the A11oy product line.
Provenance: synthesized from the 2026-11-15 owner CTO recommendation, the 2026-11-15 estate audit (24 local repos, 100-repo accessible GitHub audit surface), and the existing primitive inventory across a11oy / platform / szl-router / szl-lake / szl-trust / lutar-lean / szl-forge.
Doctrine: fail-closed; UNKNOWN never PASS; honest receipts (never fabricated); one decision card per PR.

## 1. Positioning

A11oy is an evidence-first model factory for companies that need to turn authorized operational data into governed, reproducible, deployable intelligence.

The product is NOT "give us every company credential and we will train a model." It is:

> A customer authorizes scoped systems, A11oy builds a tenant-isolated evidence graph, deterministically cleans the permitted data, trains a customer-specific artifact, proves the lineage and evaluation, and serves only promoted revisions through a governed inference layer.

The individual components are established categories (connectors, OAuth brokers, RAG/source rights, cleaning, training, registries, inference gateways, formal verification, receipt logs, usage billing). The differentiated, defensible product is the COMPLETE evidence chain: every step tenant-scoped, reproducible, independently inspectable, and reversible. We do not claim "one-of-one" before customer evidence exists.

## 2. Canonical roles (one component per layer — no duplicates)

| Layer | Canonical component | Role |
| --- | --- | --- |
| Source | szl-holdings GitHub | Code, workflows, model manifests, policies, source revisions |
| Python control plane | szl-holdings/a11oy | Tenant control plane, connectors, evidence API, policy gates |
| Tenancy reference | szl-holdings/platform | Tenant scopes, RBAC, retention, deletion, connector security patterns |
| Inference router | szl-holdings/szl-router | OpenAI-compatible routing, provider failover, model registry, inference receipts |
| Evidence lake | szl-holdings/szl-lake | Append-only, hash-chained receipt storage and verification |
| Trust layer | szl-holdings/szl-trust | Receipt verification and payment-context validation |
| Formal spine | szl-holdings/lutar-lean | Lean modules, theorem references, explicit invariant verification |
| Model factory | szl-holdings/szl-forge | Training waves, evaluation, model manifests, release receipts |
| Product Space | SZLHOLDINGS/a11oy (HF) | Integrated product and evidence shell |
| Router Space | SZLHOLDINGS/llm-router-live (HF) | Inference/router status surface |
| Edge | Cloudflare Workers | Product edge, API routing, request telemetry, paid canary |
| Production inference | Salad-backed inference gateway | Current live inference and x402 entry point |

The two existing Spaces are correct as-is; DO NOT create a third duplicate Space. The platform repository's tenancy patterns (org_id, tenantScope, RBAC, scoped storage, audit, deletion) are reused as policy and design references — we do NOT rewrite the Node/TypeScript platform into Python. "Fully Python" means the primary control plane, API, data orchestration, training coordination, and evidence services are Python; the Cloudflare edge adapter stays JavaScript (runtime boundary).

## 3. The end-to-end evidence chain (the product)

customer authorization → source scope → source digest → cleaning transforms → dataset revision → training run → evaluation → model artifact → promotion decision → inference output → payment settlement

Every hop is a receipt with a parent pointer. A single customer-visible artifact and provenance graph represents the estate.

## 4. Drift must be explicit — never one green light

The command center must show these states as DISTINCT, never collapsed into a healthy HTTP 200:

1. GitHub source newer than the HF Space.
2. HF Space revision different from its source repository.
3. Worker revision different from protected GitHub source.
4. Model card receipt absent from the public dataset.
5. Lean proof bound to a different commit than the model artifact.
6. Live endpoint serving a model revision absent from the promotion registry.
7. Runtime healthy while quality or payment evidence is unavailable.

## 5. Customer credential model

Highest-risk surface. NEVER ask companies to paste credentials into chat, prompts, issues, datasets, or model cards.

Flow: (1) select provider → (2) select exact org/repos/folders/projects/tables/date range → (3) grant read-only by default → (4) review coverage map → (5) approve first sync → (6) set retention/deletion/training permissions → (7) scope upgrades only for an explicit operation.

A11oy stores: tenant ID, connector ID, provider, granted scopes, vault reference, token expiry, last validation state, source coverage, policy revision.

A11oy does NOT store raw credentials in its normal database. Short-lived access tokens live in an external vault, KMS, or customer-managed secret manager; if a retained token is unavoidable: tenant-scoped envelope encryption + rotation.

Receipts may contain credential/access-grant FINGERPRINTS. Receipts must NEVER contain: raw access tokens, private keys, refresh tokens, authorization headers, unredacted customer data, or customer secrets embedded in source text.

The existing a11oy connector code (OAuth connector, connector service, RAG source-rights model) is the starting point; it must be promoted into a durable authenticated tenant service BEFORE accepting real external-company data. Source-rights logic is a policy primitive, not proof of complete tenant isolation.

## 6. Tenant isolation is the first commercial gate

Minimum data model: organization, tenant, workspace, user, connector, dataset, dataset_revision, training_run, model, model_revision, deployment, receipt, settlement. Every record and object carries a tenant identifier. NO default tenant, NO anonymous tenant, NO NULL fallback.

Per-tenant isolation: metadata, object-storage namespace, temp processing dir, connector credentials, job queue, logs, model registry, retention policy, deletion lineage, encryption key (reference).

Cross-tenant training DISABLED by default. A shared model may use multi-company data ONLY after: explicit written customer authorization, de-identification, license review, a data-use policy, a contribution receipt, separate evaluation, tenant withdrawal handling, and a promotion decision naming the permitted training population. Default commercial offer: tenant-specific adapters and tenant-specific inference.

## 7. Receipt-aware deterministic cleaning pipeline

authorized sync → parse → normalize → schema validation → secret and PII detection → quarantine or redaction → deterministic deduplication → license and retention checks → quality scoring → lineage-grouped train/eval split → signed dataset manifest.

Every stage creates a child receipt linked to its parent. Each receipt binds: tenant ID, connector ID, source URI, source revision or retrieval timestamp, content digest, schema version, license status, sensitivity class, transform code revision, policy revision, parent receipt hash, output digest, result state, actor/job ID.

Dataset card shows: records received/accepted/quarantined/redacted, duplicate rate, missing-field rate, source coverage, license coverage, split counts, quality scores, exact dataset revision, training eligibility state.

Training examples derive ONLY from explicitly allow-listed evidence rows. Raw receipts, deployment logs, customer transcripts, and private source text never become training data automatically.

The train/eval split is grouped by source lineage (same document/receipt family → same split). Random row splitting leaks and manufactures false evaluation confidence. The existing blocked admission manifests (receipt-agent promotion blocked; formula-training zero rows; HF source map exact/inferred/divergent/unavailable) are CORRECT behavior — the system refuses to pretend artifacts are ready.

## 8. Lean and the evidence lake (two connected layers)

lutar-lean is the formal proof source; szl-lake is the append-only receipt/evidence lake; szl-trust verifies receipt and payment-context claims around them. The lake stores data and hashes; Lean verifies only what is actually formalized:

Good Lean-linked invariants: hash-chain integrity, deterministic replay, train/eval split disjointness, required provenance fields, policy predicate structure, bounded transformation behavior, promotion-manifest consistency.

Lean must NOT claim a model is intelligent, safe in every setting, commercially successful, or production-ready unless those properties are formally defined and proved. Conjecture 1 (Lambda) remains ADVISORY — it can never authorize execution or promotion. The lake never replaces tenant authorization: A11oy enforces tenant identity, connector authorization, source visibility, retention, deletion, access control, purpose limitation.

### 8.1 Lean reference corpus lane (mathlib) — license-clean only

Owner direction 2026-11-15: ingest the Lean reference corpus (mathlib4, lean4 core, Batteries) into szl-lake as REFERENCE EVIDENCE. Scoping calls (CTO, honest):

- License-clean sources only: mathlib4 and Batteries are Apache-2.0; lean4 core is Apache-2.0. Ingest from their official repositories/releases (current mathlib4 stable: v4.35.0), with per-source license and revision receipts.
- The corpus is REFERENCE EVIDENCE for the trust/proof lanes. It is NEVER automatically training data. Any training use of corpus content requires the standard admission manifest (license check, dedupe, eligibility state).
- NO indiscriminate scraping of copyrighted web content. "Scrape the web for all the Lean" is scoped to: license-clean Lean ecosystem sources with recorded provenance. Anything outside that scope is out-of-bounds by doctrine.

## 9. Training doctrine

Use a higher-precision parent model with QLoRA/PEFT. DO NOT fine-tune the PQ2_0 GGUF directly.

First customer pilot (intentionally small): 100–500 steps; A6000-class 48GB GPU or dedicated HF GPU job; fixed seed; fixed config; pinned tokenizer; pinned base model revision; pinned dataset revision; explicit budget; explicit max sequence length; explicit output-token limit.

The training job emits: training_receipt.json, eval_receipt.json, runtime_probe.json, model_manifest.json, release_receipt.json. Every artifact binds: base model revision, tokenizer revision, dataset revision, training code commit, hyperparameters, seed, hardware, adapter hash, exported model hash, evaluation results, runtime endpoint, promotion decision.

Promotion requires evidence across: grounded answer accuracy, citation fidelity, abstention/refusal correctness, evidence selection, format adherence, leakage and memorization, regression vs base model, runtime health, latency, token use, rollback behavior.

Registry enforces: draft → candidate → promoted → deprecated → revoked. A11oy serves ONLY promoted revisions; a candidate is never reachable through a production route merely because its file exists on Hugging Face. Public Spaces show: source revision, model revision, dataset revision, receipt links, evaluation status, runtime status, limitations, promoted-or-not. Spaces never train or promote inside the public CPU Basic runtime.

## 10. A11oy inference contract

- POST /v1/tenants/{tenant_id}/connectors
- POST /v1/connectors/{connector_id}/sync
- GET /v1/receipts/{receipt_id}
- POST /v1/datasets/{dataset_id}/clean
- POST /v1/training/runs
- GET /v1/training/runs/{run_id}
- POST /v1/models/{model_id}/promote
- POST /v1/inference

Every inference request/response includes: request ID, tenant ID, model revision, policy revision, evidence references, receipt hash, retention state, grounding state, execution state, payment state when applicable.

Prompt and source-text persistence DISABLED by default (explicit customer enablement under a documented policy).

Per-tenant controls: model allow-list, max input size, max output tokens, rate limit, daily budget, concurrent job limit, retention period, connector scopes, allowed deployment targets, deletion behavior.

The public command center stays READ-ONLY (external writes disabled, public effectors empty, auto-remediation disabled, production authorization disabled, human approval required). Customer administration lives in a separate authenticated Python service with tenant scope, approvals, and audit.

## 11. Monetization and settlement

Separate: (1) platform subscription, (2) inference usage, (3) cleaning/training jobs, (4) optional managed deployment/support.

The Cloudflare revenue tracker records request volume/status/latency/traffic class — it does NOT prove settlement. A separate SIGNED settlement ledger records: request ID, tenant, route, network, asset, amount, payer, payee, gateway response, settlement status, transaction hash, settlement timestamp.

Free endpoints: health, readiness, model registry, evidence snapshots, proof registry, connector diagnostics. Charge inference and training only.

x402 sequence (each step proven before the next): (1) prove exact unpaid 402 behavior; (2) parse the exact PAYMENT-REQUIRED value; (3) create one valid signed payment; (4) submit one funded paid request; (5) confirm a successful paid completion; (6) confirm PAYMENT-RESPONSE or equivalent settlement evidence; (7) independently reconcile the transaction; (8) bind the request receipt to the payment receipt; (9) capped design-partner canary; (10) expand routes/pricing only after stable reconciliation. NEVER publish payment prompts as revenue. Current state: challenges returned, revenue zero, confirmed settlements zero, prior x402-v2 base64 mismatch unresolved. The $0.02 challenge may fit a bounded fast route after costs are measured; a higher-cost frontier lane needs a higher price or stricter token cap.

URGENT (time-boxed): Cloudflare Workers AI model deprecations land 2026-11-20 (older catalog entries return HTTP 410 / error 5028 after the window). a11oy PR #3480 (Workers AI migration to deepseek-v4.1-flash and glm-5.3 governed candidates) must be verified to cover every deprecated model ID in use BEFORE that date.

## 12. P0 commercial readiness gates

Before accepting a paying customer's production data, demonstrate: verified credential-to-principal mapping; verified principal-to-tenant mapping; revision-bound source registry; ownership and visibility rules; source ACL enforcement; tenant-isolated temp storage; tenant-isolated retrieval; deletion and backup deletion; secret-scan recall; signed receipt verification; authorization penetration tests; prompt-poisoning tests; fixed provider/model destination; no unsafe provider fallback; customer-specific adapter binding; held-out grounding and abstention evaluation; runtime witness; rollback test; settlement reconciliation.

The current admission manifests and security results correctly show that deployment evidence for several of these gates is still incomplete. That honesty is a feature, not a gap to paper over.

## 13. First commercial version scope

One design partner. One connector family. One tenant-specific adapter. One inference route. One settlement method. A complete measurable case study without cross-tenant risk and without pretending the entire estate is already production-unified.

## 14. Decision card

- Change: direction/spec document only; no code.
- Direction: owner adopted the evidence-to-model platform thesis 2026-11-15 (CTO lane recommendation accepted).
- Risk: strategy, not runtime; the risk is overclaiming — mitigated by the honesty clauses above (no one-of-one claims, blocked manifests stay visible, P0 gates listed as NOT YET DEMONSTRATED).
- Merge: owner-gated.
