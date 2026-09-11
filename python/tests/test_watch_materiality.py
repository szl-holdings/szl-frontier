"""Offline T28 materiality tests. Fixtures are not live Hub observations."""

from __future__ import annotations

import copy
import unittest

from szl_frontier.watch_materiality import (
    FIRST_OBSERVATION,
    NO_MATERIAL,
    RIGHTS_CHANGE,
    SUBSTANTIVE_CHANGE,
    UNKNOWN_IDENTITIES,
    WatchError,
    hub_snapshot,
    material_delta,
    should_alert,
)


def hub_payload():
    return {
        "id": "Qwen/Qwen3.8-Flash-Next",
        "sha": "a" * 40,
        "private": False,
        "gated": False,
        "disabled": False,
        "cardData": {"license": "other"},
        "siblings": [
            {"rfilename": "README.md", "size": 30, "blobId": "b" * 40},
            {"rfilename": "LICENSE", "size": 31, "blobId": "c" * 40},
            {"rfilename": "config.json", "size": 32, "blobId": "d" * 40},
            {
                "rfilename": "model-00001.safetensors",
                "size": 100,
                "lfs": {"oid": "e" * 64, "size": 100},
            },
        ],
    }


def snapshot(value=None):
    return hub_snapshot(value or hub_payload(), "Qwen/Qwen3.8-Flash-Next", "model")


class TestWatchMateriality(unittest.TestCase):
    def test_first_seen_not_new_release(self):
        self.assertEqual(material_delta(None, snapshot()), FIRST_OBSERVATION)
        self.assertFalse(
            should_alert(
                delta=FIRST_OBSERVATION,
                seeded=True,
                already_alerted_key=None,
                last_alert_key=None,
            )
        )

    def test_card_churn_not_material(self):
        before = snapshot()
        data = hub_payload()
        data["sha"] = "f" * 40
        data["siblings"][0]["blobId"] = "f" * 40
        self.assertEqual(material_delta(before, snapshot(data)), NO_MATERIAL)

    def test_config_change_material(self):
        data = hub_payload()
        data["siblings"][2]["blobId"] = "f" * 40
        self.assertEqual(material_delta(snapshot(), snapshot(data)), SUBSTANTIVE_CHANGE)

    def test_rights_change_material(self):
        data = hub_payload()
        data["siblings"][1]["blobId"] = "f" * 40
        self.assertEqual(material_delta(snapshot(), snapshot(data)), RIGHTS_CHANGE)

    def test_model_bytes_change_material(self):
        data = hub_payload()
        data["siblings"][3]["lfs"]["oid"] = "f" * 64
        self.assertEqual(material_delta(snapshot(), snapshot(data)), SUBSTANTIVE_CHANGE)

    def test_missing_file_hashes_unknown(self):
        data = hub_payload()
        del data["siblings"][3]["lfs"]
        result = snapshot(data)
        self.assertIs(result["inventory_complete_for_change_detection"], False)
        self.assertEqual(material_delta(snapshot(), result), UNKNOWN_IDENTITIES)

    def test_duplicate_files_rejected(self):
        data = hub_payload()
        data["siblings"].append(copy.deepcopy(data["siblings"][0]))
        with self.assertRaises(WatchError):
            snapshot(data)

    def test_weights_not_downloaded(self):
        self.assertIs(snapshot()["weights_downloaded"], False)
        self.assertIs(snapshot()["production_admitted"], False)

    def test_idempotent_alert_key(self):
        key = "qwen|" + SUBSTANTIVE_CHANGE + "|abc"
        self.assertFalse(
            should_alert(
                delta=SUBSTANTIVE_CHANGE,
                seeded=True,
                already_alerted_key=key,
                last_alert_key=key,
            )
        )


if __name__ == "__main__":
    unittest.main()
