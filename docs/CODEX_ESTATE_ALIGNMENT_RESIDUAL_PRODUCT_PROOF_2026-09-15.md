# Codex handoff — residual A11oy proof/inventory alignment repair

Canonical incident: `szl-holdings/szl-frontier#151`  
Existing cross-plane owner: `szl-holdings/a11oy#2010`  
Estate reconciliation owner: `szl-holdings/.github#298`  
Governed wave: `frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json`  
Disposition: **P0 ALIGNMENT DRIFT / HOLD**

## Current measured state

Two source-identity legs have now been repaired additively; their earlier failures remain historical evidence.

1. `.github#298` generated a reconciliation at `2026-09-15T06:37:43.065070+00:00` where protected `szl-holdings/a11oy` main was `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb` and the canonical Hugging Face A11oy `/api/build-info` reported the same source revision with `source_bound=true`.
2. A later fresh public GET of `https://a-11-oy.com/api/a11oy/v1/honest` reports `git_sha=ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`, matching the still-current protected A11oy main source exactly.

The product-source drift recorded earlier in this branch is therefore **repaired for this predicate**. Do not erase the stale predecessor observation and do not infer whole-estate alignment from this repair.

Residual drift remains in the named inventory/proof predicates:

- `a11oy#2010`, updated 2026-09-15, still reports `hf-public-author-membership/v1` as 47 observed models vs 46 declared, with the added model already classified as an admitted publication rather than a rogue object;
- `a11oy.net/models.json` remains a dated 2026-09-12 classification at 46 models / 35 datasets / 21 Spaces;
- `a11oy.net/public-inventory.json` remains an older 2026-08-31 snapshot with a different historical scope and must stay labeled historical rather than being silently substituted for the current public-membership predicate.

The authority chain is therefore **partially converged**: GitHub -> canonical Hugging Face runtime -> `a-11-oy.com` product source identity are aligned for the exact-source predicate; current public-membership declaration and `a11oy.net` proof projection are not yet aligned under the same named scope.

## Repair order

### 1. Re-read source before any remaining mutation

Before any writer is dispatched, read protected `szl-holdings/a11oy` `main` again. If it moves from `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`, the new protected-main SHA becomes authoritative. Never publish or prove an older source merely because it appears in this dated handoff.

### 2. Preserve the repaired Hugging Face and product source legs

The canonical A11oy Hugging Face runtime and the product honesty endpoint are aligned to the observed protected source. Do not roll either backward, recreate the Space, introduce a second publisher, or redeploy merely to force an inventory count.

Any subsequent writer must re-read both source-identity endpoints and prove it did not regress exact-source equality.

### 3. Reconcile the admitted 47th model in the declared public predicate

`SZLHOLDINGS/szl-receiptagent-qwen35-0.8b-v2-merged` has already been classified by the existing incident as admitted/published. The correct repair is to refresh the canonical declared membership/profile/proof source through its normal reviewed writer, not delete, hide, rename, or retype the model to restore the old count.

Capture the model's current Hub release revision SHA during the same owner-side readback if it remains a required artifact-binding gap. Keep authenticated inventory-v2 or other differently scoped inventories separate from `hf-public-author-membership/v1`.

### 4. Refresh proof without rewriting history

For `a11oy.net`, update only the designated current inventory records through the repository's normal reviewed proof writer. Preserve prior dated snapshots as historical evidence where the proof contract expects history.

The current record must name its predicate, observation method, timestamp and exact observed counts/items. It must not infer missing assets as zero, mix incompatible inventory scopes, or treat reachability as membership/readiness evidence.

### 5. Same-window closure

Do not close #151 from separate stale successes. Require one fresh reconciliation window that proves, for the same then-current source and named predicates:

1. protected GitHub A11oy source identity;
2. canonical Hugging Face A11oy source identity exact match;
3. `a-11-oy.com` product source identity exact match;
4. current public-HF membership declaration matches the measured `hf-public-author-membership/v1` scope;
5. `a11oy.net` current proof record represents that same measured scope and remains bounded/honest;
6. zero required blockers for these predicates.

If any source leg moves during proof publication, restart the closure read from the newer protected source. Reachability, a green deployment, or a stale earlier receipt is not sufficient.

## Guardrails

- no branch-protection or required-check weakening;
- no manual provider-byte repair or second publisher;
- no source repin to stale runtime/proof bytes;
- no admitted model deletion/hiding to force counts;
- no inventory-scope mixing;
- no rewriting historical failure/closure evidence;
- no production/default/provider/model promotion claim from reconciliation alone;
- automatic production promotion remains false.
