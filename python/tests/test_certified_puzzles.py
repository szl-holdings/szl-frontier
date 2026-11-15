from __future__ import annotations

import unittest

from szl_frontier.certified_puzzles import (
    BatchedCallError,
    CALL_POLICY,
    Clue,
    PuzzleError,
    ZebraSpec,
    battery_call,
    count_solutions,
    encodings_equivalent,
    generate_puzzle,
)


def _spec(categories: int, houses: int) -> ZebraSpec:
    values = {}
    names: list[str] = []
    for cat in range(categories):
        cname = f"cat{cat}"
        values[cname] = tuple(f"{cname}-value{index}" for index in range(houses))
        names.append(cname)
    return ZebraSpec(categories=tuple(names), values=values, houses=houses)


def _somewhere_left(left: str, right: str) -> Clue:
    return Clue(
        expression=(lambda x, y: lambda p: p[x] < p[y])(left, right),
        values=(left, right),
        text=f"The {left} is somewhere to the left of the {right}.",
    )


class SpecTests(unittest.TestCase):
    def test_rejects_wrong_value_count(self) -> None:
        with self.assertRaises(PuzzleError):
            ZebraSpec(categories=("a",), values={"a": ("v1",)}, houses=2)

    def test_rejects_duplicate_value_names(self) -> None:
        with self.assertRaises(PuzzleError):
            ZebraSpec(
                categories=("a", "b"),
                values={"a": ("same", "a2"), "b": ("same", "b2")},
                houses=2,
            )


class GenerationTests(unittest.TestCase):
    def test_generation_is_deterministic(self) -> None:
        spec = _spec(3, 4)
        first = generate_puzzle(spec, seed=20261115)
        second = generate_puzzle(spec, seed=20261115)
        self.assertEqual(first.text, second.text)
        self.assertEqual(first.text_sha256, second.text_sha256)

    def test_uniqueness_and_truth_measured(self) -> None:
        spec = _spec(3, 4)
        puzzle = generate_puzzle(spec, seed=7)
        self.assertEqual(count_solutions(spec, puzzle.clues), 1)
        for clue in puzzle.clues:
            self.assertTrue(clue.expression(puzzle.solution), clue.text)

    def test_minimality_measured_not_assumed(self) -> None:
        spec = _spec(3, 4)
        puzzle = generate_puzzle(spec, seed=11)
        for index in range(len(puzzle.clues)):
            reduced = puzzle.clues[:index] + puzzle.clues[index + 1 :]
            self.assertNotEqual(count_solutions(spec, reduced), 1)
        self.assertTrue(puzzle.minimal)

    def test_default_size_generation_completes(self) -> None:
        spec = _spec(4, 5)
        puzzle = generate_puzzle(spec, seed=1)
        self.assertEqual(count_solutions(spec, puzzle.clues), 1)
        self.assertTrue(puzzle.minimal)
        self.assertGreaterEqual(len(puzzle.clues), 4)


class CertificateTests(unittest.TestCase):
    def test_certificate_binds_rendered_text_hash(self) -> None:
        puzzle = generate_puzzle(_spec(3, 4), seed=3)
        record = puzzle.certificate()
        import hashlib

        self.assertEqual(
            record["textSha256"],
            hashlib.sha256(puzzle.text.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(record["callPolicy"], CALL_POLICY)

    def test_certificate_reports_ladder_unknown(self) -> None:
        record = generate_puzzle(_spec(3, 4), seed=5).certificate()
        self.assertEqual(record["ladder"]["verdict"], "UNKNOWN")
        self.assertIsNone(record["ladder"]["level"])
        self.assertEqual(record["encodingEquivalence"]["verdict"], "UNKNOWN")

    def test_dual_encoding_measured_equivalent_for_same_clues(self) -> None:
        puzzle = generate_puzzle(_spec(3, 4), seed=9)
        record = puzzle.certificate(
            dual_encodings=(list(puzzle.clues), list(puzzle.clues))
        )
        self.assertEqual(record["encodingEquivalence"]["verdict"], "MEASURED")
        self.assertTrue(record["encodingEquivalence"]["equivalent"])

    def test_dual_encoding_catches_direction_flip(self) -> None:
        puzzle = generate_puzzle(_spec(3, 4), seed=13)
        flipped = []
        for clue in puzzle.clues:
            if len(clue.values) == 2 and "somewhere to the left" in clue.text:
                left, right = clue.values
                flipped.append(
                    Clue(
                        expression=(lambda x, y: lambda p: p[y] < p[x])(left, right),
                        values=clue.values,
                        text=clue.text + " [misread: direction flipped]",
                    )
                )
            else:
                flipped.append(clue)
        equivalent, witness = encodings_equivalent(puzzle.spec, puzzle.clues, flipped)
        self.assertFalse(equivalent)
        self.assertIsNotNone(witness)

    def test_dual_encoding_needs_exactly_two(self) -> None:
        puzzle = generate_puzzle(_spec(3, 4), seed=17)
        with self.assertRaises(PuzzleError):
            puzzle.certificate(dual_encodings=(list(puzzle.clues),))

    def test_encoding_with_unknown_value_fails_closed(self) -> None:
        puzzle = generate_puzzle(_spec(3, 4), seed=19)
        bad = Clue(
            expression=lambda p: True,
            values=("ghost-value",),
            text="The ghost is in house 1.",
        )
        with self.assertRaises(PuzzleError):
            encodings_equivalent(puzzle.spec, puzzle.clues, [bad])


class CallPolicyTests(unittest.TestCase):
    def test_single_probe_passes(self) -> None:
        probe = object()
        self.assertIs(battery_call(probe), probe)

    def test_batch_rejected(self) -> None:
        with self.assertRaises(BatchedCallError):
            battery_call(object(), object())

    def test_empty_call_rejected(self) -> None:
        with self.assertRaises(BatchedCallError):
            battery_call()


if __name__ == "__main__":
    unittest.main()
