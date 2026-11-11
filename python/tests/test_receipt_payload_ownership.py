from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import datetime, timezone

from szl_frontier.receipts import EvidenceReceipt, ReceiptError, ReceiptFactory


class ReceiptPayloadOwnershipTests(unittest.TestCase):
    timestamp = datetime(2026, 11, 10, tzinfo=timezone.utc)
    key = b"unit-test-key"

    def create(self, payload, *, signed=False):
        return ReceiptFactory(
            hmac_key=self.key if signed else None, key_id="test"
        ).create(
            release_id="release", subject="ownership", payload=payload,
            created_at=self.timestamp,
        )

    def test_factory_owns_nested_inputs_and_shared_aliases(self):
        shared = {"values": [1, 2]}
        payload = {"first": shared, "second": shared}
        receipt = self.create(payload)
        digest = receipt.digest
        shared["values"].append(3)
        self.assertEqual(receipt.payload["first"]["values"], [1, 2])
        self.assertEqual(receipt.payload["second"]["values"], [1, 2])
        self.assertEqual(receipt.digest, digest)
        receipt.verify()

    def test_signed_factory_owns_nested_inputs(self):
        payload = {"nested": [{"score": 1}]}
        receipt = self.create(payload, signed=True)
        signature = receipt.signature
        payload["nested"][0]["score"] = 2
        self.assertEqual(receipt.payload["nested"][0]["score"], 1)
        self.assertEqual(receipt.signature, signature)
        receipt.verify(hmac_key=self.key)

    def test_reconstructed_receipt_owns_input_wire_payload(self):
        receipt = self.create({"nested": {"values": [1, 2]}}, signed=True)
        wire = receipt.as_mapping()
        loaded = EvidenceReceipt.from_mapping(wire)
        wire["payload"]["nested"]["values"].append(3)
        self.assertEqual(loaded.payload["nested"]["values"], [1, 2])
        loaded.verify(hmac_key=self.key)

    def test_direct_constructor_owns_input_payload(self):
        original = self.create({"nested": {"values": [1, 2]}})
        payload = {"nested": {"values": [1, 2]}}
        receipt = replace(original, payload=payload)
        payload["nested"]["values"].append(3)
        self.assertEqual(receipt.payload["nested"]["values"], [1, 2])
        receipt.verify()

    def test_unsigned_mapping_does_not_export_mutable_aliases(self):
        receipt = self.create({"nested": {"values": [1, 2]}}, signed=True)
        digest = receipt.digest
        exported = receipt.unsigned_mapping()
        exported["payload"]["nested"]["values"].append(3)
        self.assertEqual(receipt.payload["nested"]["values"], [1, 2])
        self.assertEqual(receipt.digest, digest)
        receipt.verify(hmac_key=self.key)

    def test_as_mapping_does_not_export_mutable_aliases(self):
        receipt = self.create({"nested": {"values": [1, 2]}}, signed=True)
        digest = receipt.digest
        exported = receipt.as_mapping()
        exported["payload"]["nested"]["values"].append(3)
        self.assertEqual(receipt.payload["nested"]["values"], [1, 2])
        self.assertEqual(receipt.digest, digest)
        receipt.verify(hmac_key=self.key)

    def test_existing_canonical_bytes_and_signatures_remain_compatible(self):
        receipt = self.create(
            {"list": [{"z": -0.0}, "café", None, False, 123], "tuple": (1, 2)},
            signed=True,
        )
        self.assertEqual(receipt.receipt_id, "fr_3f929832abc0dbd05d53ee3f")
        self.assertEqual(receipt.payload_digest, "63d732c3bcd6db518007b54e055412a6931e3c579f599b529c0bbdbae4b7f4dc")
        self.assertEqual(receipt.signature.value, "e9aab24426f935c3e4b3e34b038d027cb41a8b24046f514e12e3b849621f3b35")
        self.assertEqual(receipt.digest, "83563e5c4a1cac71718475ea869feef4c2c283aee0506ba7b7083266b9e5f764")
        receipt.verify(hmac_key=self.key)

    def test_nonfinite_values_still_reject_and_direct_tampering_is_detected(self):
        for value in [float("nan"), float("inf"), -float("inf")]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.create({"nested": [value]})
        receipt = self.create({"nested": {"values": [1, 2]}})
        receipt.payload["nested"]["values"].append(3)
        with self.assertRaises(ReceiptError):
            receipt.verify()

    def test_legacy_numeric_key_bytes_remain_compatible(self):
        receipt = self.create({"numeric": {2: "a", 10: "b"}}, signed=True)
        self.assertEqual(receipt.payload_digest, "44e942c2e2bb013b6acdceb971396d115bb85808d9a6fdfab6a90c0ef9cb6b50")
        self.assertEqual(receipt.signature.value, "0e01f9912cde213f9a2e02aa1f9750e6afc0d764d25db8bffcb7fc1d4020a3bc")
        self.assertEqual(receipt.digest, "5e1170047a42d65b1c095dbc864b0d3ce4fa50d00fa8d6f58cd4b98b45cace1e")
        receipt.verify(hmac_key=self.key)

    def test_cycles_and_unsupported_objects_still_reject(self):
        cyclic = []
        cyclic.append(cyclic)
        with self.assertRaises(ValueError):
            self.create({"nested": cyclic})
        with self.assertRaises(TypeError):
            self.create({"nested": object()})

    def test_container_copy_hooks_cannot_retain_caller_aliases(self):
        class RetainsAlias(list):
            def __deepcopy__(self, memo):
                raise AssertionError("custom copying hooks must not run")

        values = RetainsAlias([{"score": 1}])
        receipt = self.create({"nested": values})
        values[0]["score"] = 2
        self.assertEqual(receipt.payload["nested"], [{"score": 1}])
        receipt.verify()


if __name__ == "__main__":
    unittest.main()
