"""Offline T28 delivery tests. No fixture is a live notification."""

from __future__ import annotations

import unittest

from szl_frontier.seeded_ledger import SEEDED_ASSETS, apply_observation, seed_ledger
from szl_frontier.watch_materiality import FIRST_OBSERVATION, NO_MATERIAL, SUBSTANTIVE_CHANGE, hub_snapshot


def payload(oid_readme="b" * 40, oid_cfg="d" * 40):
    return {
        "id": "ibm-granite/granite-timeseries-patchtst-fm-r2",
        "sha": "a" * 40,
        "private": False,
        "gated": False,
        "disabled": False,
        "cardData": {"license": "apache-2.0"},
        "siblings": [
            {"rfilename": "README.md", "size": 30, "blobId": oid_readme},
            {"rfilename": "LICENSE", "size": 31, "blobId": "c" * 40},
            {"rfilename": "config.json", "size": 32, "blobId": oid_cfg},
        ],
    }


class TestWatchDelivery(unittest.TestCase):
    def test_seeded_ids_cover_required_families(self):
        ids = {asset["id"] for asset in SEEDED_ASSETS}
        for required in (
            "granite-patchtst-fm-r2",
            "qwen38-flash-next",
            "solar-nvfp4-pruned",
            "kimi-k3-pruned-25",
            "minicpm5",
            "native-hf-kernels",
            "trl-1-13-core-stack",
        ):
            self.assertIn(required, ids)
        self.assertTrue(all(asset["seeded"] is True for asset in SEEDED_ASSETS))
        self.assertTrue(all(asset.get("production_admitted") is not True for asset in SEEDED_ASSETS))

    def test_first_observation_is_seeded_not_alerted(self):
        granite = next(row for row in seed_ledger() if row["id"] == "granite-patchtst-fm-r2")
        snap = hub_snapshot(payload(), granite["hub_id"])
        updated, delivery = apply_observation(granite, snap, observed_at="2026-09-11T00:00:00Z")
        self.assertEqual(delivery["delta"], FIRST_OBSERVATION)
        self.assertFalse(delivery["emit_user_alert"])
        self.assertEqual(delivery["channel"], "SEEDED")
        self.assertEqual(updated["disposition"], "SEEDED_BACKLOG")

    def test_card_churn_after_seed_stays_quiet(self):
        granite = next(row for row in seed_ledger() if row["id"] == "granite-patchtst-fm-r2")
        first = hub_snapshot(payload(), granite["hub_id"])
        seeded, _ = apply_observation(granite, first, observed_at="2026-09-11T00:00:00Z")
        churn = hub_snapshot(payload(oid_readme="f" * 40), granite["hub_id"])
        updated, delivery = apply_observation(seeded, churn, observed_at="2026-09-11T01:00:00Z")
        self.assertEqual(delivery["delta"], NO_MATERIAL)
        self.assertFalse(delivery["emit_user_alert"])
        self.assertEqual(updated["disposition"], "QUIET")

    def test_substantive_change_alerts_once(self):
        granite = next(row for row in seed_ledger() if row["id"] == "granite-patchtst-fm-r2")
        first = hub_snapshot(payload(), granite["hub_id"])
        seeded, _ = apply_observation(granite, first, observed_at="2026-09-11T00:00:00Z")
        changed = hub_snapshot(payload(oid_cfg="f" * 40), granite["hub_id"])
        updated, delivery = apply_observation(seeded, changed, observed_at="2026-09-11T01:00:00Z")
        self.assertEqual(delivery["delta"], SUBSTANTIVE_CHANGE)
        self.assertTrue(delivery["emit_user_alert"])
        self.assertEqual(updated["disposition"], "MATERIAL_ALERT")
        again, second = apply_observation(updated, changed, observed_at="2026-09-11T02:00:00Z")
        self.assertFalse(second["emit_user_alert"])
        self.assertEqual(again["alerted_keys"], updated["alerted_keys"])

    def test_unpinned_and_collector_failure_are_operational(self):
        mini = next(row for row in seed_ledger() if row["id"] == "minicpm5")
        _, delivery = apply_observation(
            mini, None, collector_error="NO_PINNED_HUB_ID", observed_at="2026-09-11T00:00:00Z"
        )
        self.assertEqual(delivery["channel"], "OPERATIONAL")
        self.assertFalse(delivery["emit_user_alert"])
        granite = next(row for row in seed_ledger() if row["id"] == "granite-patchtst-fm-r2")
        _, failed = apply_observation(
            granite, None, collector_error="HTTP_429", observed_at="2026-09-11T00:00:00Z"
        )
        self.assertEqual(failed["channel"], "OPERATIONAL")
        self.assertFalse(failed["emit_user_alert"])


if __name__ == "__main__":
    unittest.main()
