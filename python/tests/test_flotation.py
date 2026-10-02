from __future__ import annotations

import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from szl_frontier.cli import run
from szl_frontier.flotation import build_receipt, main


def _write(directory: Path, name: str, text: str) -> Path:
    path = directory / name
    path.write_text(text, encoding="utf-8")
    return path


TABLE = "id,public_score,recovery_percent\na,3.0,10\nc,2.0,50\nb,1.0,99\n"


class FlotationReceiptTests(unittest.TestCase):
    def test_missing_bench_is_modeled_and_abstains(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", TABLE)
            receipt = build_receipt(table)

        self.assertEqual(receipt["evidenceTier"], "SOFTWARE_RECEIPT")
        self.assertEqual(receipt["directive"], "DEFER")
        self.assertEqual(receipt["selectivity"], "MODELED")
        self.assertEqual(receipt["claims"]["input"], "UNAVAILABLE")
        self.assertEqual(receipt["claims"]["identity"], "MEASURED")
        self.assertEqual(receipt["claims"]["execution"], "SOFTWARE")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertIsNone(receipt["benchSha256"])
        self.assertEqual(receipt["energyClass"], "UNAVAILABLE")
        self.assertFalse(receipt["ato"])
        self.assertEqual(receipt["lambda"], "OPEN")
        self.assertFalse(receipt["nexusOrgan"])
        self.assertFalse(receipt["mintNexusSpace"])
        self.assertEqual(receipt["trustCeiling"], 0.97)
        self.assertEqual(
            [row["id"] for row in receipt["rankBand"]],
            ["a", "c", "b"],
        )
        self.assertEqual(
            [row["band"] for row in receipt["rankBand"]],
            ["high", "mid", "low"],
        )
        visible = json.dumps(
            {
                "rankBand": receipt["rankBand"],
                "note": receipt["note"],
                "scoreColumn": receipt["scoreColumn"],
                "recoveryPercent": receipt["recoveryPercent"],
            }
        )
        self.assertNotIn("99", visible)
        self.assertNotIn("50", visible)
        self.assertNotIn("recovery_percent", visible)

    def test_bench_hash_releases_receipt_without_a_recovery_percent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", TABLE)
            bench = _write(root, "bench.csv", "id,recovery_percent\na,12.5\n")
            receipt = build_receipt(table, bench)
            digest = hashlib.sha256(bench.read_bytes()).hexdigest()

        self.assertEqual(receipt["directive"], "RELEASE")
        self.assertEqual(receipt["selectivity"], "MODELED")
        self.assertEqual(receipt["claims"]["input"], "MEASURED")
        self.assertEqual(receipt["benchSha256"], digest)
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertNotIn("12.5", json.dumps(receipt))

    def test_recovery_column_as_score_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", TABLE)
            receipt = build_receipt(table, score_column="recovery_percent")

        self.assertEqual(receipt["directive"], "BLOCK")
        self.assertIsNone(receipt["rankBand"])
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertEqual(receipt["energyClass"], "UNAVAILABLE")

    def test_non_numeric_score_defers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", "id,public_score\na,high\n")
            receipt = build_receipt(table)

        self.assertEqual(receipt["directive"], "DEFER")
        self.assertIsNone(receipt["rankBand"])
        self.assertIsNone(receipt["recoveryPercent"])

    def test_duplicate_id_defers_without_a_rank(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", "id,public_score\na,1\na,2\n")
            receipt = build_receipt(table)
        self.assertEqual(receipt["directive"], "DEFER")
        self.assertIsNone(receipt["rankBand"])
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertIn("duplicate", receipt["note"])

    def test_missing_table_raises(self) -> None:
        with self.assertRaises(Exception):
            build_receipt(Path("does-not-exist-reagents.csv"))

    def test_missing_score_column_defers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", "id,note\na,collector\n")
            receipt = build_receipt(table)

        self.assertEqual(receipt["directive"], "DEFER")
        self.assertIsNone(receipt["rankBand"])
        self.assertIn("no declared public score", receipt["note"])

    def test_cli_prints_the_receipt(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", "reagent,screen_score\nx,1\ny,2\n")
            output = io.StringIO()
            with redirect_stdout(output):
                code = main(["--table", str(table)])

        receipt = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(receipt["directive"], "DEFER")
        self.assertEqual([row["id"] for row in receipt["rankBand"]], ["y", "x"])
        self.assertEqual(receipt["scoreColumn"], "screen_score")
        self.assertIsNone(receipt["recoveryPercent"])

    def test_cli_block_exits_2_without_loading_a_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", TABLE)
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(
                    [
                        "--manifest",
                        str(root / "missing-manifest.json"),
                        "flotation",
                        "--table",
                        str(table),
                        "--score-column",
                        "recovery_percent",
                    ]
                )
        receipt = json.loads(output.getvalue())
        self.assertEqual(code, 2)
        self.assertEqual(receipt["directive"], "BLOCK")
        self.assertIsNone(receipt["recoveryPercent"])
