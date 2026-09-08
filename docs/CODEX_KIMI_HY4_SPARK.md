# Kimi K3 / Hy4 / Spark — governed evaluation intake

Three model families, five official artifacts. This is a source/evaluation
preparation implementation, not three model deployments. It extends the existing
wave compiler and publisher without touching production routes or prior measured
MiniCPM5 failures. These are newly surfaced catalog gaps, not claimed September 8
release dates; Hub creation/modified timestamps are deliberately not releaseAt.

## Implemented

`frontier/waves/2026-09-08-kimi-hy4-spark.json` records full official model revisions,
substantive blob-inventory identities, LICENSE/config SHA-256, use-specific gates
and consumer ownership. The exact wave bytes are projected into public/frontier
and hf/dataset for the existing protected-main publisher. Default module command
prints an offline pending plan. Explicit `observe` uses at most fifteen bounded,
unauthenticated GETs to the fixed five repositories and their immutable LICENSE/
config files. It refuses redirects, partial inventories, missing access flags,
license/config/weight-identity mismatches, nonfinite JSON and changed pins.

A complete source observation feeds the existing `wave_plan.compile_plan`, leaving
all existing quality, baseline, cost, rights, runtime, fallback and authorization
gates pending. Neither checksums nor metadata approve a license or qualify a model.
The new read-only CI job preserves failures, does not download weights or import
upstream Python, and binds its report to the actual Git checkout. A PR synthetic
merge checkout is not mislabeled as main/runtime admission. No new scheduled model
job or background updater is created by this change.

```bash
PYTHONPATH=python python -m unittest discover -s python/tests -v
PYTHONPATH=python python -m szl_frontier.family_intake plan
PYTHONPATH=python python -m szl_frontier.family_intake observe \
  --source-revision "$(git rev-parse HEAD)" --output artifacts/family-source.json
```

The output path must not already exist; use distinct paths for each observation.
The 19 focused local tests use synthetic metadata only. Three additional repository
integration tests exercise the existing wave compiler and must pass in full CI.
The source collector verifies the recorded pin, not continuous future releases;
the existing organization watcher remains responsible for future discovery/dedupe.

## Consumer implementation order

**Forge** owns lifecycle and evaluation. Prepare separate opt-in recipes; never
allocate trillion-parameter local serving solely because a card is public. For
Kimi/Hy4 use a licensed exact-identity provider or appropriately qualified owned
runtime. Cost ceilings, request budgets, model revision observability and fallback
must be explicit. Spark is the bounded local candidate after custom-code review.

**Nemo** witnesses pre/post generation; it is neither an LLM nor a routing authority.
**Serve** owns image, parser, recipe and receipt/fallback validation around the
existing Forge studio, not another public Space. **A11oy** alone handles governed
consequential actions after authorization; model tool proposals are not actions.
**a11oy-net** displays immutable evidence and known limits, not plan-derived LIVE.

## Family-specific obligations

Kimi's pinned custom LICENSE is not Apache and not a blanket noncommercial ban.
Its conditional commercial grant, MaaS scope, revenue and branding provisions
require owner review for the intended use. This intake does not lift historical
Kimi restrictions in holographic-unify or claim legal approval. Follow the full
pinned primary license, not a shorthand tag. Its multi-turn reasoning/tool-state
protocol needs private, ephemeral provider-protocol qualification; never export
raw model reasoning into public receipts or turn protocol state into tool authority.

Hy4 remains an early preview with known over-reasoning/verification concerns.
Its FP8 config declares ModelOpt MXFP8: qualify actual kernel/hardware compatibility
and MTP correctness against the unchanged baseline before any throughput claim.
FP8 is a reference variant in the same family, not a duplicate model alert.

Spark's custom auto_map and serving plugins/forks remain unexecuted and
trust_remote_code stays false. Record code/fork/license identities before a
separately approved isolated test. The upstream 1M-context claim is not an SZL
memory budget; begin bounded, then measure larger inputs on named hardware.

## Production definition of done

Pinned model/tokenizer/template/runtime and conversion lineage, use-specific rights,
held-out quality and incumbent comparison, malicious/malformed-output abstention,
actual tool-parser behavior, private-input boundaries, costs, memory and latency,
Nemo/Serve witnesses, fallback/rollback and sealed production authorization. Keep
all models HOLD until those gates are witnessed. GitHub -> Hugging Face ->
a-11-oy.com -> a11oy.net remains the order. This source PR does not fix or certify
A11oy's independent canonical-deployment blocker; that remains tracked in #2010
in szl-holdings/a11oy. No DNS, live credential, production default or training changes.
