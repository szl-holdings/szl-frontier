from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from szl_frontier.catalog import CatalogLoader, PYTHON_ADMISSIONS
from szl_frontier.domain import SchemaError

from helpers import baseline_release, write_manifest


class CatalogTests(unittest.TestCase):
    def test_merges_js_manifest_and_three_curated_python_admissions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = write_manifest(Path(directory) / "manifest.json")
            catalog = CatalogLoader(path).load()
        self.assertEqual(len(catalog.releases), 1 + len(PYTHON_ADMISSIONS))
        self.assertEqual(catalog.by_id("baseline-model-2026-09-01").origin, "js-manifest")
        self.assertEqual(catalog.by_id("trl-grpo-ifstruct-2026-09-03").origin, "python-admission")

    def test_cross_runtime_score_drift_fails_ci(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            item = baseline_release()
            item["materialityScore"] = 76
            write_manifest(path, releases=[item])
            with self.assertRaisesRegex(SchemaError, "cross-runtime materiality drift"):
                CatalogLoader(path).load()

    def test_unknown_manifest_schema_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            path.write_text(json.dumps({"schema": "future.v99", "releases": []}), encoding="utf-8")
            with self.assertRaises(SchemaError):
                CatalogLoader(path).load()
