# Official MiniCPM5 GGUF: executable cross-owner continuation

Track issue #25 and Forge PR https://github.com/szl-holdings/szl-forge/pull/190.
This is an extension of the existing MiniCPM edge lane, not a duplicate base-model
release alert. Exact file/runtime identities and the measured historical baseline
are in `frontier/waves/2026-09-08-minicpm5-gguf.json`.

Forge now implements `inference/minicpm5_gguf.py`: default plan, bounded metadata
verification and explicit one-variant CPU smoke execution. It imports the
unchanged historical prompt, cases and strict grader; no grammar shortcut or
retry-to-green is allowed. The prior result remains 9/12 SMOKE_FAIL. That
historical execution was float16 on A10G, not a measured BF16 comparator.

Run the candidate's 27 offline tests and metadata CI first. Before running any
experiment, verify the exact Forge source bytes and keep its complete report,
including failures. The initial Q4_K_M CPU experiment completed all 12 probes: 9/12 SMOKE_FAIL. It
recovered probe_00 but newly failed probe_06; equal totals are not parity. The
exact job and evidence digest are in the wave. It used one CPU-only Hugging Face
job with a 900-second maximum and no secrets/public port. Additional
Q8/F16/device experiments are separate resource decisions, never automatic loops.

A CPU llama.cpp result is a historical behavioral comparison, not proof that
quantization alone changed quality or speed. Promote neither the quantization
nor the runtime based on a small synthetic pass. Next gates: matched F16/quantized
same-runtime and hardware, tokenizer/template/conversion lineage, independent
held-out and long-context tasks, actual Nemo/Serve/controller boundaries,
fallback/rollback, licensing obligations and an immutable deployment closure.

GitHub -> Hugging Face -> a-11-oy.com -> a11oy.net remains the only publication
order. Use existing publishers, preserve exact source binding and include known
bounds. No second public studio, no weights mirrored for inventory, and no live
product/proof badge derived from this intake or its metadata witness. The wave
has no domain deployment effect and production remains HOLD. Store new measured
outcomes with the executed source revision, not a later documentation commit.
