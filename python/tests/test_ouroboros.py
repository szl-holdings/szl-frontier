from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request

from szl_frontier.cli import run
from szl_frontier.lambda_gate import AxisEvidence
from szl_frontier.ouroboros import (
    MAX_ROUNDS,
    load_previous,
    run_cycle,
    save_cycle_ledger,
)
from szl_frontier.receipts import EvidenceReceipt

from helpers import write_manifest


def _axis(
    name: str,
    value: float | None,
    status: str = "MEASURED",
    *,
    required: bool = True,
) -> AxisEvidence:
    now = datetime(2026, 9, 20, 12, tzinfo=timezone.utc)
    return AxisEvidence(
        name=name,
        value=value,
        status=status,
        required=required,
        observed_at=now.isoformat(),
        expiry_at=(now + timedelta(days=30)).isoformat(),
    )


def _read_only_axes(*, zero: str | None = None) -> list[AxisEvidence]:
    names = (
        "identity_integrity",
        "authorization_scope",
        "policy_conformance",
        "evidence_completeness",
        "provenance_integrity",
        "freshness",
        "schema_validity",
        "tool_boundary_safety",
        "reversibility",
        "impact_boundedness",
    )
    optional = ("human_approval", "counterparty_trust", "independent_witness")
    axes = []
    for name in names:
        if name == "evidence_completeness":
            axes.append(_axis(name, 1.0 if zero is None else 0.0))
            continue
        if name == zero:
            axes.append(_axis(name, 0.0))
        else:
            axes.append(_axis(name, 0.95))
    for name in optional:
        axes.append(_axis(name, None, "UNAVAILABLE", required=False))
    return axes


class FakeGitHub:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.urls: list[str] = []

    def __call__(self, request: Request, timeout: int = 10):
        self.urls.append(request.full_url)
        body = json.dumps(self.payload).encode("utf-8")

        class _Resp:
            def __enter__(self_inner):
                return self_inner

            def __exit__(self_inner, *args):
                return False

            def read(self_inner, _n: int) -> bytes:
                return body

        return _Resp()


class OuroborosCycleTests(unittest.TestCase):
    def test_read_only_cycle_converges_and_never_promotes(self) -> None:
        report = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(),
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        self.assertEqual(report["exit"], "converged")
        self.assertTrue(report["invariantsOk"])
        self.assertEqual(report["roundsSpent"], MAX_ROUNDS)
        self.assertIs(report["productionPromotion"], False)
        self.assertIs(report["perpetualMotion"], False)
        self.assertEqual(report["lambda"], "CONJECTURE_1")
        self.assertEqual(report["verdict"], "ALLOW")
        first, second = report["receipts"]
        self.assertEqual(second["previousReceiptDigest"], first["receiptDigest"])
        self.assertEqual(second["payload"]["incomingDigest"], first["receiptDigest"])
        self.assertEqual(second["payload"]["identity"], "receipts.in ≡ receipts.out")

    def test_zero_axis_records_non_executable_arithmetic_shadow(self) -> None:
        report = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(zero="provenance_integrity"),
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        self.assertEqual(report["exit"], "converged")
        self.assertEqual(report["verdict"], "LAMBDA_VETO")
        self.assertTrue(report["divergent"])
        shadow = report["receipts"][0]["payload"]["shadow"]
        self.assertEqual(shadow["kind"], "ARITHMETIC_COUNTERFACTUAL")
        self.assertIs(shadow["executable"], False)
        self.assertGreater(report["arithmeticScore"], 0.7)

    def test_irreversible_write_cannot_self_approve(self) -> None:
        report = run_cycle(
            catalog_ok=True,
            action_class="IRREVERSIBLE_WRITE",
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        self.assertEqual(report["verdict"], "HARD_DENY")
        self.assertIs(report["productionPromotion"], False)
        self.assertIn("human_approval", report["gaps"])

    def test_parent_hard_deny_cannot_be_lifted_to_allow(self) -> None:
        denied = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(zero="provenance_integrity"),
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        parent = EvidenceReceipt.from_mapping(denied["receipts"][-1])
        lifted = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(),
            previous=parent,
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        self.assertEqual(lifted["exit"], "aborted")
        failed = lifted["invariantResults"][0]["failed"]
        self.assertIn("G3", failed)

    def test_ledger_round_trip_binds_parent_receipt(self) -> None:
        first = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(),
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cycle.json"
            save_cycle_ledger(path, first)
            previous = load_previous(path)
        self.assertIsNotNone(previous)
        assert previous is not None
        self.assertEqual(previous.digest, first["chainHead"])
        second = run_cycle(
            catalog_ok=True,
            axes=_read_only_axes(),
            previous=previous,
            now=datetime(2026, 9, 20, 13, tzinfo=timezone.utc),
        )
        self.assertEqual(second["exit"], "converged")
        self.assertEqual(
            second["receipts"][0]["previousReceiptDigest"], previous.digest
        )

    def test_github_allow_list_rejects_other_hosts(self) -> None:
        with self.assertRaisesRegex(Exception, "allow-list"):
            # Force the helper to see a bad URL via monkeypatch of origin? The
            # owner/name path is always api.github.com. Direct URL check:
            from szl_frontier.ouroboros import _require_github_url

            _require_github_url("https://evil.example/repos/x/y")

    def test_live_counterparty_uses_injected_opener(self) -> None:
        opener = FakeGitHub(
            {
                "full_name": "szl-holdings/szl-frontier",
                "default_branch": "main",
                "pushed_at": "2026-09-20T00:00:00Z",
            }
        )
        report = run_cycle(
            catalog_ok=True,
            live=True,
            axes=_read_only_axes(),
            github_opener=opener,
            now=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
        )
        self.assertEqual(report["exit"], "converged")
        self.assertTrue(report["live"])
        self.assertTrue(
            any("szl-holdings/szl-frontier" in url for url in opener.urls)
        )

    def test_cli_cycle_is_machine_readable_and_proposal_only(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = write_manifest(Path(directory) / "manifest.json", releases=[])
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(["--manifest", str(manifest), "cycle"])
        report = json.loads(output.getvalue())
        self.assertIn(code, (0, 3))
        self.assertEqual(report["schema"], "szl.frontier.ouroboros-cycle.v1")
        self.assertIs(report["productionPromotion"], False)
        self.assertEqual(report["authority"], "PROPOSAL_ONLY")
        self.assertLessEqual(report["roundsSpent"], MAX_ROUNDS)
        self.assertTrue(report["terminating"])
