# Memory Covenant implementation readback — 2026-11-16

## Verdict

**Tested component repairs are published; integrated production qualification remains HOLD.**

The candidates below have executable tests and source identities. Their PRs
remain separate from admission, deployment and integration into one
witness-backed Frontier runtime. A proof of a defined policy model and a
synthetic signed-receipt test establish different claims.

## Published repairs and observed verification

All five code candidates below were open and unmerged when this readback was
prepared. Test populations are separate and must not be added together as if
they were one independent verification score.

| Candidate | Exact source | Implemented behavior | Observed bounded validation |
| --- | --- | --- | --- |
| [Frontier policy #335](https://github.com/szl-holdings/szl-frontier/pull/335) | [8b715cf](https://github.com/szl-holdings/szl-frontier/commit/8b715cf576bc35d96c72c8fd3f2ecffcb9a98b6c) | Immutable canonical policy snapshot; each operation evaluates and receipts one captured policy; malformed matcher containers are rejected. Explicit replacement applies at the next operation boundary. | 12 regression methods with subcases and T1–T13 pass on the committed head. The initial ownership defect and the later callback/matcher defects were reproduced before their repairs. Native CI includes both suites. |
| [Frontier receipt ordering #337](https://github.com/szl-holdings/szl-frontier/pull/337) | [d28c79e2](https://github.com/szl-holdings/szl-frontier/commit/d28c79e2e95eb963119697e2ef784ff92d140969) | Complete API operations serialize; staged state and receipts publish together; rejected seals roll back; inputs, results, loaded data and snapshots are owned copies. | 235 TypeScript tests and all 24 governance gates pass. Typecheck and native browser checks pass. Local validation used the raw commit; hosted verification used PR merge ffd5e4c3848751c879cb7b49efa5f5f9e71149f8. |
| [Lean proof guard #362](https://github.com/szl-holdings/lutar-lean/pull/362) | [ec37e321](https://github.com/szl-holdings/lutar-lean/commit/ec37e321ce97e5e94d6de849f99ea33b5defebd6) | All 12 public theorem types and empty transitive axiom sets are enforced, with seven direct semantic controls and isolated mutation checks. A receipt binds fresh source, toolchain, native exits and logs. | Exact-head local receipt PASS: clean source passes, custom axiom/admit/default-release mutants are rejected by the guard, and a hard-deny lift fails source compilation. Eleven receipt failure/drift tests pass. The whole-library hosted gate is tracked separately on the PR. |
| [Crosscheck comparator #32](https://github.com/szl-holdings/szl-crosscheck/pull/32) | [ec7443a](https://github.com/szl-holdings/szl-crosscheck/commit/ec7443a5cda273e2fd4728448d9dad37695eec60) | Independent iterative RFC6962-style root computation and exact comparison of both complete chains, observed root and caller-owned expected root. Bounded malformed inputs cannot yield CONSISTENT. | 239 package tests pass; native Python 3.11/3.12 jobs pass. Separate recursive/iterative comparisons cover 73 tree sizes, including uneven trees and 4,096 leaves. |
| [Eclipse v2 evidence #30](https://github.com/szl-holdings/szl-eclipse/pull/30) | [code 4ef0c70](https://github.com/szl-holdings/szl-eclipse/commit/4ef0c70c4ee2e49185e240b070338fe67a9463ac), [archive de57b16](https://github.com/szl-holdings/szl-eclipse/commit/de57b16ed371ab019daafb7965bc7f0b3b632ced) | Clean explicit source pins, actual source compilation, before/after identity checks, complete named control manifests, typed mutation observations and strict report freshness/claim-boundary checks. | 221 package/evidence tests pass. Fresh local battery: 39/39 directed controls and 10/10 mutation classes, with valid positive baselines. The separate [Linux cross-repository job](https://github.com/szl-holdings/szl-eclipse/actions/runs/43979537869/job/133692119553) also passed. |

Current native check results and review status belong to each linked PR and its
exact head/base. A new source revision needs new validation. No passing
component result is an approval or a deployment receipt.

## Fresh evidence and source identity

The [archived report](https://github.com/szl-holdings/szl-eclipse/blob/de57b16ed371ab019daafb7965bc7f0b3b632ced/evidence/2026-11-16/covenant-v2-source-pinned-report-20261116.json)
was generated on Windows at 2026-11-16T23:24:23.862863Z. It binds eleven loaded
source files to these executed commits:

| Repository | Executed commit |
| --- | --- |
| khipu-consensus | a5ccc9574dd921dd001bcf4ddd8eef785ccab11c |
| szl-eclipse | 4ef0c70c4ee2e49185e240b070338fe67a9463ac |
| szl-crosscheck | ec7443a5cda273e2fd4728448d9dad37695eec60 |

The archive commit follows the executed code commit; it is not silently
substituted as the tested identity. The Linux workflow records its own actual
workflow commit and generates a separate artifact. It runs on PR/manual
invocation, with sibling clean checkouts and explicit dependency pins.

The archived file SHA256 is
`1cafc5b4dcf67f80e270ae60845b5844139577714e66e49a43bb4682d31dfdf7`.
Its canonical report SHA256 is
`5109066a025589a032becb7d16015ced2be2d0558f476fb6690624215d7b0f17`.
These unkeyed hashes identify contents; they do not authenticate a report.

The battery requires positive STH, recall, three-of-four, proof, freshness and
comparison controls. Omitted controls, changed expected booleans, contradictory
mutation observations, dirty or mismatched source, and promoted readiness or
authorization flags cannot be accepted merely by recalculating a report hash.
The caller must select trusted source pins and an explicit report-age policy,
bounded to 24 hours. After that window, the archived report remains historical
evidence; a current claim requires a fresh run.

## Existing component boundaries

The merged [DenyMonotonic model](https://github.com/szl-holdings/lutar-lean/blob/5e8a92917d2d4bfeb371a2372f87a4c7660d996d/Lutar/Covenant/DenyMonotonic.lean)
models approval transitions and hard-deny absorption. The new guard enforces
those declarations; neither establishes a refinement proof to deployed code
or classifies real-world requests.

Current Khipu [STH v2](https://github.com/szl-holdings/khipu-consensus/blob/a5ccc9574dd921dd001bcf4ddd8eef785ccab11c/python/khipu_consensus/sth.py)
and [receipt-tree eligibility](https://github.com/szl-holdings/khipu-consensus/blob/a5ccc9574dd921dd001bcf4ddd8eef785ccab11c/python/khipu_consensus/receipt_tree.py)
provide versioned signed-header checks, distinct-key quorum checks, inclusion
evidence and explicit scope/time/hard-deny context. Eligibility retains
execution_authorized=false and policy_authorized=false. Synthetic distinct
keys in one process do not establish distinct operators, hosts or failure
domains. The comparator independently computes chain/Merkle agreement; it does
not independently verify signatures or append-only continuity.

The [bounded adjudication repair #71](https://github.com/szl-holdings/khipu-consensus/pull/71)
remains a separate draft requiring independent human review and API migration
review. Its head is 3584a77a6191cb750cbd00586e42221a6f36de73. It is excluded
from the new v2 report, which uses current merged Khipu source. A local
read-only handler is not a qualified public endpoint.

## Receipt formats are still distinct

| Path | Existing format retained | Integration limit |
| --- | --- | --- |
| Frontier TypeScript | SHA-256 over historical producer-order JSON receipts | In-memory per-instance FIFO; public backing-field writes bypass API isolation; no durable multi-process transaction or v2 witness call is added. |
| Python reference gateway | SHA3-256 receipts labelled UNSIGNED_HONEST | Immutable policy binding does not make the memory plane or receipt lake thread-safe or witness-backed. |
| Independent comparator | Python SHA-256 prev_hash/chain_hash profile and RFC6962-style roots | Exact agreement within this profile does not bridge the other receipt formats or provide execution permission. |

## Production admission still requires

1. Review and admit the exact candidate changes through their protected PRs.
   Reconcile/revalidate their base if main changes; do not reuse earlier green
   checks for a different source combination.
2. Connect one actual Frontier recall path to a trusted tenant/session/content,
   policy revision, tree root/size and time/TTL context. Verify both successful
   returned bytes/receipts and denial for missing context, hard deny, altered
   evidence and failed sealing.
3. Qualify durable multi-writer receipt behavior, real witness failure domains,
   authenticated transport, rollback and observed service objectives. The
   existing synthetic tests do not establish those deployment properties.

## Historical evidence stays historical

The [November 15 Eclipse report](https://github.com/szl-holdings/szl-eclipse/blob/a47855873dd0e2e399dbe573b1ed2e486ca867b7/evidence/2026-11-15/covenant-v04-mutation-report-20261115.json)
remains unchanged and identifies its older Khipu a07aa207 source. It is not
used to qualify current v2.

The old Windows grind log ends in a successful 9,235-job build after four
passes, but does not record its source commit. It is historical completion
evidence, not a receipt for today's head. Fresh verification must bind source
revision, inputs and native exit codes.

The v0.4 proposal remains a dated proposal. Lambda remains Conjecture 1.
Nothing here claims a mathematically guaranteed SLA, universal competitive
superiority or production authorization.
