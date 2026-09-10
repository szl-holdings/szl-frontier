# Codex handoff — Hugging Face Repo2RLEnv synthesis evaluation

Status: **EVALUATION / HOLD**

Evaluate functional release `huggingface/Repo2RLEnv@d1f7677265b10ae5deec1b9cc43425d715564d47` (v0.8.7). Upstream v0.8.8 is explicitly docs/infrastructure-only and byte-identical at the library level; do not promote cosmetic version churn into a capability claim.

Implementation belongs in `szl-holdings/szl-forge`. First lane requirements:

1. Use a small fixed corpus of public, non-secret repositories at exact commits; no private repositories or production credentials.
2. Start with stable `pr_runtime` / `commit_runtime` semantics only; experimental pipelines stay out of qualification.
3. Disable Hub publication and external provider/LLM calls in the first deterministic lane. If synthesis requires an LLM, substitute a fixed fixture/stub or leave the capability `UNAVAILABLE` until separately authorized.
4. Run repository build/test work only in disposable isolated containers with bounded CPU/memory/time, no production network access, and no secret mounts.
5. Record source repo/ref, PR/commit identity, pipeline, bootstrap/environment digest, task content hash, verifier/reward identity, and output receipt.
6. Detect oracle/gold-patch leakage in instructions, fixtures, metadata, generated tests and reward artifacts.
7. Compare repeated generation for task identity/provenance stability and compare resulting Harbor execution receipts against the current Forge harness contract.
8. Preserve `UNAVAILABLE` versus `FAIL`; never synthesize success from missing Docker/runtime/provider capability.
9. Generated datasets remain local evaluation artifacts. No training admission or public Hub publication without a successor rights/contamination/quality/provenance decision.

No production route/default, model qualification, autonomous merge/deploy, provider write, or branch-protection authority is granted.
