from __future__ import annotations

import math
import random
import unittest
from datetime import datetime, timedelta, timezone

from szl_frontier.lambda_gate import (
    AxisEvidence,
    GateError,
    evaluate_lambda_gate,
    scores_match,
    weighted_arithmetic_mean,
    weighted_geometric_mean,
)


FROZEN = datetime(2026, 9, 20, tzinfo=timezone.utc)


def axis(name: str, value: float | None, status: str = "MEASURED", **kwargs) -> AxisEvidence:
    now = kwargs.pop("now", FROZEN)
    expiry = kwargs.pop("expiry_at", (now + timedelta(days=1)).isoformat())
    return AxisEvidence(
        name=name,
        value=value,
        status=status,
        observed_at=now.isoformat(),
        expiry_at=expiry,
        **kwargs,
    )


class GeometricMeanProperties(unittest.TestCase):
    def test_zero_veto(self) -> None:
        self.assertEqual(
            weighted_geometric_mean([0.95, 0.95, 0.0], [1, 1, 1]),
            0.0,
        )

    def test_diagonal_exactness(self) -> None:
        for n in range(1, 14):
            values = [0.7] * n
            weights = [1.0] * n
            self.assertAlmostEqual(
                weighted_geometric_mean(values, weights), 0.7, places=12
            )

    def test_homogeneity(self) -> None:
        values = [0.2, 0.4, 0.8]
        weights = [0.2, 0.3, 0.5]
        base = weighted_geometric_mean(values, weights)
        scaled = weighted_geometric_mean([2.0 * v for v in values], weights)
        self.assertAlmostEqual(scaled, 2.0 * base, places=12)

    def test_unnormalized_weights_match_normalized(self) -> None:
        values = [0.3, 0.6, 0.9]
        weights = [2.0, 3.0, 5.0]
        total = sum(weights)
        self.assertAlmostEqual(
            weighted_geometric_mean(values, weights),
            weighted_geometric_mean(values, [w / total for w in weights]),
            places=12,
        )

    def test_bounded_by_min_and_max(self) -> None:
        rng = random.Random(7)
        for _ in range(200):
            n = rng.randint(2, 13)
            values = [rng.uniform(0.01, 1.0) for _ in range(n)]
            weights = [rng.uniform(0.1, 4.0) for _ in range(n)]
            geo = weighted_geometric_mean(values, weights)
            self.assertGreaterEqual(geo, min(values) - 1e-12)
            self.assertLessEqual(geo, max(values) + 1e-12)

    def test_monotonicity(self) -> None:
        rng = random.Random(11)
        for _ in range(200):
            n = rng.randint(2, 13)
            xs = [rng.uniform(0.01, 0.9) for _ in range(n)]
            ys = [min(1.0, x + rng.uniform(0.0, 0.1)) for x in xs]
            weights = [1.0] * n
            self.assertLessEqual(
                weighted_geometric_mean(xs, weights),
                weighted_geometric_mean(ys, weights) + 1e-12,
            )

    def test_rejects_negative_and_mismatched(self) -> None:
        with self.assertRaises(GateError):
            weighted_geometric_mean([0.1, -0.1], [1, 1])
        with self.assertRaises(GateError):
            weighted_geometric_mean([0.1], [1, 1])
        with self.assertRaises(GateError):
            weighted_arithmetic_mean([], [])


class FailClosedGate(unittest.TestCase):
    def test_allow_when_all_required_axes_are_high(self) -> None:
        axes = [axis(f"a{i}", 0.9) for i in range(5)]
        gate = evaluate_lambda_gate(axes, threshold=0.7, now=FROZEN)
        self.assertEqual(gate.verdict, "ALLOW")
        self.assertTrue(scores_match(gate.lambda_score, 0.9))
        self.assertFalse(gate.divergent)

    def test_missing_required_axis_is_hard_deny(self) -> None:
        axes = [
            axis("ok", 0.9),
            axis("human_approval", None, status="BLOCKED"),
        ]
        gate = evaluate_lambda_gate(axes, now=FROZEN)
        self.assertEqual(gate.verdict, "HARD_DENY")
        self.assertIsNone(gate.lambda_score)
        self.assertIn("MISSING_AXIS:human_approval", gate.reason_codes)

    def test_stale_axis_is_deny_default(self) -> None:
        stale = datetime(2020, 1, 1, tzinfo=timezone.utc)
        axes = [
            AxisEvidence(
                name="freshness",
                value=0.9,
                status="MEASURED",
                observed_at=stale.isoformat(),
                expiry_at=stale.isoformat(),
            )
        ]
        gate = evaluate_lambda_gate(axes, now=datetime(2026, 9, 20, tzinfo=timezone.utc))
        self.assertEqual(gate.verdict, "DENY_DEFAULT")
        self.assertIn("STALE_AXIS:freshness", gate.reason_codes)

    def test_zero_axis_vetoes_even_when_arithmetic_would_allow(self) -> None:
        axes = [
            axis("a", 0.95),
            axis("b", 0.95),
            axis("c", 0.95),
            axis("d", 0.95),
            axis("provenance_integrity", 0.0),
        ]
        gate = evaluate_lambda_gate(axes, threshold=0.7, now=FROZEN)
        self.assertEqual(gate.verdict, "LAMBDA_VETO")
        self.assertEqual(gate.lambda_score, 0.0)
        self.assertGreater(gate.arithmetic_score or 0.0, 0.7)
        self.assertTrue(gate.arithmetic_would_allow)
        self.assertTrue(gate.divergent)

    def test_optional_unavailable_axis_does_not_block(self) -> None:
        axes = [
            axis("required", 0.9),
            axis("human_approval", None, status="UNAVAILABLE", required=False),
        ]
        gate = evaluate_lambda_gate(axes, now=FROZEN)
        self.assertEqual(gate.verdict, "ALLOW")
