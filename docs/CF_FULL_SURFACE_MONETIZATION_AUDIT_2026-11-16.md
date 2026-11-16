# Cloudflare Full-Surface Monetization Audit — 2026-11-16

Owner order (2026-11-16 ~01:15Z): "workers audit all the models all github org szl-holdings all pypi.org can all be workers monetizing what do you recommend get all the analytics from cloudflare I want every piece of cloudflare leveraged each tab needs to be fully wired up see the vision and push the frontier."

## 1. Measured baseline (all receipts on laptop, szlw_* files, pulled 01:20-01:23Z)

Cloudflare (authed dash, same-origin /api/v4 + GraphQL):
- Zones: a-11-oy.com (active), a11oy.net (active). szlholdings.si zone DELETED 01:20Z per owner order (was pending, never registered). szlholdings.com zone deleted earlier the same night per owner order (23-record content preserved verbatim in the estate ledger ~01:00Z entry).
- 30-day zone analytics (Oct 17 - Nov 16, httpRequests1dGroups): a-11-oy.com: 1,711,677 requests, 11.71 GB served, 794 MB cache hits, 8,178 threats blocked, 186,778 page views, peak day 2026-11-13 (491,981 requests). a11oy.net: 335,487 requests, 7.59 GB, 175 MB cached, 10,557 threats, 159,754 page views, peak 50,925 (same day).
- Workers inventory (8 live): szl-a11oy-governed-inference (route a-11-oy.com/api/v2, 23 req), curation-atlas (atlas.a-11-oy.com, from repo szl-holdings/curation-atlas), szl-revenue-tracker (a-11-oy.com/api/a11oy/v1 + 2 routes, 38.8k req), szl-a11oy-product-edge-v4 (www.a-11-oy.com + 1, 77.6k req), szl-alert-relay (ntfy.a11oy.net, 99), szl-agents-studio-store (agents-store.a-11-oy.com, 12), szl-evidence-snapshot (api.a-11-oy.com/v1/evidence-snapshot, 5), szl-email-sender (stephenlutar2.workers.dev).
- Workers usage this billing period: 200.57k / 10M requests; 523.5k / 30M ms CPU; observability 14.7k / 20M events; build minutes 17 / 6k. Estate is at ~2% of included capacity.

GitHub org szl-holdings: 165 repos (census 01:22Z, gh api paginate).
Hugging Face org SZLHOLDINGS: 100+ models (API page cap). Organic pull measured: SZL-Khipu-1.5B-GGUF 3,916 downloads; SZL-Khipu-1.5B 1,964; szl-receiptagent-qwen35-0.8b-v2-merged 862; A11OY-MINI 735; SZL-AncientMath-0.8B-v1 634; SZL-FreeEnergy-0.8B-v1 601; SZL-AcousticGovernance-0.8B-v1 588. 22 Spaces (18 docker, 4 static/gradio).
PyPI: 46 active projects, all released Nov 15, 2026 (szl-os, hatun-mcp, szl-kernel-attest, szl-lyte-enterprise, szl-re, szl-frontier-control-plane, szl-drift, szl-atelier, szl-provctl, szl-formulas, szl-trust, quant-curve, ...).

Existing monetization rail (measured): x402 wall live on inference.a-11-oy.com (exact challenge, eip155:8453, 20000 micro-USDC = 0.02 USDC per call, payTo 0x7b133ef996852c223379d6d1245430300970291A, 3600s validity, full CORS on the 402; browser-preflight OPTIONS 402 is a monetization-gateway-level limitation, not worker-fixable). /api/v2 Workers AI serving glm-5.3 with fallback chain. Revenue-tracker worker already carries 38.8k requests.

## 2. Verdict — what "can all be workers monetizing" honestly means

NO to "everything becomes a worker"; YES to "everything routes through the estate's single Cloudflare monetization surface":
- One component per layer (direction of record, PR #323): per-asset workers would double the drift surface and split payment state. 165 repos do not become 165 workers; 100 models do not become 100 workers.
- The monetizing surface is ALREADY BUILT: CF edge (a-11-oy.com) -> x402 wall (per-call USDC on Base) -> inference (Salad gateway + Workers AI /api/v2) -> receipts (revenue-tracker + hash-chained DSSE).
- Contribution per asset class:
  - MODELS monetize as catalog entries behind the x402 wall. Strongest concrete move: upload the estate 0.8B SFT class (AncientMath, FreeEnergy, AcousticGovernance, Reasoning, GovernedDistill) as Workers AI LoRA fine-tunes -> served at the edge, per-call x402. The 1.5B-4B class stays on Salad (GPU) behind the same wall. Organic demand is measured, not assumed.
  - GITHUB REPOS: only service-bearing repos get a worker (pattern proven twice: curation-atlas and governed-inference each deploy from their repo). Codify into szl-repo-template: any repo exposing an HTTP service ships the standard Actions deploy workflow (protected main + CF secrets — the ONLY deploy path; no local CF tokens exist on the estate).
  - PYPI (46 projects): PyPI is free top-of-funnel and stays free (ecosystem norms + Apache-2.0). Monetize what the packages POWER: hatun-mcp (governed MCP gateway, policy gate on every tool call, DSSE receipt on every result — submitted to Glama) exposed as a PAID hosted endpoint via Cloudflare MCP Portals.

## 3. Cloudflare tab-by-tab leverage map ("each tab fully wired")

ADOPT NOW (revenue + analytics):
- Workers & Pages — 8 live; new workers only via the template lane.
- AI Gateway — front ALL model calls (/api/v2 + Salad gateway): unified analytics, caching, rate limiting, cost tracking. This is the direct answer to "get all the analytics": per-model, per-customer, per-token.
- Workers AI — glm-5.3 fallback chain (live) + LoRA uploads of the 0.8B estate class (new revenue SKU: governed micro-models at the edge).
- Analytics Engine — revenue-tracker writes per-call revenue events -> dash-native revenue dashboards.
- Web Analytics — enable on a-11-oy.com + a11oy.net product pages (free, privacy-first).
- R2 — host public model artifacts (GGUF mirrors; the Khipu GGUF alone has 3,916 measured downloads) with zero-egress cached distribution; evidence-snapshot archives.
- Turnstile — bot protection on every 402-walled endpoint + product forms.
- MCP Portals (beta) — hatun-mcp as a hosted governed MCP portal: CF-native discovery + Access + x402 per tool call.
- Access (Zero Trust) — gate internal workers (agents-store, evidence-snapshot, admin surfaces) with CF Access policies instead of ad-hoc keys.
- Email Routing + Email Sending — wire szl-alert-relay / szl-email-sender to estate addresses on a11oy.net (alerts + receipts by mail).

ADOPT WHEN THE LANE OPENS:
- Queues / Workflows — async training-job receipt ingestion (Salad lane already emits chain receipts).
- Containers (beta) — only for components that cannot run in Workers; one container maximum per doctrine.
- Vectorize / AI Search — retrieval-bench + frontier-bench corpora as embeddable, x402-gated retrieval endpoints.
- Durable Objects — receipt-chain hot state for the 402 wall (a11oy #3489 x402 lane territory — coordinate, never duplicate).
- KV — edge config / catalog cache.
- Workers for Platforms (beta) — strategic: resell governed compute on our rail; watch until revenue proves demand.
- Hyperdrive — only when an estate service fronts external Postgres.

DELIBERATELY SKIP (no revenue today, adds drift or cost):
- Spectrum, Argo, Load Balancing (single-zone estate; CF anycast suffices), Zaraz (server-rendered pages), RealtimeKit/TURN/Serverless SFU (no realtime product), Stream/Images (no media product), DLP + Cloud Workload Security (no multi-tenant SaaS yet), Data Localization Suite, Logs/Logpush (observability is 14.7k/20M events; revisit at scale).

## 4. Ranked build list

1. AI Gateway in front of /api/v2 + inference — analytics on every model call (Actions-deployable; dash config minimal).
2. Workers AI LoRA upload: estate 0.8B SFT class -> per-call x402 (new revenue SKU).
3. hatun-mcp on CF MCP Portal + x402 per tool call (PyPI stays free; coordinate with Glama approval).
4. Analytics Engine revenue events from szl-revenue-tracker + a Revenue dashboard.
5. R2 public artifact bucket for GGUF mirrors (measured organic demand) + cached distribution.
6. Turnstile on 402-walled endpoints.
7. Web Analytics on product pages.
8. Standard worker lane in szl-repo-template (service-bearing repos only).

## 5. Owner-gated (dash-only; recorded, not asked)

- Monetization-gateway OPTIONS/preflight fix (browser preflight blocks at the gateway, before the worker).
- x402 Bazaar advertisement (a11oy #3489 lane).
- Any paid-plan upgrades (Workers Paid 10M-request allowance already carries the estate at ~2% utilization).

Ops receipts: laptop C:/SZL/edge-debug/ szlw_postsweep, szlw_sidom1-3, szlw_siflip_watch (killed; .si direction retired), szlw_cdpev + szlw_expr, szlw_census1; dash analytics pulled 01:20-01:23Z via same-origin proxy.
