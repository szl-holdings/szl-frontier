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
from szl_frontier.flotation import build_receipt, main, selectivity_prior


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
        self.assertFalse(receipt["exhibitOnApex"])
        self.assertEqual(receipt["prior"]["state"], "UNAVAILABLE")
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
        self.assertEqual(receipt["prior"]["state"], "UNAVAILABLE")
        prior = rank.with_name("prior.py")
        self.assertTrue(prior.is_file())
        self.assertNotIn("szl_frontier", prior.read_text(encoding="utf-8"))


COMPLETE = {
    "homo_lumo_gap_eV": 4.1,
    "dipole_D": 1.2,
    "surface_charge": -0.4,
    "pH": 8.5,
    "collector_mM": 0.05,
}
STRONG = {
    "homo_lumo_gap_eV": 1.0,
    "dipole_D": 1.0,
    "surface_charge": 1.0,
    "pH": 1.0,
    "collector_mM": 1.0,
}
WEAK = {
    "homo_lumo_gap_eV": 0.0,
    "dipole_D": 0.0,
    "surface_charge": 0.0,
    "pH": 0.0,
    "collector_mM": 0.0,
}


class SelectivityPriorTests(unittest.TestCase):
    def test_missing_descriptor_abstains(self) -> None:
        features = dict(COMPLETE)
        features["homo_lumo_gap_eV"] = None
        out = selectivity_prior(features, STRONG)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertEqual(out["S_class"], "UNAVAILABLE")
        self.assertIn("homo_lumo_gap_eV", out["missing"])
        self.assertEqual(out["not"], "flotation recovery")

    def test_unset_weights_abstains(self) -> None:
        out = selectivity_prior(COMPLETE, None)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertEqual(out["not"], "flotation recovery")

    def test_empty_weights_abstains(self) -> None:
        out = selectivity_prior(COMPLETE, {})
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])

    def test_low_margin_abstains(self) -> None:
        out = selectivity_prior(COMPLETE, WEAK, tau=0.15)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIn("|2S-1|", out["reason"])
        self.assertIsNotNone(out["S"])
        self.assertLess(abs(2 * out["S"] - 1), 0.15)
        self.assertEqual(out["not"], "flotation recovery")

    def test_prior_only_is_not_recovery(self) -> None:
        out = selectivity_prior(COMPLETE, STRONG)
        self.assertEqual(out["state"], "PRIOR_ONLY")
        self.assertIsInstance(out["S"], float)
        self.assertGreaterEqual(out["S"], 0.0)
        self.assertLessEqual(out["S"], 1.0)
        self.assertEqual(out["S_class"], "SIMULATED")
        self.assertEqual(out["not"], "flotation recovery")
        self.assertNotIn("recoveryPercent", out)

    def test_payload_demo_matches_skill(self) -> None:
        demo = {
            "homo_lumo_gap_eV": None,
            "dipole_D": 1.2,
            "surface_charge": -0.4,
            "pH": 8.5,
            "collector_mM": 0.05,
        }
        out = selectivity_prior(demo, None)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertEqual(out["missing"], ["homo_lumo_gap_eV"])

    def test_nonfinite_feature_abstains(self) -> None:
        features = dict(COMPLETE)
        features["pH"] = float("nan")
        out = selectivity_prior(features, STRONG)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertEqual(out["S_class"], "UNAVAILABLE")
        self.assertIn("pH", out["missing"])
        self.assertNotIn("recoveryPercent", out)

    def test_infinite_weight_abstains(self) -> None:
        weights = dict(STRONG)
        weights["dipole_D"] = float("inf")
        out = selectivity_prior(COMPLETE, weights)
        self.assertEqual(out["state"], "ABSTAIN")
        self.assertIsNone(out["S"])
        self.assertEqual(out["S_class"], "UNAVAILABLE")

    def test_receipt_attaches_prior_without_inventing_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            table = _write(root, "reagents.csv", TABLE)
            receipt = build_receipt(table, features=COMPLETE, weights=STRONG)

        self.assertEqual(receipt["prior"]["state"], "PRIOR_ONLY")
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertFalse(receipt["exhibitOnApex"])
        self.assertEqual([row["id"] for row in receipt["rankBand"]], ["a", "c", "b"])

    def test_prior_only_cli_abstains(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            features = _write(
                root,
                "features.json",
                json.dumps(
                    {
                        "homo_lumo_gap_eV": None,
                        "dipole_D": 1.2,
                        "surface_charge": -0.4,
                        "pH": 8.5,
                        "collector_mM": 0.05,
                    }
                ),
            )
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(
                    [
                        "--manifest",
                        str(root / "missing-manifest.json"),
                        "flotation",
                        "--features",
                        str(features),
                    ]
                )
        receipt = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(receipt["prior"]["state"], "ABSTAIN")
        self.assertIsNone(receipt["rankBand"])
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertFalse(receipt["exhibitOnApex"])

    def test_cli_prior_only_with_weights_is_not_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            features = _write(root, "features.json", json.dumps(COMPLETE))
            weights = _write(root, "weights.json", json.dumps(STRONG))
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
        self.assertEqual(receipt["prior"]["state"], "PRIOR_ONLY")
        self.assertIsInstance(receipt["prior"]["S"], float)
        self.assertIsNone(receipt["rankBand"])
        self.assertIsNone(receipt["recoveryPercent"])
        self.assertFalse(receipt["exhibitOnApex"])
        self.assertEqual(receipt["energyClass"], "UNAVAILABLE")

