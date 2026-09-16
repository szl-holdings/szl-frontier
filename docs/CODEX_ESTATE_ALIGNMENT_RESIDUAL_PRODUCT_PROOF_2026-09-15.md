# Codex handoff — residual A11oy proof/inventory alignment repair

Canonical incident: `szl-holdings/szl-frontier#151`  
Existing cross-plane owner: `szl-holdings/a11oy#2010`  
Estate reconciliation owner: `szl-holdings/.github#298`  
Governed wave: `frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json`  
Disposition: **P0 ALIGNMENT DRIFT / HOLD**

## Current measured state — source moved, then product parity reappeared

Protected `szl-holdings/a11oy` `main` is `49f114dd9bdb47e0efef5caa3c3f0db3df6c2431`, a verified commit whose parent is the previously reconciled `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`.

That source movement required reopening exact-source alignment. A later fresh public GET of `https://a-11-oy.com/api/a11oy/v1/honest` in the same September 16 observation window now reports `git_sha=49f114dd9bdb47e0efef5caa3c3f0db3df6c2431`. Product source identity is therefore repaired for the current-source predicate and the earlier stale read remains historical evidence rather than being erased.

Residual alignment is still **not closed**:

1. the latest governed exact Hugging Face runtime observation still names predecessor `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`; no fresh exact runtime source read for `49f114...` was available in this observation window, so current HF source state remains unqualified rather than inferred from reachability or a card timestamp;
2. the governed `hf-public-author-membership/v1` incident observation remains 47 observed models vs 46 declared, with the added model already classified as admitted/published;
3. `a11oy.net/models.json`, freshly re-read on 2026-09-16, still carries its 2026-09-12 capture at 46 models / 35 datasets / 21 Spaces;
4. `a11oy.net/public-inventory.json` remains an older, differently scoped historical snapshot.

The chain is therefore **partially converged**: current GitHub source and `a-11-oy.com` product source identity match; canonical HF exact source requires a fresh read; public membership and proof projection remain stale under their named predicates.

## Repair order

### 1. Bind every successor action to the current protected source

Re-read protected `szl-holdings/a11oy` `main` immediately before any publisher or proof writer. `49f114dd9bdb47e0efef5caa3c3f0db3df6c2431` is authoritative for this observation; if main moves again, the newer protected SHA becomes authoritative and closure restarts.

Never repin GitHub to older runtime or proof bytes.

### 2. Preserve current product parity

The fresh honesty endpoint matches current protected source. Do not redeploy or mutate product state merely to force inventory counts or proof closure. Any later writer must re-read the product source identity and prove it did not regress.

### 3. Re-observe the canonical Hugging Face runtime

Obtain a fresh exact source identity from the canonical A11oy Hugging Face runtime through the existing source-bound reconciliation path. The prior `ebfd70...` read is historical only.

If the runtime is still on the predecessor source, repair it only through the normal publisher after all admission, build, policy, provenance and receipt gates for the newer source succeed. Do not recreate the Space, introduce a second publisher or mutate provider bytes manually.

If the runtime already reports the new source, capture that exact observation and its run/receipt rather than inferring success from the Space card update time or reachability.

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

If any source leg moves during publication or proof generation, restart from the newer protected source. Reachability, a repaired product leg, a stale receipt, or a successful source commit alone is not sufficient.

## Guardrails

- no branch-protection or required-check weakening;
- no manual provider-byte repair or second publisher;
- no source repin to stale runtime/proof bytes;
- no admitted model deletion/hiding to force counts;
- no inventory-scope mixing;
- no rewriting historical failure/closure evidence;
- no production/default/provider/model promotion claim from reconciliation alone;
- automatic production promotion remains false.
