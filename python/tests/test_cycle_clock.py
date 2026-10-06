from __future__ import annotations

import io
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from szl_frontier.invariants import check_receipt
from szl_frontier.ouroboros import collect_local_axes, run_cycle
from szl_frontier.receipts import EvidenceReceipt


TEST_NOW = datetime(2026, 9, 20, 12, tzinfo=timezone.utc)
WALL_CLOCK = datetime(2036, 9, 20, 12, tzinfo=timezone.utc)


def fixture_axes():
    return collect_local_axes(
        now=TEST_NOW,
        action_class="READ_ONLY",
        catalog_ok=True,
        live_required=False,
        git_head="1" * 40,
        git_commit_time=TEST_NOW.isoformat(),
        covenant_rules_ok=True,
    )


def legacy_fixture_axes():
    return collect_local_axes(
        now=TEST_NOW,
        action_class="READ_ONLY",
        catalog_ok=True,
        live_required=False,
        git_head="1" * 40,
        git_commit_time=TEST_NOW.isoformat(),
        formulas_ok=True,
    )


class CycleClockTests(unittest.TestCase):
    def test_deprecated_formulas_ok_keyword_matches_covenant_keyword(self) -> None:
        self.assertEqual(legacy_fixture_axes(), fixture_axes())

    def test_both_rounds_use_the_explicit_cycle_clock(self) -> None:
        with patch("szl_frontier.lambda_gate.datetime", wraps=datetime) as wall:
            wall.now.return_value = WALL_CLOCK
            report = run_cycle(catalog_ok=True, axes=fixture_axes(), now=TEST_NOW)
        self.assertEqual(report["exit"], "converged")
        self.assertEqual(report["roundsSpent"], 2)
        self.assertEqual(report["verdict"], "ALLOW")
        self.assertTrue(report["invariantsOk"])
        self.assertIs(report["productionPromotion"], False)

    def test_live_counterparty_uses_the_same_evaluation_clock(self) -> None:
        requested = []

        def opener(request, timeout=10):
            requested.append(request.full_url)
            return io.BytesIO(json.dumps({
                "full_name": "szl-holdings/szl-frontier",
                "default_branch": "main",
            }).encode("utf-8"))

        with patch("szl_frontier.lambda_gate.datetime", wraps=datetime) as wall:
            wall.now.return_value = WALL_CLOCK
            report = run_cycle(
                catalog_ok=True,
                axes=fixture_axes(),
                now=TEST_NOW,
                live=True,
                github_opener=opener,
            )
        self.assertEqual(requested, ["https://api.github.com/repos/szl-holdings/szl-frontier"])
        self.assertEqual(report["exit"], "converged")
        self.assertEqual(report["roundsSpent"], 2)
        self.assertTrue(report["invariantsOk"])
        self.assertIs(report["productionPromotion"], False)

    def test_standalone_validation_does_not_trust_receipt_time(self) -> None:
        report = run_cycle(catalog_ok=True, axes=fixture_axes(), now=TEST_NOW)
        receipt = EvidenceReceipt.from_mapping(report["receipts"][0])
        with patch("szl_frontier.lambda_gate.datetime", wraps=datetime) as wall:
            wall.now.return_value = WALL_CLOCK
            default_check = check_receipt(receipt)
            historical_check = check_receipt(receipt, now=TEST_NOW)
            expired_check = check_receipt(receipt, now=WALL_CLOCK)
        self.assertIn("G1", default_check["failed"])
        self.assertTrue(historical_check["ok"])
        self.assertIn("G1", expired_check["failed"])

    def test_explicit_clock_does_not_allow_expired_evidence(self) -> None:
        report = run_cycle(
            catalog_ok=True,
            axes=fixture_axes(),
            now=TEST_NOW + timedelta(days=1),
        )
        self.assertEqual(report["verdict"], "DENY_DEFAULT")
        self.assertIn("freshness", report["gaps"])
        self.assertIs(report["productionPromotion"], False)
