# Codex handoff — residual A11oy proof/inventory alignment repair

Canonical incident: `szl-holdings/szl-frontier#151`  
Existing cross-plane owner: `szl-holdings/a11oy#2010`  
Estate reconciliation owner: `szl-holdings/.github#298`  
Governed wave: `frontier/waves/2026-09-15-estate-alignment-residual-product-proof.json`  
Disposition: **P0 ALIGNMENT DRIFT / HOLD**

## Current measured state — source legs converged on the latest protected revision

Protected `szl-holdings/a11oy` `main` is verified `43058398fb8ea346a7bd977f1a35391aeec1bf1a`, committed 2026-09-17T01:00:02Z.

Fresh reads in the current observation window now show both runtime projections on that exact source:

- canonical Hugging Face runtime `https://szlholdings-a11oy.hf.space/api/a11oy/v1/honest` -> `43058398fb8ea346a7bd977f1a35391aeec1bf1a`;
- product runtime `https://a-11-oy.com/api/a11oy/v1/honest` -> `43058398fb8ea346a7bd977f1a35391aeec1bf1a`.

This is a real repair of the previously stale/unreadable exact-source legs. Preserve the older stale, aligned, regressed and unavailable observations as history; do not rewrite them.

Whole-chain closure is still **not established**. The governed public-Hub membership predicate needs a fresh current observation/reconciliation, and `a11oy.net/models.json` still exposes the dated 2026-09-12 record at 46 models / 35 datasets / 21 Spaces. `a11oy.net/public-inventory.json` is an older differently scoped historical record and cannot substitute for the named current predicate.

## Repair order

### 1. Re-read protected source before every writer

`43058398fb8ea346a7bd977f1a35391aeec1bf1a` is authoritative for this observation window. Immediately re-read protected `main` before any publisher, inventory or proof writer. If it moves again, the newer protected SHA becomes authoritative and closure restarts.

Never repin GitHub to older runtime or proof bytes.

### 2. Preserve the repaired Hugging Face and product source legs

Do not redeploy either runtime merely to manipulate inventory/proof closure. Before final reconciliation, re-read both exact-source endpoints and prove they still match the then-current protected source.

If either later regresses, repair only through the existing source-bound publisher and normal repository controls. Do not create a second publisher or manually mutate provider bytes.

### 3. Reconcile current public-Hub membership

Obtain a fresh `hf-public-author-membership/v1` observation for the same closure window and reconcile its reviewed declaration through the normal writer. The last governed incident observation recorded 47 observed models versus a stale 46-model declaration, but that predecessor observation is not inherited as today's measurement.

Do not delete, hide, rename or reclassify an admitted asset merely to restore an older count. Keep differently scoped authenticated/private inventories separate from this public predicate.

### 4. Refresh current proof without rewriting history

Update only designated current `a11oy.net` proof records through the repository's normal reviewed proof writer using the fresh named membership predicate. Preserve the 2026-09-12 and older records as historical evidence where the contract expects history.

The current record must bind predicate, observation method, timestamp and exact observed items/counts. It must not infer missing assets as zero, mix incompatible scopes, or treat reachability/source parity as inventory readiness.

### 5. Same-window closure

Do not close #151 from source parity alone. Require one fresh reconciliation window proving:

1. protected GitHub A11oy source identity;
2. canonical Hugging Face A11oy runtime exact-source match;
3. `a-11-oy.com` product exact-source match;
4. current public-HF membership declaration equals the fresh measured `hf-public-author-membership/v1` scope;
5. `a11oy.net` current proof record represents that same fresh scope honestly;
6. zero required blockers for those predicates.

If any source leg moves during reconciliation, restart from the newer protected source. Reachability, a successful deployment, or three-way exact-source parity alone is not whole-estate readiness.

## Guardrails

- no branch-protection or required-check weakening;
- no manual provider-byte repair or second publisher;
- no source repin to stale runtime/proof bytes;
- no admitted asset deletion/hiding/reclassification to force counts;
- no inventory-scope mixing;
- no rewriting historical failure/closure evidence;
- no production/default/provider/model promotion claim from reconciliation alone;
- automatic production promotion remains false.
