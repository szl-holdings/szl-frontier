# Counterfactual authorization: first wired API/UI slice

**Candidate date:** 2026-11-17 UTC. **Disposition:** source + local tests only until hosted CI and review. **Production:** HOLD.

## Why this exists

The prior browser-oriented controlled action adapter accepted an operator-approved bounded action without a cycle object: `evaluateAction({ kind: "collect-observation", purpose: "action-execute", approval: "approved" })` returned `allowed: true` despite absent/UNAVAILABLE organ-cycle evidence. The Actions page disabled approval only for explicit DENY, so its button remained enabled when the cycle was missing. This violated the intended Lutar fail-closed rule. The baseline regression reproduced `true !== false` before changing product code.

The repaired decision sequence is: unknown kind or hard-deny => DENY; forbidden purpose => DENY; explicit cycle DENY => DENY; missing human approval => DENY; missing or UNAVAILABLE cycle ALLOW => DENY; otherwise bounded *software-only* action may proceed. The g17 synthetic positive control now explicitly provides ALLOW instead of silently using a missing cycle. No theorem about real-world authorization follows.

## New end-to-end read-only interface

- UI: `/actions` contains a counterfactual analysis panel. Users may vary a permitted action kind, hypothetical approval and hypothetical cycle paint. The panel POSTs to `/api/action-preview`.
- Server: `src/routes/api/action-preview.ts` requires same-site request isolation and server-resolved user identity, accepts only a byte-bounded JSON schema, and passes the exact fields to the existing `evaluateAction` policy. The caller cannot provide a user/tenant identifier, policy class, execution authority or production readiness flag. The server returns no-store, non-authorizing headers.
- Decision: `src/lib/actions/counterfactual.ts` computes a conservative baseline using no verified approval and UNAVAILABLE organ evidence, and separately computes a hypothetical software decision. Its reported blockers are the minimal software inputs **within this limited policy adapter only**; they are not proof of the minimal globally sufficient authorization set.
- Evidence: it SHA-256 hashes the report for unkeyed integrity and hashes the server-resolved user ID to avoid echoing the raw ID. Neither hash authenticates the result or represents a witness signature.
- All output always records `executionAuthorized=false`, `effectCommitted=false`, `witnessVerified=false`, `productionReady=false`, and explicit production blockers. There is no action effect, storage mutation, recall of private content, or payment settlement.

## Doctrine and regression gates

Formalized *candidate software invariant*:

`bounded_software_allow => (operator_approved ∧ organ_paint == ALLOW)`

Hard denial is absorbing for every tested hypothetical change of approval and cycle paint. The Lutar Lean theorem models its own transition semantics; this software test does not establish refinement between these TypeScript functions and Lean. Unavailable and unmeasured evidence are never silently elevated to PASS.

Validation uses positive, missing-context, malformed schema, hard-deny, distinct blocker and report-hash tests, plus the existing complete TypeScript/gate/browser suite. The POST server path is an honest developer/preview analysis interface; it is **not** a production operation grant. An on-host development or CI smoke should further validate HTTP 200/400/415/413/401/503 contract responses in an environment with genuine session enforcement; pure unit tests alone do not prove the HTTP route.

## Next architectural increments

1. **True witness-backed recall:** the actual Frontier recall path must use current Khipu v2 STH verification with a trusted registry, receipt population, tenant/session/root/size/time/TTL/policy binding, and negative tests. Eligibility cannot authorize execution by itself. Do not port crypto ad hoc into the UI.
2. **Durable server authority:** move actual memory/effect authority out of Zustand localStorage. Use an authenticated, tenant-isolated transactional ledger with idempotent request IDs, append-only receipts, crash/retry proof, deterministic replay and recovery tests. No single-instance FIFO can qualify multi-writer production.
3. **Ontology objects:** represent `Entity`, `Link`, `ActionIntent`, `PolicyDecision`, `EffectReceipt`, `EvidenceHandle`, `WitnessSet` as versioned, tenant-scoped objects. Hatun, Anatomy, Second Brain and telemetry must cite the same authoritative IDs rather than incompatible local indexes.
4. **Operational evidence:** acquire independent live witness operators, deployment/auth/TLS/SLO readback, review/rollback, and a measured end-to-end authorized positive control plus fail-closed negative controls.
5. **Measurement:** benchmark proof overhead, p95 response latency, false authorization rate, crash replay correctness and developer-comprehensible counterfactual explanations versus simple rule-engine baselines. No superiority or novelty claim without these results.

Current relevant review sources: Palantir Foundry/AIP Ontology Actions and Apollo; LangGraph durable execution; OpenTelemetry GenAI semantic conventions; NVIDIA's NeMo Relay/Helix/Fabric migration. See the source-cited architecture comparison in `docs/COVENANT_BROWSER_RESTORE_AND_LEADERS_2026-11-16.md`.

All further effects remain gated by the existing protected review and live-deployment evidence. Nothing here changes secrets, witness keys, DNS, production privileges, branch rules, payment rules, or model weights.
