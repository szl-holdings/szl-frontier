# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Offline contracts for the SZL Frontier Hugging Face source witness."""
from __future__ import annotations

import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLISHER = ROOT / ".github/scripts/publish_frontier.py"
WORKFLOW = ROOT / ".github/workflows/hf-sync.yml"
DOCKERFILE = ROOT / "Dockerfile"


class FrontierHfSourceWitnessTests(unittest.TestCase):
    def test_publisher_generates_exact_non_secret_identity(self) -> None:
        text = PUBLISHER.read_text(encoding="utf-8")
        tree = ast.parse(text)
        for token in (
            'SOURCE_REPOSITORY = "szl-holdings/szl-frontier"',
            '"schema": "szl.runtime-source/v1"',
            '"source_repository": SOURCE_REPOSITORY',
            '"source_revision": source_sha',
            'root / "public" / "deployment.json"',
            're.fullmatch(r"[0-9a-f]{40}", candidate)',
        ):
            self.assertIn(token, text)

        identity_writer = next(
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "write_source_identity"
        )
        identity_source = ast.get_source_segment(text, identity_writer) or ""
        self.assertNotIn("HF_TOKEN", identity_source)
        self.assertNotIn("HF_ORG_TOKEN", identity_source)

    def test_canonical_writer_verifies_the_running_revision(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        for token in (
            "group: hf-sync-szl-frontier",
            "cancel-in-progress: false",
            "Verify running exact-source identity",
            "https://szlholdings-szl-frontier.hf.space/deployment.json",
            'repository == "szl-holdings/szl-frontier"',
            "revision == expected",
        ):
            self.assertIn(token, workflow)
        self.assertEqual(workflow.count("Publish Space and covenant dataset"), 1)

    def test_vite_image_includes_the_public_identity(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")
        self.assertIn("COPY . .", dockerfile)
        self.assertIn("npm run typecheck && npm run build", dockerfile)


if __name__ == "__main__":
    unittest.main()
