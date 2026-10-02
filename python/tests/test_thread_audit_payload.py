# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Offline self-audit for the encoded thread-audit payload. No network."""
from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAYLOAD = ROOT / "python" / "payload" / "szl_thread_audit_payload.py"
CONTRACT = ROOT / "public" / "frontier" / "thread-audit.v1.json"


def load_payload():
    spec = importlib.util.spec_from_file_location("szl_thread_audit_payload", PAYLOAD)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ThreadAuditPayloadTests(unittest.TestCase):
    def test_payload_self_audit_pass(self) -> None:
        payload = load_payload()
        doc = payload.build()
        fails = payload.audit(doc)
        self.assertEqual(fails, [])
        self.assertEqual(doc["schema"], "szl.frontier.thread-audit-payload/v1")
        self.assertIs(doc["hold"]["productionAuthorization"], False)
        self.assertIs(doc["hold"]["fileAuditComplete"], False)
        self.assertEqual(doc["hold"]["sourceContentFilesRead"], 0)
        self.assertEqual(doc["hold"]["envelopeAuthority"], "NONE")
        self.assertIs(doc["execution"]["networkInThisPayload"], False)
        self.assertIs(doc["execution"]["mergeProtectedMain"], False)
        self.assertNotEqual(doc["census"]["counts"]["hfKernels"], doc["census"]["counts"]["hfModels"])

    def test_public_contract_matches_encoded_digest(self) -> None:
        payload = load_payload()
        doc = payload.build()
        self.assertTrue(CONTRACT.is_file(), "public/frontier/thread-audit.v1.json missing")
        published = json.loads(CONTRACT.read_text(encoding="utf-8"))
        self.assertEqual(published["digest"], doc["digest"])
        self.assertEqual(published["schema"], doc["schema"])
        self.assertIs(published["hold"]["optionalEvaluationLiftsHold"], False)


if __name__ == "__main__":
    unittest.main()
