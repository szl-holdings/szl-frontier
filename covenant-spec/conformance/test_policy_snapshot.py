"""Policy identity must describe the decision rules that were actually evaluated."""
from __future__ import annotations

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from dataclasses import FrozenInstanceError
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.in_memory import InMemoryPlane
from covenant import CovenantGateway, Policy, Provenance, ReceiptLake, Tier
from covenant.policy import ALLOW, HARD_DENY, canonical


def document():
    return {
        "policy_id": "immutable-policy",
        "revision": "r1",
        "metadata": {"evidence": ["fixture"]},
        "rules": [
            {"id": "deny-danger", "effect": "hard_deny", "ops": ["WRITE"],
             "purposes": ["qa"], "tenants": ["default"],
             "content_contains": ["danger"]},
            {"id": "allow-qa", "effect": "allow", "ops": ["*"],
             "purposes": ["qa"], "tenants": ["default"]},
        ],
    }


def verdict(policy, content="danger"):
    return policy.evaluate(op="WRITE", purpose="qa", tenant="default", content=content).verdict


class PolicySnapshotTests(unittest.TestCase):
    def test_caller_rule_and_identity_mutation_cannot_change_snapshot(self):
        source = document()
        expected = hashlib.sha3_256(canonical(source).encode("utf-8")).hexdigest()
        policy = Policy(source)
        source["rules"][0]["effect"] = "allow"
        source["rules"].clear()
        source["policy_id"] = "unrecorded-policy"
        source["revision"] = "r999"
        source["metadata"]["evidence"].append("unrecorded")
        self.assertEqual(verdict(policy), HARD_DENY)
        self.assertEqual(policy.policy_id, "immutable-policy")
        self.assertEqual(policy.revision, "r1")
        self.assertEqual(policy.digest, expected)

    def test_each_nested_matcher_is_owned(self):
        for field in ("ops", "purposes", "tenants", "content_contains"):
            with self.subTest(field=field):
                source = document()
                policy = Policy(source)
                digest = policy.digest
                source["rules"][0][field][:] = ["will-not-match"]
                self.assertEqual(verdict(policy), HARD_DENY)
                self.assertEqual(policy.digest, digest)

    def test_public_rule_view_cannot_rewrite_policy(self):
        policy = Policy(document())
        with self.assertRaises(TypeError):
            policy.rules[0]["effect"] = "allow"
        with self.assertRaises((AttributeError, TypeError)):
            policy.rules[0]["ops"].append("RECALL")
        with self.assertRaises((FrozenInstanceError, AttributeError)):
            policy.rules = ()
        self.assertEqual(verdict(policy), HARD_DENY)

    def test_policy_identity_and_digest_cannot_be_reassigned(self):
        policy = Policy(document())
        for field in ("policy_id", "revision", "_digest"):
            with self.subTest(field=field):
                with self.assertRaises((FrozenInstanceError, AttributeError)):
                    setattr(policy, field, "forged")
        self.assertEqual(verdict(policy), HARD_DENY)

    def test_new_policy_is_an_explicit_version_transition(self):
        source = document()
        old = Policy(source)
        second = Policy(source)
        source["rules"][0]["effect"] = "allow"
        source["revision"] = "r2"
        new = Policy(source)
        self.assertEqual(verdict(old), HARD_DENY)
        self.assertEqual(verdict(second), HARD_DENY)
        self.assertEqual(verdict(new), ALLOW)
        self.assertNotEqual(old.digest, new.digest)
        self.assertEqual(old.digest, second.digest)

    def test_gateway_denial_receipt_binds_unchanged_policy(self):
        source = document()
        policy = Policy(source)
        expected = policy.digest
        with tempfile.TemporaryDirectory() as tmp:
            gateway = CovenantGateway(
                InMemoryPlane(), policy, ReceiptLake(str(Path(tmp) / "receipts.ndjson"))
            )
            source["rules"][0]["effect"] = "allow"
            result = gateway.write(
                actor="fixture", content="danger", purpose="qa",
                provenance=Provenance(tier=Tier.UNAVAILABLE),
            )
            self.assertFalse(result.ok)
            self.assertEqual(result.state, "BLOCKED")
            self.assertEqual(gateway.memory.count(), 0)
            self.assertEqual(result.receipt["policy_digest"], expected)
            self.assertEqual(result.receipt["verdict"], HARD_DENY)
            self.assertTrue(ReceiptLake.verify_file(gateway.lake.path)[0])

    def test_hash_preserves_canonical_json_contract(self):
        source = document()
        source["metadata"]["unicode"] = "Quechua ñ"
        policy = Policy(source)
        expected = hashlib.sha3_256(
            json.dumps(source, sort_keys=True, separators=(",", ":"),
                       ensure_ascii=False, allow_nan=False).encode("utf-8")
        ).hexdigest()
        self.assertEqual(policy.digest, expected)
        self.assertEqual(verdict(policy, "benign fact"), ALLOW)

    def test_invalid_rule_containers_are_rejected_at_construction(self):
        for rules in (None, "allow", {}, [None], ["allow"]):
            with self.subTest(rules=rules):
                source = document()
                source["rules"] = rules
                with self.assertRaises(ValueError):
                    Policy(source)

    def test_nonfinite_metadata_is_rejected_before_identity(self):
        for value in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(value=value):
                source = copy.deepcopy(document())
                source["metadata"]["value"] = value
                with self.assertRaises(ValueError):
                    Policy(source)


if __name__ == "__main__":
    unittest.main()
