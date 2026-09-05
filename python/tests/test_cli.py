from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from szl_frontier.cli import run

from helpers import write_manifest


class CliTests(unittest.TestCase):
    def test_list_is_machine_readable_and_score_filterable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = write_manifest(Path(directory) / "manifest.json", releases=[])
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(["--manifest", str(manifest), "list", "--min-score", "80"])
        rows = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual({row["id"] for row in rows}, {"open-yap-1k-2026-09-03", "trl-grpo-ifstruct-2026-09-03"})
