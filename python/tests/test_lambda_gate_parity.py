# SPDX-License-Identifier: Apache-2.0
"""Golden-vector parity for the SOFTWARE Λ gate.

The fixture pins what python/szl_frontier/lambda_gate.py (the reference)
returns for each case, and what the TypeScript mirrors must return. This test
recomputes every case with the reference, so the fixture cannot drift from
Python; src/lib/frontier/lambda-gate.parity.test.ts holds the TypeScript side
to the same file. Only the two documented known_differences are allowed.
"""

from __future__ import annotations

import json
import math
import unittest
from datetime import datetime
from pathlib import Path

from szl_frontier.lambda_gate import AxisEvidence, GateError, evaluate_lambda_gate

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "lambda_gate_parity_v1.json"
STATE_MAP = {"MEASURED": "EVALUATED", "BLOCKED": "BLOCKED"}
SCORES = ("lambdaScore", "arithmeticScore")
EXACT = ("verdict", "reasonCodes", "gaps", "arithmeticWouldAllow", "divergent", "state")


def _load() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _close(a: float | None, b: float | None, tol: float) -> bool:
    if a is None or b is None:
        return a is None and b is None
    return math.isclose(a, b, rel_tol=0.0, abs_tol=tol)


class LambdaGateParityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.fx = _load()
        self.now = datetime.fromisoformat(self.fx["now"].replace("Z", "+00:00"))
        self.tol = float(self.fx["score_abs_tol"])

    def test_fixture_is_well_formed(self) -> None:
        self.assertEqual(self.fx["schema"], "szl.lambda.parity/v1")
        ids = [case["id"] for case in self.fx["cases"]]
        self.assertEqual(len(ids), len(set(ids)), "duplicate case id")
        self.assertGreaterEqual(len(ids), 30)
        verdicts = {case["python"].get("verdict") for case in self.fx["cases"]}
        for verdict in ("ALLOW", "ESCALATE", "LAMBDA_VETO", "HARD_DENY", "DENY_DEFAULT"):
            self.assertIn(verdict, verdicts, f"fixture lacks a {verdict} case")
        self.assertTrue(any("error" in case["python"] for case in self.fx["cases"]))

    def test_reference_reproduces_every_case(self) -> None:
        for case in self.fx["cases"]:
            with self.subTest(case=case["id"]):
                expected = case["python"]
                if "error" in expected:
                    with self.assertRaises(GateError):
                        axes = [AxisEvidence.from_mapping(a) for a in case["axes"]]
                        evaluate_lambda_gate(axes, threshold=case["threshold"], now=self.now)
                    continue
                axes = [AxisEvidence.from_mapping(a) for a in case["axes"]]
                got = evaluate_lambda_gate(axes, threshold=case["threshold"], now=self.now).as_mapping()
                for key in EXACT:
                    self.assertEqual(got[key], expected[key], key)
                for key in SCORES:
                    self.assertTrue(_close(got[key], expected[key], self.tol), key)

    def test_typescript_expectations_differ_only_as_documented(self) -> None:
        allowed = set(self.fx["allowed_construction_refusals"])
        for case in self.fx["cases"]:
            with self.subTest(case=case["id"]):
                py, ts = case["python"], case["typescript"]
                if "error" in py:
                    if case["id"] in allowed:
                        self.assertEqual(ts.get("verdict"), "HARD_DENY")
                    else:
                        self.assertEqual(ts, py)
                    continue
                for key in EXACT:
                    want = STATE_MAP[py[key]] if key == "state" else py[key]
                    self.assertEqual(ts[key], want, key)
                for key in SCORES:
                    self.assertTrue(_close(ts[key], py[key], self.tol), key)


if __name__ == "__main__":
    unittest.main()
