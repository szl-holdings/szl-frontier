# szl-frontier domain leader study r1 (propose-only)

Date: 2026-11-23. Method: web-verified leader landscape + governing-seat synthesis (Kimi nonce T3-SZL-FRONTIER-BRIEF). This card is documentation only; it changes no code, CI, config, or existing PR status. All absorb actions are FUTURE PROPOSALS (non-authorizing); implementation and merges remain separately reviewed and gated.

## Domain: governed agent memory plane (deny-by-default Memory Covenant)

## Leaders studied (web-verified 2026-11-23)

1. MemGPT: Towards LLMs as Operating Systems (https://arxiv.org/abs/2310.08560) — OS-style memory paging between main and external context tiers for long-horizon agents; moat is explicit tiered-context management rather than an unbounded prompt.
2. Zep Graphiti (https://github.com/getzep/graphiti) — real-time temporal knowledge graphs with bi-temporal validity (event time vs ingestion time) and incremental entity/edge extraction; moat is time-aware graph memory that can distinguish when something happened from when it was learned.
3. Model Context Protocol (https://github.com/modelcontextprotocol/modelcontextprotocol) — an open standard binding agents to tools, resources, and prompts with capability-scoped access; moat is interoperable, capability-scoped context and tool connectivity.

## Absorb actions (FUTURE PROPOSALS, non-authorizing)

1. (MemGPT) Propose a documentation-only comparison of Memory Covenant v0.3 tiers with MemGPT-style main/external context paging, identifying where deny-by-default gateway checks and human approval would bound any future paging design. No paging implementation, retention change, or long-horizon capability claim is authorized; the in-process Memory Gateway remains the LIVE boundary.
2. (Zep Graphiti) Propose a future schema study for optional event-time and ingestion-time fields on memory records and receipts, with explicit handling for corrections and conflicting validity intervals. This is unmeasured until a live run, admits no private-graph nodes to gradients, and does not replace the LIVE SHA-256 receipt chain or software-enforced cross-tenant isolation.
3. (Model Context Protocol) Propose a future capability-scoped connector mapping in which every tool, resource, or prompt binding passes through the Memory Gateway, preserves tenant gates, and requires bounded human approval where applicable. Recon, foreign-write, and weaponize remain hard denies that approval cannot lift; Shadowbroker remains a simulated read-only connector with no packets, and any binding would add no execution authority.

## Do not do (per governing seat)

Do not merge, bypass the signature wall, or claim implementation beyond this card.
