# Competitive landscape — memory-operation receipts (2026-11-14)

**Scope.** Weekly competitive watch for the Memory Covenant, recorded as a dated
public-source observation set. Every claim below carries its public link and the
date the signal was published or observed. This is **observation, not
verification**: no competitor internals, benchmarks, or shipping states were
independently tested. Nothing here authorizes a release or changes the
production HOLD.

**Standing thesis under watch.** The accuracy argument in agent memory is
converging (multiple vendors now publish overlapping accuracy/latency claims,
several of which do not reproduce under independent harnesses), while
auditability of memory operations remains unserved. The competitive question is
not *which memory layer is most accurate* but *whose memory operations can be
proven after the fact*.

## 1. Tracked platforms — receipt-like capability: none shipped

| Platform | Latest public signal (dated) | Class | Receipt-like? |
|---|---|---|---|
| Mem0 | Governance guides position audit trails as **external** (AxonFlow/Strac) alongside Mem0; own governance library post admits no finished governance feature ([guide](https://mem0.ai/guide/closing-enterprise-deals-governance-platforms-audit-trails-ai-memory), [library post](https://mem0.ai/library/agent-memory/ai-agent-memory-governance-meaning-best-practices-for-secure-memory), Jul–Sep 2026). OSS v3 fix so vector-rejected writes are not logged as ADD events ([changelog](https://docs.mem0.ai/changelog/sdk), 2026-09-25). | Paperwork-compliance | **No** — history log + SOC 2, no cryptographic receipt |
| Zep | Memory MCP Server with SSO-bound identity and audited, policy-governed access ([blog](https://www.getzep.com/blog/agent-memory-mcp/), 2026-08-19); type hierarchies GA ([changelog](https://help.getzep.com/changelog/2026/11/10), 2026-11-10). | Access governance | **No** — audit of access, not tamper-evidence of memory ops |
| Letta | FrontierMemory continual-learning benchmark ([research](https://www.letta.com/research/), Oct 2026); git-backed Context Repositories (Feb 2026); governance-hooks feature request closed unimplemented ([issue](https://github.com/letta-ai/letta/issues/3410)). | Accuracy-first | **No** — git versioning is not a signed receipt chain |
| LangMem | Still pre-1.0 (0.0.30, Oct 2025); third-party harness measured 3.26M tokens/query on LongMemEval ([VentureBeat](https://venturebeat.com/orchestration/new-agentic-memory-framework-uses-118k-tokens-per-query-langmem-burns-through-3-26m), 2026-06-26). | Accuracy-first | **No** |
| Cognee | 1.0 open-source memory platform, Postgres-only, open eval code ([announcement](https://www.cognee.ai/cognee-1-0-announcement), 2026-06-26; [$7.5M seed](https://www.cognee.ai/cognee-raises-seven-million-five-hundred-thousand-dollars-seed), 2026-02-19). | Accuracy-first | **No** |
| New entrants | Databricks Agent Memory, Beta ([blog](https://www.databricks.com/blog/introducing-agent-memory-databricks), 2026-10-20); PhoenixAI Contextbase ([press](https://www.hpcwire.com/bigdatawire/this-just-in/phoenixai-introduces-contextbase-for-ai-agent-memory-and-knowledge/), 2026-11-05); hyperscaler wave — AWS AgentCore Memory GA, Cloudflare Agent Memory, MS Foundry ([landscape](https://turion.ai/blog/agent-memory-infrastructure-battleground-2026/)). Supermemory gates memory *writes* behind client approval ([changelog](https://supermemory.ai/changelog/), 2026-11-06). | Accuracy / distribution | **No** — write-gating instinct at Supermemory, no cryptography |

Third-party corroboration: the Major Labs *State of Agent Memory* report (June
2026) read six systems firsthand and found **0/6 sign memory or make it
verifiable** ([report](https://majorlabs.co/reports/state-of-agent-memory)).
Vendor accuracy claims fall 25–37 points under an independent harness
([analysis](https://genalphai.com/agent-memory-2026-engram-cloudflare-foundry-mem0-compared/)).

## 2. Receipt-adjacent movers — flagged for weekly watch

None of these is a memory platform receipting memory operations. All of them
are converging on the Covenant's vocabulary and must be watched weekly.

| Mover | What it actually does | Gap vs Covenant invariant |
|---|---|---|
| **Armalo AI — "Memory Attestation"** (closest Covenant-adjacent language observed; Apr 2026) | Cryptographically signed, timestamped records of **agent behavioral history**, W3C VC 2.0 / Ed25519, EAS on-chain anchoring, attestation registry, selective disclosure ([paper](https://trust.armalo.ai/labs/research/2026-04-10-cortex-memory-attestation-temporal-trust), [guide](https://trust.armalo.ai/blog/agent-memory-attestations-verification-guide)). Retracted earlier market-impact claims. | Attests **task outcomes about agents**, not memory writes/recalls; after-the-fact attestation, not deny-by-default policy evaluation inside the receipt boundary. UNKNOWN: shipping status. |
| **IETF Internet-Draft "The Agent Record"** (2026-08-12) | Witness-countersigned append-only event logs, signed Merkle tree heads (RFC 6962 construction), explicitly covering **memory integrity** ([draft](https://www.ietf.org/archive/id/draft-maintainer-1f916-agent-record-01.html)). | Spec-level, informational status; no memory platform implements it today. The witness-countersign pattern is future work for our chain. |
| **Agent Manifest v0.2** (agentrust-io) | Signed, tamper-evident agent identity primitive binding a **memory baseline** and audit-chain root ([spec](https://manifest.agentrust-io.com/spec/agent-manifest-v0.2/)). | Identity/config attestation at launch; not per-operation memory receipts. |
| Research: NovaFabric ([arXiv 2609.12582](https://arxiv.org/abs/2609.12582v1), Sep 2026), Agent Flight Recorder with on-chain anchoring ([arXiv 2609.01931](https://arxiv.org/abs/2609.01931v1)), Portable Agent Memory protocol with Merkle-DAG provenance ([arXiv 2605.11032](https://arxiv.org/abs/2605.11032), May 2026) | Tamper-evident agent-run evidence and cryptographically verified memory *transfer*. | Run-level and transfer-level, not operation-level governed memory. |

## 3. Covenant differentiation (honest)

The Memory Covenant invariant remains unique among everything observed:
**no memory enters or leaves an agent context without identity, purpose, policy
evaluation, provenance, lifecycle, and a sealed receipt**, with default effect
deny and hard denies that approval cannot lift.

Compared with the movers above:

1. **Operation-level vs entity-level.** Armalo attests an agent's behavioral
   history; the Covenant seals each memory write/recall/ingest with its policy
   evaluation and provenance. The unit of audit is the memory operation.
2. **Deny-by-default vs attest-after.** Attestation certifies what already
   happened. The Covenant evaluates policy *before* the operation and hard-denies
   recon, foreign-write, and weaponize regardless of approval.
3. **Honest limits, stated.** The Covenant's SHA-256 receipt chain is LIVE as
   **software release gates** (24/24), not Lean proofs; Λ remains Conjecture 1;
   lifecycle is EVALUATION under a production HOLD; no FedRAMP/ATO is claimed.
   Witness countersigning (the pattern the IETF draft and Agent Flight Recorder
   demonstrate) is not yet implemented in our chain and is disclosed as open.

## 4. Watch actions going forward

- Track **Armalo** weekly: it is the only observed actor publicly using
  Covenant-adjacent language (signed, third-party-verifiable memory claims).
- Track the **IETF Agent Record draft** for revisions and adopter lists.
- Re-check the six tracked platforms for any receipt-like, signature, or
  transparency-log feature; flag prominently the week one ships.
- Re-verify this document's links before citing it in any external material;
  competitor pages change without notice.
