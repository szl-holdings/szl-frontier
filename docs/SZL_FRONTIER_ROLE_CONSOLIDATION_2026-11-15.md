# SZL Frontier: Role and Consolidation Decision (2026-11-15)

SPDX-License-Identifier: Apache-2.0

## Question on record

Owner question (2026-11-15): should szl-frontier be wired up as its own Cloudflare Worker and inference service, and can it consolidate with the governed-inference edge?

## Decision

NO dedicated szl-frontier Cloudflare Worker. NO szl-frontier-local inference service. szl-frontier consolidates INTO the platform by CONSUMING the canonical layers. This follows the direction of record (docs/A11OY_EVIDENCE_TO_MODEL_PLATFORM_2026-11-15.md, section 2): one component per layer, no duplicates, DO NOT create a third duplicate edge or Space.

## Canonical consumption map (szl-frontier is a consumer, not a layer)

| Need | Canonical component |
| --- | --- |
| Edge, API routing, telemetry, payment | a-11-oy.com Cloudflare edge (governed-inference worker, monetization gateway, revenue tracker) |
| Production inference, x402 entry | Salad-backed inference gateway (inference.a-11-oy.com) via szl-router |
| Bounded proposal-only inference | a-11-oy.com/api/v2/governed-infer (Workers AI candidates) |
| Router status surface | SZLHOLDINGS/llm-router-live |
| Product shell | SZLHOLDINGS/a11oy |

szl-frontier (repo and Space) remains the frontier WORKSPACE: research, docs, covenant spec, frontier-wave receipts, watch verdicts. Its web surface may LINK the canonical endpoints; it must not duplicate an edge, a router, an inference runtime, or a payment rail.

## Why (measured 2026-11-15)

- The estate edge is single and green: a-11-oy.com 200; /api/v2/governed-health READY at ab3eb949 with @cf/zai-org/glm-5.3 serving; OPTIONS preflight 204. A second worker would double drift surface 3 (worker revision different from protected GitHub source) and split payment and telemetry state across two edges.
- Inference is already canonical at the Salad gateway plus szl-router plus Workers AI candidates; a parallel szl-frontier inference service would duplicate two layers at once.
- The two-Spaces rule (direction of record section 2) extends to any third edge.

## Allowed next steps (presentation only, when the owner says go)

The szl-frontier web surface may add read-only cards linking /api/v2/governed-health, the router status Space, and frontier receipt feeds. Zero new runtime layers.
