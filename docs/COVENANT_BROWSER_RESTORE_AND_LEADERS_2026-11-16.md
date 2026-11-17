# Covenant browser restore: source repair and frontier architecture (2026-11-16)

**Status:** source-level candidate, not a production authorization. The new guard verifies local integrity before browser-restored memory is loaded. The platform continues to label production HOLD.

## Observed gap on base a0f7fe3

The browser's Zustand-persisted store (`src/stores/orchestrator.ts`) previously loaded `memories`, `receipts` and `genesisHash` into a new `CovenantEngine` and set `ready=true` without calling `verifyReceiptChain`. The Memory UI could therefore display restored records from a locally modified snapshot while showing an initialized software plane. This is a *source observation*, not proof of a live exploitation or remotely exposed endpoint.

The fixed restore path waits for persistence hydration; recomputes the expected genesis rather than trusting a persisted replacement; checks receipt sequence, predecessor links and body hashes; checks memory content SHA-256, creation receipt membership, duplicate handles, and non-returnability after a recorded quarantine/tombstone; and refuses an invalid restore. Failed restoration leaves browser evidence in persistent storage; the shell hides the interactive workspaces and presents a specific BLOCKED reason. Direct writes and searches require ready plus local integrity verified. New first-run seeding remains available for an actually empty local state, with no claim of external authenticity.

The verifier is **LOCAL_CHAIN_VERIFIED**, not SIGNED, AUTHENTICATED or PRODUCTION_READY. An attacker controlling browser storage could coherently replace an unsigned receipt chain and its memory; an integrity hash is not a digital signature. Some authority fields, including all lifecycle transitions not represented by the legacy receipt schema, cannot be independently reconstructed. Do not use browser state as a trusted enterprise ledger.

## Leadership study and design adaptation

- **Palantir Foundry/AIP/Apollo:** distinguish operational objects/links, authorized Actions, governed agent reasoning, and deployment. Adopt the object/action separation for the SZL ontology; do not confuse a dashboard visualization with an authoritative action or real deployment. Sources: https://www.palantir.com/docs/foundry/architecture-center/platforms and https://www.palantir.com/docs/foundry/object-backend/overview and https://www.palantir.com/devcon/
- **LangGraph:** durable execution, resumability, human-interrupt points, explicit persisted graph state. Build an idempotent operation journal and crash/replay tests before connecting long-running agent memory to external effects. Source: https://github.com/langchain-ai/langgraph
- **NVIDIA:** NeMo Agent Toolkit is deprecated as of October 2026; target NeMo Relay (observability/governance), Helix (evaluation/optimization), and Fabric (harness execution) rather than creating a new Agent Toolkit dependency. Source: https://docs.nvidia.com/nemo/agent-toolkit/1.9/resources/migration-guide.html
- **OpenTelemetry:** instrument spans for durable operations and emissions, not raw secret-bearing prompts by default. The GenAI conventions have moved to their own repository. Source: https://opentelemetry.io/docs/specs/semconv/
- **Research controls:** the September 2026 preprint `Agent Memory Is a Surface for Endogenous Authorization Laundering` suggests memory-written permissions need valid source events and bounded event-sourcing. `Agent Zero Memory` proposes time-ordered events, entity-event graph and citation-locked documentary retrieval. These are proposals/author-reported results, not independently reproduced by this patch. Sources: https://arxiv.org/abs/2609.01836 and https://arxiv.org/abs/2608.29606
- **Practical demos:** the Palantir developer's OSDK React app walkthrough and the enterprise agent-operating-system presentation illustrate object-backed front-end/agent execution boundaries. Sources: https://www.youtube.com/watch?v=vSJ5H00V7Es and https://www.youtube.com/watch?v=SePXznjZ-1A

## Proposed differentiated product: Proof-Carrying Operational Ontology

Define independently versioned `Object` (identity, tenant, source lineage), `Link` (typed relation), `ActionIntent` (principal, requested effect), `PolicyDecision` (deny/review/allow with exact policy digest), `EffectReceipt` (committed external effect), and `WitnessSet` (trusted, distinct failure domains). Every operator-facing panel, search answer and automation references one or more such objects via stable identifiers. A read-only scenario simulator shows counterfactual effects without executing them; only an authorized action dispatcher can commit a change.

The novel differentiator to test is a **counterfactual authorization certificate**: for each proposed action, record the evidence and policy that permit it, enumerate the smallest missing evidence that would force ABSTAIN/DENY, and produce a versioned replayable explanation of why the outcome would change. Compare its correctness, cost and latency against a standard rule engine on blinded fixtures; do not claim mathematical novelty or superiority until measured.

## Production architecture and non-negotiable gates

Browser UI -> authenticated API -> tenant-bound ontology query/action layer -> durable state machine -> policy/adjudication -> current witness-backed receipt verifier -> effect commit -> append-only receipt store -> live telemetry/evaluation. The UI must fetch server-authoritative projections; browser localStorage cannot serve as the sole memory authority. Frontend status fields must distinguish `SOURCE_PRESENT`, `TESTED`, `HOSTED`, `WITNESSED`, and `PRODUCTION_AUTHORIZED` without inferring a stronger state.

Next acceptance milestones: (1) merge this bounded browser guard only after native CI and independent review; (2) integrate a current witnessed recall path into the server API with immutable tenant/session/root/size/time/policy context; (3) replace localStorage as authority with durable, serializable multi-writer transactions and append-only effects; (4) connect Hatun, Second Brain, live Anatomy and telemetry through a governed ontology, with evidence freshness and broken-link indicators; (5) exercise denial, revocation, crash, retry, cross-tenant, key rollover and recovery on the deployed target. Do not bypass branch review, sign with fixture keys, edit historic receipts or turn missing evidence into green.

**Not included:** deployment, API authorization, independent witness operators, provider-side monetization settlement, fully wired Hatun/Anatomy, production key provisioning, or a formal refinement proof from Lean to deployed JavaScript. Those are explicit downstream gaps, not completed work.
