from __future__ import annotations

import tempfile
import unittest
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


class EngineTests(unittest.TestCase):
    def test_python_admission_is_new_on_first_observation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            catalog = CatalogLoader(write_manifest(Path(directory) / "manifest.json", releases=[])).load()
            release = catalog.by_id("open-yap-1k-2026-09-03")
            snapshot = SourceSnapshot(
                kind="dataset",
                source=release.artifact_source,
                revision="abc",
                last_modified="2026-09-03T12:00:00Z",
            )
            engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: snapshot}))
            assessment = engine.assess(release.id, live=True)
        self.assertTrue(engine.is_new_observation(assessment))
        self.assertEqual(len(engine.notification_fingerprint(assessment)), 64)

    def test_js_manifest_release_requires_change_after_cursor(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            catalog = CatalogLoader(write_manifest(Path(directory) / "manifest.json")).load()
            release = catalog.by_id("baseline-model-2026-09-01")
            old_snapshot = SourceSnapshot(
                kind="model",
                source=release.artifact_source,
                revision="old",
                last_modified="2026-09-04T12:00:00Z",
            )
            new_snapshot = SourceSnapshot(
                kind="model",
                source=release.artifact_source,
                revision="new",
                last_modified="Sat, 05 Sep 2026 15:00:00 GMT",
            )
            old_engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: old_snapshot}))
            new_engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: new_snapshot}))
            old_assessment = old_engine.assess(release.id, live=True)
            new_assessment = new_engine.assess(release.id, live=True)
        self.assertFalse(old_engine.is_new_observation(old_assessment))
        self.assertTrue(new_engine.is_new_observation(new_assessment))

    def test_gated_snapshot_adds_production_blocker(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            catalog = CatalogLoader(write_manifest(Path(directory) / "manifest.json", releases=[])).load()
            release = catalog.by_id("trl-grpo-ifstruct-2026-09-03")
            snapshot = SourceSnapshot(kind="blog", source=release.artifact_source, revision="x", gated=True)
            engine = FrontierEngine(catalog, hf_client=FakeHF({release.id: snapshot}))
            assessment = engine.assess(release.id, live=True)
        self.assertIn("upstream source is private, gated, or disabled", assessment.production_blockers)
        self.assertFalse(engine.is_new_observation(assessment))
