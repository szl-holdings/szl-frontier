from __future__ import annotations

import unittest
from copy import deepcopy

from szl_frontier.domain import FrontierRelease, ReleaseSignals, SchemaError

from helpers import baseline_release


class DomainTests(unittest.TestCase):
    def test_signal_bounds_are_fail_closed(self) -> None:
        with self.assertRaises(SchemaError):
            ReleaseSignals(impact=26, estate_fit=1, evidence_quality=1, integration_readiness=1, risk_penalty=1)

    def test_release_rejects_non_hugging_face_sources(self) -> None:
        item = deepcopy(baseline_release())
        item["primarySource"] = "https://example.com/model"
        with self.assertRaises(SchemaError):
            FrontierRelease.from_mapping(item)

    def test_release_round_trip_preserves_watch_and_gates(self) -> None:
        release = FrontierRelease.from_mapping(baseline_release())
        mapped = release.as_mapping()
        self.assertEqual(mapped["watch"]["repoId"], "example/baseline-model")
        self.assertEqual(mapped["gates"][1]["state"], "pending")
