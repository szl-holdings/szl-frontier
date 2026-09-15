# Codex handoff — residual A11oy product/proof alignment repair

Canonical incident: `szl-holdings/szl-frontier#151`  
Existing cross-plane owner: `szl-holdings/a11oy#2010`  
Estate reconciliation owner: `szl-holdings/.github#298`  
Governed wave: `frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json`  
Disposition: **P0 ALIGNMENT DRIFT / HOLD**

## Current measured state

The earlier successor wave correctly recorded a stale canonical Hugging Face A11oy runtime. That specific predicate has now advanced: `.github#298` generated a reconciliation at `2026-09-15T06:37:43.065070+00:00` where protected `szl-holdings/a11oy` main was `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb` and the canonical Hugging Face A11oy `/api/build-info` reported the same source revision with `source_bound=true`.

Do not erase the earlier failure. It is historical evidence. Record the later HF predicate as repaired.

Residual drift remains downstream:

- `a-11-oy.com/api/a11oy/v1/honest` still reports `git_sha=a7bf14a576bc79b4db1945384c55a3c56b109670`, not current protected main `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`;
- `a11oy#2010` still reports the named public-membership predicate as 47 observed models vs 46 declared, with the added model already classified as an admitted publication rather than a rogue object;
- `a11oy.net/models.json` remains a dated 2026-09-12 classification at 46/35/21;
- `a11oy.net/public-inventory.json` remains an older 2026-08-31 snapshot and must stay labeled as historical/stale rather than silently substituted for the current predicate.

The authority chain is therefore **partially converged**, not fully aligned: GitHub -> canonical Hugging Face runtime has exact source parity; product source identity and current proof/public-membership projections still do not.

## Repair order

### 1. Re-read source before mutation

Before any writer is dispatched, read protected `szl-holdings/a11oy` `main` again. If it is no longer `ebfd70f4c6915c2640cf82a97c7f22b6c62906eb`, treat the new protected-main SHA as the target and record source movement. Never publish an older SHA merely because it appears in this dated handoff.

### 2. Preserve canonical Hugging Face parity

The canonical A11oy Hugging Face runtime is already source-bound for the observed predicate. Do not roll it backward, recreate the Space, or change visibility merely to coordinate with the stale product domain.

Any later writer must prove it did not regress `/api/build-info` source equality.

### 3. Repair `a-11-oy.com` through the established publisher only

Use the existing source-owned release/publisher path. Do not manually edit deployed provider bytes and do not introduce a second writer.

After publication, re-read the product's source/honesty endpoint. Closure requires its exact source identity to equal the then-current protected `a11oy` main SHA. HTTP 200 alone is insufficient.

If provider credentials, quota, deployment policy, or immutable provider configuration blocks the canonical writer, leave this predicate HOLD and record the concrete blocker. Do not repin GitHub to deployed stale bytes.

### 4. Reconcile the admitted 47th model in the declared public predicate

`SZLHOLDINGS/szl-receiptagent-qwen35-0.8b-v2-merged` has already been classified by the existing incident as admitted/published. The correct repair is to refresh the canonical declared membership/profile/proof source through its normal reviewed writer, not delete, hide, rename, or retype the model to restore the old count.

Capture the model's current Hub release revision SHA during the same owner-side readback if it remains a required artifact-binding gap.

### 5. Refresh proof without rewriting history

For `a11oy.net`, append/replace only the designated current inventory records through the repository's normal reviewed proof writer. Preserve prior dated snapshots as historical evidence where the proof contract expects history.

The current record must name its predicate, observation method, timestamp and exact observed counts/items. It must not infer missing assets as zero or mix incompatible inventory scopes.

### 6. Same-window closure

Do not close #151 from separate stale successes. Require one fresh reconciliation window that proves, for the same then-current source and named predicates:

1. protected GitHub A11oy source identity;
2. canonical Hugging Face A11oy source identity exact match;
3. `a-11-oy.com` product source identity exact match;
4. current public-HF membership declaration matches the measured named scope;
5. `a11oy.net` current proof record represents that same measured scope and remains bounded/honest;
6. zero required blockers for these predicates.

Reachability, a green deployment, or a stale earlier receipt is not enough.

## Guardrails

- no branch-protection or required-check weakening;
- no manual provider-byte repair or second publisher;
- no source repin to stale runtime bytes;
- no admitted model deletion/hiding to force counts;
- no inventory-scope mixing;
- no rewriting historical failure/closure evidence;
- no production/default/provider/model promotion claim from reconciliation alone;
- automatic production promotion remains false.
