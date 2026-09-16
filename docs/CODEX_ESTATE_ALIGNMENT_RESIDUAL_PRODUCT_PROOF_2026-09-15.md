# Codex handoff — residual A11oy proof/inventory alignment repair

Canonical incident: `szl-holdings/szl-frontier#151`  
Existing cross-plane owner: `szl-holdings/a11oy#2010`  
Estate reconciliation owner: `szl-holdings/.github#298`  
Governed wave: `frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json`  
Disposition: **P0 ALIGNMENT DRIFT / HOLD**

## Current measured state — source moved again on 2026-09-16

Protected `szl-holdings/a11oy` `main` is now `49f114dd9bdb47e0efef5caa3c3f0db3df6c2431`, a verified commit whose parent is the previously reconciled `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`.

That source movement reopens exact-source alignment. The previous repaired observations remain valid historical evidence for the predecessor SHA, but they do not inherit forward:

1. the latest governed exact Hugging Face runtime observation still names `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`; no fresh exact runtime source read for the new protected source was available in this observation window;
2. a fresh public GET of `https://a-11-oy.com/api/a11oy/v1/honest` on 2026-09-16 still reports `git_sha=ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`;
3. `a11oy.net/models.json`, freshly re-read on 2026-09-16, still carries its 2026-09-12 capture at 46 models / 35 datasets / 21 Spaces;
4. the governed `hf-public-author-membership/v1` incident observation remains 47 observed models vs 46 declared, with the added model already classified as admitted/published.

The chain is therefore **not aligned to the current protected source**. Do not preserve the earlier "repaired" label as current state merely because the predecessor source once matched Hugging Face and product runtime.

## Repair order

### 1. Bind every successor action to the current protected source

Re-read protected `szl-holdings/a11oy` `main` immediately before any publisher or proof writer. `49f114dd9bdb47e0efef5caa3c3f0db3df6c2431` is authoritative for this observation; if main moves again, the newer protected SHA becomes authoritative and this closure attempt restarts.

Never repin GitHub to the older runtime/product/proof bytes.

### 2. Re-observe the canonical Hugging Face runtime

Obtain a fresh exact source identity from the canonical A11oy Hugging Face runtime through the existing source-bound reconciliation path. The prior `ebfd70...` read is historical only.

If the runtime is still on the predecessor source, repair it only through the normal publisher after all admission, build, policy, provenance and receipt gates for the newer source succeed. Do not recreate the Space, introduce a second publisher or mutate provider bytes manually.

If the runtime already reports the new source, capture that exact observation and its run/receipt rather than inferring success from the Space card update time or reachability.

### 3. Repair product projection only through normal deployment controls

The live honesty endpoint is definitively stale against protected main in this window: product `ebfd70...` vs GitHub `49f114...`.

Do not force a deploy around repository blockers. The current protected source itself records existing pin/lockfile/scanner acceptance work; resolve those through reviewed source changes and normal checks. Product parity is repaired only when the normal deployment path publishes an exact admitted source and a fresh public read proves that source identity.

### 4. Reconcile the admitted 47th model in the declared public predicate

The governed membership incident still distinguishes 47 observed models from the stale 46-model declaration. Refresh the canonical declaration through its normal reviewed writer. Do not delete, hide, rename or retype the admitted model merely to restore the old count.

Keep differently scoped authenticated inventories separate from `hf-public-author-membership/v1`.

### 5. Refresh proof without rewriting history

For `a11oy.net`, update only designated current proof records through the repository's normal reviewed proof writer. Preserve the 2026-09-12 and older snapshots as historical evidence where the contract expects history.

The current record must name its predicate, observation method, timestamp and exact observed counts/items. It must not infer missing assets as zero, mix incompatible inventory scopes, or treat reachability as membership/readiness evidence.

### 6. Same-window closure

Do not close #151 from separate stale successes. Require one fresh reconciliation window that proves, for the same then-current source and named predicates:

1. protected GitHub A11oy source identity;
2. canonical Hugging Face A11oy source identity exact match;
3. `a-11-oy.com` product source identity exact match;
4. current public-HF membership declaration matches the measured `hf-public-author-membership/v1` scope;
5. `a11oy.net` current proof record represents that same measured scope and remains bounded/honest;
6. zero required blockers for these predicates.

If any source leg moves during publication or proof generation, restart from the newer protected source. Reachability, a green deployment from another source, a stale receipt, or a successful source commit alone is not sufficient.

## Guardrails

- no branch-protection or required-check weakening;
- no manual provider-byte repair or second publisher;
- no source repin to stale runtime/proof bytes;
- no admitted model deletion/hiding to force counts;
- no inventory-scope mixing;
- no rewriting historical failure/closure evidence;
- no production/default/provider/model promotion claim from reconciliation alone;
- automatic production promotion remains false.
