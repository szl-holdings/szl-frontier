# SPDX-License-Identifier: Apache-2.0
"""Owner integration: payload second-reader lives beside the control plane."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "payload"))

import szl_payload_contract as payload  # noqa: E402


class PayloadOwnerTests(unittest.TestCase):
    def test_consistency_keeps_metrics_distinct(self):
        result = payload.consistency(
            {
                "k": 2,
                "task_ids": ["a", "b"],
                "runs": [
                    {"task_id": "a", "repeat": 0, "success": True},
                    {"task_id": "a", "repeat": 1, "success": False},
                    {"task_id": "b", "repeat": 0, "success": True},
                    {"task_id": "b", "repeat": 1, "success": True},
                ],
            }
        )
        self.assertEqual(result["mean_at_k"], 0.75)
        self.assertEqual(result["pass_power_k"], 0.5)
        self.assertEqual(result["pass_at_k_empirical"], 1.0)
        self.assertFalse(result["complete"] is False)

    def test_second_reader_never_authorizes_production(self):
        self.assertIn("production_authorization", payload.FALSE_FIELDS)
        self.assertEqual(payload.SCOPE, "PUBLIC_DEFAULT_REVISION_FILE_METADATA_ONLY")
