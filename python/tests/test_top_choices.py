from __future__ import annotations

import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from szl_frontier.catalog import CatalogLoader
from szl_frontier.domain import SourceSnapshot
from szl_frontier.engine import FrontierEngine

from helpers import write_manifest


class FakeHF:
    def __init__(self, snapshots: dict[str, SourceSnapshot]) -> None:
        self.snapshots = snapshots

    def snapshot(self, release):
        return self.snapshots[release.id]


class TopChoiceTests(unittest.TestCase):
    def _catalog(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        return CatalogLoader(write_manifest(Path(temp.name) / "manifest.json", releases=[])).load()

    def test_k2_exact_baseline_is_not_a_new_observation(self) -> None:
        catalog = self._catalog()
        release = catalog.by_id("k2-horizon-mova-36b-a4b-2026-09-03")
        snapshot = SourceSnapshot(
            kind="model",
            source=release.artifact_source,
            revision=release.watch.baseline_revision,
            artifact_fingerprint=release.watch.baseline_fingerprint,
            last_modified="2026-09-03T13:08:17.000Z",
        )
        engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: snapshot}))
        assessment = engine.assess(release.id, live=True)
        self.assertFalse(engine.is_new_observation(assessment))

        changed = replace(snapshot, revision="f" * 40)
        changed_engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: changed}))
        changed_assessment = changed_engine.assess(release.id, live=True)
        self.assertTrue(changed_engine.is_new_observation(changed_assessment))

    def test_vaani_gated_snapshot_never_becomes_alert_or_promotion(self) -> None:
        catalog = self._catalog()
        release = catalog.by_id("vaani-noise-event-2026-08-07")
        snapshot = SourceSnapshot(
            kind="dataset",
            source=release.artifact_source,
            revision=release.watch.baseline_revision,
            artifact_fingerprint=release.watch.baseline_fingerprint,
            last_modified="2026-08-07T17:51:17.000Z",
            gated=True,
        )
        engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: snapshot}))
        assessment = engine.assess(release.id, live=True)
        self.assertFalse(engine.is_new_observation(assessment))
        self.assertEqual(assessment.production_disposition.value, "HOLD")
        self.assertIn("upstream source is private, gated, or disabled", assessment.production_blockers)

    def test_top_choice_target_organs_are_explicit(self) -> None:
        catalog = self._catalog()
        k2 = catalog.by_id("k2-horizon-mova-36b-a4b-2026-09-03")
        vaani = catalog.by_id("vaani-noise-event-2026-08-07")
        self.assertTrue({"szl-nemo", "szl-serve", "szl-router", "a11oy"}.issubset(k2.target_organs))
        self.assertTrue({"szl-nemo", "szl-lake", "a11oy"}.issubset(vaani.target_organs))
