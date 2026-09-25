# KHIPU-HOLO / ATLAS-KNOT — 2026-09-20 EVAL

Doctrine v11 LOCKED. `ready=false`. Energy **UNAVAILABLE**. Kernel-kind **HOLD**. No new Space.

## What this is

A fail-closed receipt whose signing body is a simulated analog trajectory, not a token hash.

1. Bind payload SHA-256 into Lorenz initial conditions (stereotyped, deterministic).
2. Integrate NEXUS Lorenz on a stdlib RK4 backend (`analog_backend=nexus-sim`).
3. Sample the Poincaré section Φ at `x=0` crossings.
4. Ternary-quantize eight crossings into locked-8 shards (`{-1,0,+1}` × 2).
5. Reed-Solomon encode Φ as RS(12,8) over GF(256). Codeword C is the receipt payload.
6. Verify = re-integrate + RS syndrome. Mismatch = HOLD. Same payload = MATCH_SIM.
7. Hop-2 holographic composition stays HOLD (arXiv:2606.24948).
8. Φ is MODELED unless two independent integrators agree.

This is not NEXUS UI, not `/brain`, not hf-sync, not a joule, not LIVE.

## Why nobody else ships it

Open-weight frontier this week is racing ternary 1.58-bit models (Ternary-Bonsai-2-27B), 400×-smaller KV claims (DeepSeek V4.1 Flash card: 890 B/token), and decision-model classifiers. Those are REPORTED cards.

KHIPU-HOLO treats the attractor signature as the memory (Berloff arXiv:2603.17049) and refuses to promote a vendor efficiency claim into an operating point while energy is UNAVAILABLE. Ternary quantization here is a receipt alphabet, not a loaded Bonsai weight file.

## Hugging Face scrape (2026-09-19/20, Indie Signals + Hub)

24h hot models: `prism-ml/Ternary-Bonsai-2-27B-gguf` +705, `XingChen-AGI/Xing4.0-29B-A4B` +175, `deepseek-ai/DeepSeek-V4.1-Flash` +166, `Qwen/Qwen3.8-27B` +116.

SZLHOLDINGS inventory MEASURED this session: 47 models / 35 datasets / 22 Spaces / 14 kernels. No new Space authorized.

BITCOS (arXiv:2609.16338): `bits/weight = 2 - z`. Implemented as a formula. `z` defaults null. Never a joule.

## Run

```bash
python -B -m unittest tools.test_khipu_holo -q
```

From `tools/`:

```bash
python -B -m unittest test_khipu_holo -q
```

## Limits

- Simulation backend only. No hardware demonstration exists for Berloff AKM.
- RS here is encode + syndrome, not a production erasure decoder.
- XOR-group sketches in other cockpits are not this codeword.
- Do not merge a11oy#2208 from chat. Do not stamp OPERATIONAL=8.
