# Codex handoff — Hugging Face Hub 1.31 stable

## Exact upstream authority

Evaluate only `huggingface/huggingface_hub@495b17c8529614759ae0f1ccf1ebe9a61c148b7c` (`v1.31.0`). The annotated tag object is `32ccc9ee57f3b3546165de105b4a0d8eba1b7446`; the tag is unsigned, so record that limitation and never reinterpret it as verified signature evidence. Do not follow moving `main`.

## Existing measured evidence

`szl-holdings/szl-forge#216` already merged exact-source installed evaluation as `74a8a07ced6c6b8697b31b7d0e482c4241d55880`. Reuse that evidence rather than creating another generic Hub harness. The first Hub matrix attempt retained failed dry-run assertions; the corrected run admitted only bounded SDK cache bookkeeping while still rejecting copied payload files and unknown output. That failure history is evidence, not something to erase.

## A11oy successor alignment

Owner: `szl-holdings/a11oy#2087`.

The old issue targeted 1.30.0 before v1.31.0 was published. Rebase the target to this exact stable release. Do not mass-bump specialized workflows. The canonical runtime change must be narrowly scoped and must preserve dependency-audit parity, repository-aware resolved revision authority, no implicit model/provider authorization, current Hub publisher single-writer controls, rollback, immutable receipts and readback.

Required negative paths include Windows traversal-style remote filenames, concurrent snapshot cache ref writes, dry-run destination behavior, missing HEAD Content-Length, retry/resume boundaries and invalid/reserved Sandbox labels. Do not create a billable Sandbox Job to prove label validation; SDK/local deterministic validation plus non-billable fixtures are sufficient for the evaluation gate.

## Promotion boundary

A green source/runtime compatibility lane is not production qualification. Promotion requires the repository's normal Docker/security/dependency controls, Hugging Face publication/readback when applicable, `a-11-oy.com` runtime identity, and an immutable proof record before `a11oy.net` can claim convergence. Otherwise disposition remains EVALUATION/HOLD.
