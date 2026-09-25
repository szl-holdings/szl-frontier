from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from szl_frontier.invariants import check_receipt
from szl_frontier.lambda_gate import AxisEvidence, evaluate_lambda_gate
from szl_frontier.receipts import ReceiptFactory


def _axis(name: str, value: float) -> AxisEvidence:
    now = datetime(2026, 9, 20, tzinfo=timezone.utc)
    return AxisEvidence(
        name=name,
        value=value,
        status="MEASURED",
        observed_at=now.isoformat(),
        expiry_at=(now + timedelta(days=1)).isoformat(),
    )


def _payload(axes: list[AxisEvidence], **overrides) -> dict:
    gate = evaluate_lambda_gate(axes)
    body = {
        "schema": "szl.frontier.ouroboros-cycle.v1",
        "authority": "PROPOSAL_ONLY",
        "state": "PROPOSAL_ONLY",
        "lambda": "CONJECTURE_1",
        "lambdaNeverATheorem": True,
        "energy": "UNAVAILABLE",
        "converge": {"semantic_consensus": "NOT_MEASURED"},
        "signed": False,
        "signatures": [],
        "verdict": gate.verdict,
        "lambdaScore": gate.lambda_score,
        "arithmeticScore": gate.arithmetic_score,
        "threshold": gate.threshold,
        "divergent": gate.divergent,
        "shadow": None,
        "productionAuthorized": False,
        "trainingAdmission": False,
        "axes": [axis.as_mapping() for axis in axes],
        "kind": "SOFTWARE",
    }
    body.update(overrides)
    return body


class InvariantTests(unittest.TestCase):
    def test_honest_unsigned_receipt_passes(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="szl-frontier-ouroboros-cycle",
            subject="round-1",
            payload=_payload([_axis("a", 0.9), _axis("b", 0.9)]),
        )
        result = check_receipt(receipt)
        self.assertTrue(result["ok"], result["failed"])
        self.assertEqual(result["lambda"], "CONJECTURE_1")

    def test_signed_true_without_signatures_fails_i1(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload([_axis("a", 0.9)], signed=True),
        )
        result = check_receipt(receipt)
        self.assertIn("I1", result["failed"])

    def test_lambda_theorem_claim_fails_i3(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload(
                [_axis("a", 0.9)],
                **{
                    "lambda": "PROVEN",
                    "lambdaNeverATheorem": False,
                    "lambdaClaim": "lambda_theorem",
                },
            ),
        )
        result = check_receipt(receipt)
        self.assertIn("I3", result["failed"])

    def test_self_promotion_fails_i4(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload([_axis("a", 0.9)], productionAuthorized=True),
        )
        result = check_receipt(receipt)
        self.assertIn("I4", result["failed"])

    def test_fabricated_joules_fail_i8(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload([_axis("a", 0.9)], energy=12.4, joules=12.4),
        )
        result = check_receipt(receipt)
        self.assertIn("I8", result["failed"])

    def test_tampered_lambda_score_fails_g1(self) -> None:
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload([_axis("a", 0.9), _axis("b", 0.9)], lambdaScore=0.11),
        )
        result = check_receipt(receipt)
        self.assertIn("G1", result["failed"])

    def test_executable_shadow_fails_g2(self) -> None:
        axes = [_axis("a", 0.95), _axis("b", 0.95), _axis("c", 0.0)]
        receipt = ReceiptFactory().create(
            release_id="r",
            subject="s",
            payload=_payload(
                axes,
                shadow={
                    "kind": "ARITHMETIC_COUNTERFACTUAL",
                    "executable": True,
                },
            ),
        )
        result = check_receipt(receipt)
        self.assertIn("G2", result["failed"])

    def test_hmac_receipt_passes_when_key_supplied(self) -> None:
        key = b"unit-test-key"
        receipt = ReceiptFactory(hmac_key=key, key_id="test").create(
            release_id="r",
            subject="s",
            payload=_payload([_axis("a", 0.9)], signed=True),
        )
        result = check_receipt(receipt, hmac_key=key)
        self.assertTrue(result["ok"], result["failed"])
