# Certified Puzzle Probe Family — adopted measurement patterns (2026-11-15)

Owner directive (2026-11-15): "push the frontier, do all your recommendations" — this
document and the module it describes implement the five measurement patterns adopted
from **Behnamian (2026), "Fair but hard: certified unique-solution puzzles generated
by language models"** (Sara Behnamian, Lund University; paper repository
sarabehnamian/Puzzle-generation-with-guaranteed-uniqueness), plus the strategic
opportunity from the co-author analysis: certified unique-solution puzzles as a
contamination-proof, regenerable probe family for the estate battery.

## The five patterns, and how they are implemented

1. **Dual independent encoding, equivalence proven.** Her core result: dual encoding
   caught every error made by exactly one encoder (40/40) and none that both encoders
   shared. `encodings_equivalent()` searches for a witness bijection that satisfies
   one encoding while violating the other, in both directions, and returns the witness
   for diagnosis. The check fails closed on clues that reference unknown values.
2. **Certify the exact text the evaluator reads.** Her one escaped error was a
   paraphrase that changed a clue's meaning while the puzzle stayed unique — the
   certificate covered the encoding, not the text. Every probe record therefore binds
   `textSha256` of the rendered clue text; evaluator prompts must quote exactly that
   text, and the battery receipt binds its hash.
3. **One probe per call, enforced structurally.** Batching changed measured accuracy
   more than puzzle difficulty did (Sonnet Sudoku exact-solution rate 88% → 25% when
   4–5 puzzles shared a call). `battery_call()` raises `BatchedCallError` for any
   call other than exactly one probe. The policy is code, not advice.
4. **Honest null results.** Her "we did not find fair zebra puzzles Haiku fails" was
   published with its scale caveats. Every property this module does not measure is
   reported `UNKNOWN` in the certificate — most importantly the deduction ladder,
   which is **NOT MEASURED** in v1 (`ladder.verdict = "UNKNOWN"`, level `null`).
   No difficulty or model-performance claims are made anywhere in this module.
5. **Every number derives from saved results.** Her paper writes every number to
   `numbers.tex` from saved results. The `certificate()` record carries the
   measurement for each claim it makes: uniqueness and minimality are re-measured at
   certificate time by exhaustive search, never trusted from generation state.

## Module surface (`python/szl_frontier/certified_puzzles.py`)

- `ZebraSpec` / `Clue`: the paper's position-DSL pattern — clues are formal
  expressions over a value-to-house mapping plus the values they read and their text.
- `generate_puzzle(spec, seed)`: seeded and fully deterministic — draw a solution,
  add true clues blocking each found counterexample (guaranteed termination),
  minimise to a fixpoint, then measure minimality per clue honestly.
- Uniqueness/minimality by exhaustive pruned search over per-category permutations
  (standard library only; no SAT dependency). Per-category all-different holds by
  construction, as in the paper's base constraint.
- `CertifiedPuzzle.certificate()`: schema `szl.frontier.certified-puzzle-probe.v1`
  with verdicts `MEASURED` / `UNKNOWN` and call policy `ONE_PROBE_PER_CALL`.

## Contamination resistance (why this family)

The whole point of the source paper's benchmark: certified puzzles can be
**regenerated fresh from new seeds at any time**, so a leaked benchmark is replaced,
not defended. That is the battery's answer to training-data contamination: probes
whose ground truth is machine-checked (unique solution, every clue necessary) and
whose instances are never fixed.

## Measured evidence (2026-11-15, Python 3.12.10, Windows)

15/15 unit tests pass in 9.32 s, including default-size generation
(4 categories × 5 houses) with measured uniqueness and minimality. Evidence saved in
the test run log; the suite is part of this PR (`python/tests/test_certified_puzzles.py`).

## Honest gaps (v1)

- The deduction ladder is NOT MEASURED. No difficulty levels are claimed.
- This module makes no LLM calls. Encodings are supplied by callers, so the
  dual-encoding check is ready for the battery's model calls but does not exercise
  them yet.
- Only zebra puzzles are implemented. Sudoku / Killer / Futoshiki and LLM-invented
  genres are future work; each addition must ship with its own measured evidence.
- Exhaustive search bounds the practical size (categories × houses); larger
  instances need a real SAT/SMT backend, which is a deliberate v2 decision.

Signed-off-by: "Lutar, Stephen P." <stephenlutar2@gmail.com>
