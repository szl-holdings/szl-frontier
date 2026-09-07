# SPDX-License-Identifier: Apache-2.0
"""Exercise real checked-in wave inputs in the existing Python CI discovery."""
import unittest
from pathlib import Path

from szl_frontier.wave_plan import compile_plan, load

ROOT = Path(__file__).resolve().parents[2]
WAVE = ROOT / "frontier/waves/2026-09-07.json"
PINS = ROOT / "frontier/evidence/2026-09-07-upstream-model-pins.json"


class RepositoryWavePlanTests(unittest.TestCase):
    def test_september_wave_covers_every_declared_artifact(self):
        wave, pins = load(WAVE), load(PINS)
        plan = compile_plan(wave, pins)
        self.assertEqual(plan["releaseCount"], len(wave["releases"]))
        self.assertEqual(plan["artifactCount"], len(pins["models"]))
        observed = {(p["releaseId"], a["repoId"], a["revision"]) for p in plan["plans"] for a in p["artifacts"]}
        expected = {(m["releaseId"], m["repoId"], m["revision"]) for m in pins["models"]}
        self.assertEqual(observed, expected)

    def test_real_inputs_do_not_create_runtime_or_license_authority(self):
        plan = compile_plan(load(WAVE), load(PINS))
        self.assertEqual(plan["productionPromotionCount"], 0)
        self.assertFalse(plan["networkAccess"])
        for row in plan["plans"]:
            self.assertEqual(row["productionDisposition"], "HOLD")
            self.assertFalse(row["executionAuthorized"])
            self.assertIsNone(row["benchmarkResults"])
            for model in row["artifacts"]:
                self.assertFalse(model["licenseApproved"])
                self.assertFalse(model["weightsDownloaded"])


if __name__ == "__main__":
    unittest.main()
