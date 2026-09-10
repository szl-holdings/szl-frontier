# Codex handoff — Hugging Face Hub 1.30 repo-aware revision binding

Status: **EVALUATION / HOLD**

Tracking: `szl-holdings/szl-frontier#63`

## Exact upstream authority

Qualification source is Hugging Face Hub `v1.30.0` at exact release commit
`48ef2781c2c4c2247431c97efcd5487e89d42732`. The annotated tag object is
`103720584dcc9865259dc5165f1a42e0bdea15d5`. The tag was observed unsigned, so
record that limitation and bind qualification to the dereferenced exact commit;
do not silently follow upstream `main`.

## Why this matters

The v1.30 client fixes a provenance ambiguity: `ResolvedRevision` now remembers
`repo_id` and `repo_type`. A resolution produced for repository A must never be
reused as commit authority for repository B. If a requested revision is reused
with another repository, it must be resolved again for that repository.

The same release also broadens upstream hf-inference chat-completion eligibility.
That is provider availability only. It must not add a model to an SZL allowlist,
change a default route, or satisfy an SZL evaluation gate.

## Repository ownership

- `szl-holdings/szl-frontier`: canonical release/provenance/evidence contract.
- `szl-holdings/a11oy`: live Hub-client/runtime and publisher/readback contract.
- `szl-holdings/szl-forge`: optional compatibility harness only when needed.
- `szl-holdings/a11oy-net`: proof publication only after immutable evidence.

## Current estate observation

A11oy already merged `a11oy#2037`, changing `requirements-audit.txt` from
`huggingface_hub==1.29.0` to `1.30.0`. At the observed current A11oy source, the
runtime Dockerfile remains pinned to `1.29.0`, and several specialized workflows
retain older explicit client pins. Do not mass-bump them. First determine which
paths depend on revision resolution, upload/readback, bucket sync, snapshot
restore, or inference-provider eligibility and test those paths under their own
contracts.

## Required A11oy implementation

1. Add a deterministic contract for source receipts carrying, as applicable,
   `repo_id`, `repo_type`, requested revision and resolved exact 40-character
   commit. A commit hash without repository identity is not a complete authority
   binding when it came through Hub revision resolution.
2. Add a negative-path test showing a resolved revision associated with one repo
   cannot be accepted as authority for a different repo.
3. Add a serving-policy regression proving upstream `text-generation` or
   `image-text-to-text` chat-completion eligibility cannot bypass SZL allowlists,
   human/policy gates, or route qualification.
4. If the runtime Docker client is moved from 1.29.0 to 1.30.0, do it on a normal
   feature branch and run the complete Docker/runtime, Hub transport, publisher,
   restore and rollback checks that normally apply. Do not equate a dependency
   pin with successful live projection.
5. Preserve the inherited v1.29 security baseline: remote bucket keys must not
   escape the destination path, and safetensors metadata must never permit a
   `.safetensors` shard to fall through to pickle loading.
6. Leave specialized workflows on older explicit pins unless their exact owning
   test proves a 1.30.0 change is required and compatible.
7. Record the exact installed package version and the normal CI/workflow evidence
   on the candidate head.

## Stop conditions

Remain HOLD if any source receipt can lose repository identity, a cross-repo
revision object is accepted without re-resolution/rejection, model eligibility
can widen an SZL production route, the runtime upgrade breaks publication or
rollback, package/source provenance is incomplete, or any normal repository
control is red or unavailable.

No weight rehosting, production-default change, policy weakening, branch
protection bypass, manual Hub patch, or proof claim is authorized by this wave.
