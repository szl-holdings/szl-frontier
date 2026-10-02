from __future__ import annotations

import hashlib
import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from szl_frontier.cli import run
from szl_frontier.flotation import build_prior_receipt, build_receipt, main, prior


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

    def test_skill_runner_is_portable(self) -> None:
        rank = (
            Path(__file__).resolve().parents[2]
            / "docs"
            / "skills"
            / "flotation-selectivity-before-bench"
            / "rank.py"
        )
        source = rank.read_text(encoding="utf-8")
        self.assertNotIn("szl_frontier", source)
        with tempfile.TemporaryDirectory() as directory:
            table = Path(directory) / "reagents.csv"
            table.write_text("id,public_score\na,1\n", encoding="utf-8")
            proc = subprocess.run(
                [sys.executable, str(rank), "--table", str(table)],
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
        receipt = json.loads(proc.stdout)
        self.assertEqual(proc.returncode, 0)
        self.assertEqual(receipt["directive"], "DEFER")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertEqual(receipt["energyClass"], "UNAVAILABLE")


NEEDED = ("homo_lumo_gap_eV", "dipole_D", "surface_charge", "pH", "collector_mM")
COMPLETE = {
    "homo_lumo_gap_eV": 4.1,
    "dipole_D": 1.2,
    "surface_charge": -0.4,
    "pH": 8.5,
    "collector_mM": 0.05,
}
STRONG = {key: 1.0 for key in NEEDED}
WEAK = {key: 0.0 for key in NEEDED}


class SelectivityPriorTests(unittest.TestCase):
    def test_missing_descriptor_abstains(self) -> None:
        features = dict(COMPLETE)
        features["homo_lumo_gap_eV"] = None
        out = prior(features, STRONG)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertIn("homo_lumo_gap_eV", out["missing"])
        self.assertEqual(out["not"], "flotation recovery")
        self.assertIsNone(out["recoveryPercent"])

    def test_unset_weights_abstains(self) -> None:
        out = prior(COMPLETE, None)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertEqual(out["not"], "flotation recovery")
        self.assertIsNone(out["recoveryPercent"])

    def test_empty_weights_abstains(self) -> None:
        out = prior(COMPLETE, {})
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])

    def test_low_margin_abstains(self) -> None:
        out = prior(COMPLETE, WEAK, tau=0.15)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertEqual(out["reason"], "low margin")
        self.assertIsNotNone(out["S"])
        self.assertLess(abs(2 * out["S"] - 1), 0.15)
        self.assertEqual(out["S_label"], "SIMULATED")
        self.assertIsNone(out["recoveryPercent"])

    def test_prior_only_is_not_recovery(self) -> None:
        out = prior(COMPLETE, STRONG)
        self.assertEqual(out["state"], "PRIOR_ONLY")
        self.assertIsInstance(out["S"], float)
        self.assertGreaterEqual(out["S"], 0.0)
        self.assertLessEqual(out["S"], 1.0)
        self.assertEqual(out["S_label"], "SIMULATED")
        self.assertEqual(out["not"], "flotation recovery")
        self.assertIsNone(out["recoveryPercent"])

    def test_nonfinite_feature_abstains(self) -> None:
        features = dict(COMPLETE)
        features["pH"] = float("nan")
        out = prior(features, STRONG)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIn("pH", out["missing"])
        self.assertIsNone(out["S"])

    def test_cli_features_never_emits_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            features = root / "features.json"
            weights = root / "weights.json"
            features.write_text(json.dumps(COMPLETE), encoding="utf-8")
            weights.write_text(json.dumps(STRONG), encoding="utf-8")
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(
                    [
                        "--manifest",
                        str(root / "missing-manifest.json"),
                        "flotation",
                        "--features",
                        str(features),
                        "--weights",
                        str(weights),
                    ]
                )
        receipt = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(receipt["directive"], "DEFER")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertEqual(receipt["prior"]["state"], "PRIOR_ONLY")
        self.assertEqual(receipt["energyClass"], "UNAVAILABLE")

    def test_prior_runner_is_portable(self) -> None:
        prior_path = (
            Path(__file__).resolve().parents[2]
            / "docs"
            / "skills"
            / "flotation-selectivity-before-bench"
            / "prior.py"
        )
        source = prior_path.read_text(encoding="utf-8")
        self.assertNotIn("import szl_frontier", source)
        self.assertNotIn("from szl_frontier", source)
        with tempfile.TemporaryDirectory() as directory:
            features = Path(directory) / "features.json"
            features.write_text(json.dumps({"dipole_D": 1.2}), encoding="utf-8")
            proc = subprocess.run(
                [sys.executable, str(prior_path), "--features", str(features)],
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
        receipt = json.loads(proc.stdout)
        self.assertEqual(proc.returncode, 0)
        self.assertEqual(receipt["prior"]["state"], "ABSTAIN")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertIsNone(receipt["prior"]["S"])

    def test_build_prior_receipt_hashes_nothing_as_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            features = root / "features.json"
            features.write_text(json.dumps(COMPLETE), encoding="utf-8")
            receipt = build_prior_receipt(features, None)
        self.assertEqual(receipt["prior"]["state"], "ABSTAIN")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertEqual(receipt["lambda"], "OPEN")

