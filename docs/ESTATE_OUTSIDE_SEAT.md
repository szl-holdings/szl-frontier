# Estate outside-seat verifier

`tools/estate_outside_seat.py` observes public Hugging Face metadata and card
consistency, writes a receipt and retains the exact response bytes. Production
disposition remains **HOLD** and promotion effect remains **NONE**. A successful
observation is not model qualification, license clearance, an application health
test, or permission to deploy.

## Run locally

Python 3.12 is used in CI. The verifier uses only the standard library and makes
anonymous public GET requests. It does not read an ambient `HF_TOKEN`.

```bash
python -m unittest discover -s tools -p 'test_*.py' -v
python tools/estate_outside_seat.py --receipt artifacts/outside-seat/receipt.json --evidence-dir artifacts/outside-seat/evidence
```

The default inputs are the committed wave
`frontier/waves/2026-09-07.json` and its upstream model pin set. The collector
records their hashes with the script hash. Model observations are bound to the
committed upstream revisions, including the quantized model's base model.
Cards and repository trees are fetched at one observed revision per repository.

To extend a local receipt chain, keep each run in its own directory:

```bash
python tools/estate_outside_seat.py --prev-receipt artifacts/outside-seat/receipt.json --receipt artifacts/outside-seat-next/receipt.json --evidence-dir artifacts/outside-seat-next/evidence
```

The default source-age threshold is 30 hours. `--stale-hours` accepts a finite,
positive number. This threshold flags an old **repository modification time**;
it does not measure heartbeat, service availability or uptime. Resolve findings
through the owning repository and its evidence requirements. An empty commit or
a higher threshold does not repair an application.

| Exit | Meaning |
| --- | --- |
| 0 | All configured observations passed the bounded checks. |
| 2 | An observation is incomplete or a finding remains. |
| 3 | Configuration or local receipt/output handling failed. |

The receipt carries the actual verdict. A successfully written JSON file alone
does not indicate a passing run. Unreadable metadata, a missing baseline Space,
a truncated/cyclic page listing, missing revision or license metadata, malformed
dates, and a corrupt prior receipt cannot silently become success.

## Coverage and evidence limits

The baseline inventory comes from the supplied September 7 watch list. The
collector also discovers current public organization Spaces and checks the
configured creator Space. The reserved organization `README` profile Space is
checked directly because the observed organization listing omits it. Its
revision, source age and runtime evidence still must be readable. A missing
ordinary baseline entry is a finding; new public entries are observed. This
detects changes instead of silently rewriting the expected inventory to match
each response. Private resources are outside this public observation scope.

Provider runtime stage is recorded separately from source age. A provider stage
such as `RUNNING` still does not prove the application's readiness or business
contract. The card check detects the specific contradiction between a card
claiming "no application backend" and a repository containing root `server.py`.
The check traverses the paginated root tree at the same revision as the README;
it is not a general semantic audit of every claim or a recursive source audit.

Each remote response has its URL, HTTP status, observation time, byte count and
SHA-256 digest recorded. Raw bodies are retained under their digest in the
evidence directory. The collector bounds response size, page count and request
duration and restricts Hugging Face requests and pagination to its HTTPS origin.
Errors are evidence, not grounds to omit a surface from the verdict.

The receipt digest detects changes relative to a retained digest, and
`prevReceipt` links a run to the validated previous receipt. These are self-issued
observations, not signed third-party attestations. Someone who can replace the
entire evidence set and every trusted checkpoint can recompute an unsigned
chain. Preserve trusted GitHub run/artifact identity or an external checkpoint
when independent assurance is needed. Receipt bytes are not a reproducible model
evaluation and do not establish model quality, training or serving readiness.

Doctrine fields retain the supplied HOLD/advisory posture as declared policy.
This collector does not prove mathematical claims or an evidence probability.

## CI and nightly operation

The existing required `verify` job runs the offline regression suite on pull
requests and main pushes. This makes the collector's correctness checks part of
the repository's existing protected merge gate.

`Estate outside-seat verifier` runs nightly at **05:37 UTC** and supports manual dispatch
on `main`. It runs the offline controls before observation. Live findings fail
the workflow; the receipt and raw evidence are uploaded even when the observation
fails. Workflow artifacts use run ID and attempt in their names. If prior-chain
retrieval fails, the artifact preserves a chain failure diagnostic and the
observer does not manufacture a replacement genesis receipt.

The previous-receipt helper reads the latest eligible completed run of this same
workflow on the repository's default `main` branch, including failed runs. It
checks repository, workflow, event, branch, attempt and artifact identity before
extracting the receipt. PR artifacts are ineligible. Missing or expired evidence
for an existing prior run blocks continuation instead of silently starting a new
chain. Genesis is allowed only when there is no eligible prior run. The verifier
then recomputes the prior receipt's digest before linking it.

If a completed predecessor has no usable receipt, inspect its run and
`chain-status.json`, fix the underlying retrieval or configuration problem, and
rerun that predecessor where GitHub permits it. Its latest attempt must produce
a valid receipt before the next run can continue. Rerun any already blocked
successors in order; dispatching another fresh run alone will not clear the
missing-receipt predecessor. A normal `FINDING` or
`INCOMPLETE` observation with a valid receipt can be chained; a `CONFIG_ERROR`
receipt cannot repair a missing link. If the predecessor cannot be recovered,
the chain remains blocked and requires an explicit reviewed recovery procedure.
Deleting runs to make the API appear empty does not establish continuity. The
helper can only audit history still visible through GitHub's API; it cannot
prove that historical runs were never deleted.

The GitHub token is available only to the prior-artifact retrieval step and has
read-only contents/actions permissions. The Hugging Face observer receives no
provider credential. Neither the collector nor this workflow changes repository
content, model weights, provider runtime, production routing or branch protection.

The nightly workflow's live result is separate from the required PR correctness
gate. A scheduled run executes a default-branch commit; it cannot establish a
fresh status for every proposed PR revision. An operational collector can produce
a red estate observation when the monitored sources have findings. Report both
states without treating one as proof of the other.

## References

- [Hugging Face Hub API documentation](https://huggingface.co/docs/hub/api)
- [Organization profile Spaces](https://huggingface.co/docs/hub/organizations-cards)
- [Canonical integration wave](../frontier/waves/2026-09-07.json)
- [Committed upstream model pins](../frontier/evidence/2026-09-07-upstream-model-pins.json)
- [Nightly workflow](../.github/workflows/estate-outside-seat.yml)
