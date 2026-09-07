# Pinned wave evaluation preparation

The existing Python frontier package now consumes the staged wave and its captured upstream-model pin receipt. This is a bounded, deterministic bridge from release discovery to evaluation inputs, not a new agent framework, runtime, scheduler, or publisher.

```sh
PYTHONPATH=python python -m szl_frontier.wave_plan \
  --wave frontier/waves/2026-09-07.json \
  --pins frontier/evidence/2026-09-07-upstream-model-pins.json \
  --output /tmp/szl-frontier-wave-plan.json

PYTHONPATH=python python -m unittest discover -s python/tests -p 'test_wave_plan*.py' -v
```

Output creation is exclusive: choose a new output path for another run, rather than silently replacing a prior evidence record. Omitting `--output` writes JSON to stdout. No network, model weights, dependencies, runtime code, GPU allocation, provider write, or production route is invoked by the compiler.

## What it verifies

It checks the wave's source authority and alignment order, explicit consumer ownership, production-HOLD policy, required evidence, public metadata authority, canonical receipt checksum and byte count, exact 40-character upstream revisions, artifact membership, primary/reference/base roles, pinned transitive base-model closure, duplicate or conflicting identities, cycles, unavailable/gated artifacts, and strict bounded JSON inputs. All five captured model identities participate: GLM-5.3 and Flash are distinct; the NVIDIA quantized artifact and its Qwen base are distinct.

The checksum is integrity evidence only, not a signature or permission. License metadata remains an observation: `mit` does not set `licenseApproved=true`, and the `other` values for the reference/quantized/base artifacts remain review-required. No benchmark number or serving-compatibility result is manufactured. Every output has `productionDisposition=HOLD`, `executionAuthorized=false`, and `benchmarkResults=null`.

## Actual qualification

The 29 adversarial fixture tests passed locally and on Python 3.12.14 in Hugging Face CPU job `6a9f4b1be686246ca69a9812`, against GitHub commit `12b0cdd920fdb1ac924d59cde873f5f4ef9c55c3`. That job also compiled the actual checked-in inputs: three release groups, five pinned model records, zero promotions. It read the five exact-revision public Hugging Face metadata endpoints and matched their repository identity, revision and observed license values. It downloaded no weights and evaluated no model quality.

Plan checksum observed there: `41c40911418ca1ace67128ba9f394f95caddb9ebe6534814ec6293f59ce1687c`.

Job: https://huggingface.co/jobs/SZLHOLDINGS/6a9f4b1be686246ca69a9812

Two additional repository-input regression tests are included in the existing `python/tests` CI discovery to ensure the checked-in wave and pin receipt continue to agree. Their latest exact-head hosted result remains the CI authority; the earlier CPU result does not retroactively certify later commits.

## Next authority

The canonical release catalog, policy engine, production authorization and source-bound publishers remain authoritative. This compiler does not replace them or connect a model to a live action path. Consumer owners must supply checksummed fixtures, input rights, tokenizer/template identity, approved engine/container/hardware, baseline comparisons, failure and fallback measurements, and sealed authorization before any promotion. GitHub remains the source; Hugging Face projects admitted artifacts; the product shows accepted status; a11oy.net shows evidence and known limits.
