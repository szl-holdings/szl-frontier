from __future__ import annotations

import tempfile
import unittest
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

from szl_frontier.receipts import ReceiptError, ReceiptFactory
from szl_frontier.state import NotificationLedger


class ReceiptAndStateTests(unittest.TestCase):
    def test_hmac_receipt_verifies_and_detects_payload_tamper(self) -> None:
        key = b"unit-test-key"
        factory = ReceiptFactory(hmac_key=key, key_id="test")
        receipt = factory.create(
            release_id="release-1",
            subject="assessment",
            payload={"score": 91, "source": "hf"},
            created_at=datetime(2026, 9, 5, 12, 0, tzinfo=timezone.utc),
        )
        receipt.verify(hmac_key=key)
        tampered = replace(receipt, payload={"score": 92, "source": "hf"})
        with self.assertRaises(ReceiptError):
            tampered.verify(hmac_key=key)

    def test_receipts_form_hash_chain(self) -> None:
        factory = ReceiptFactory()
        first = factory.create(release_id="r", subject="one", payload={"v": 1})
        second = factory.create(
            release_id="r",
            subject="two",
            payload={"v": 2},
            previous_receipt_digest=first.digest,
        )
        self.assertEqual(second.previous_receipt_digest, first.digest)
        self.assertNotEqual(first.digest, second.digest)

    def test_notification_ledger_round_trips_atomically(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state" / "ledger.json"
            ledger = NotificationLedger()
            self.assertTrue(ledger.changed("release", "abc"))
            ledger.record("release", "abc")
            ledger.save(path)
            loaded = NotificationLedger.load(path)
        self.assertFalse(loaded.changed("release", "abc"))
