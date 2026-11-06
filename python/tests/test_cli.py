from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from szl_frontier.cli import run

from helpers import write_manifest

PACKAGE = Path(__file__).resolve().parents[1] / "szl_frontier"


class WheelLayoutTests(unittest.TestCase):
    """The wheel ships szl_frontier/ only; docs/skills/ exists in a checkout."""

    def _run(self, root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        env = {**os.environ, "PYTHONPATH": str(root)}
        return subprocess.run(
            [sys.executable, "-m", "szl_frontier", *args],
            capture_output=True, text=True, timeout=60, cwd=root, env=env,
        )

    def test_console_script_imports_without_the_checkout_only_flotation_runner(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory) / "site-packages"
            shutil.copytree(PACKAGE, site / "szl_frontier",
                            ignore=shutil.ignore_patterns("__pycache__"))

            shown = self._run(site, "--help")
            self.assertEqual(shown.returncode, 0, shown.stderr)
            self.assertIn("flotation", shown.stdout)

            refused = self._run(site, "flotation")
            self.assertEqual(refused.returncode, 2, refused.stdout + refused.stderr)
            self.assertIn("flotation skill runner is missing", refused.stderr)
            self.assertNotIn("Traceback", refused.stderr)
            self.assertEqual(refused.stdout, "")


class CliTests(unittest.TestCase):
    def test_list_is_machine_readable_and_score_filterable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = write_manifest(Path(directory) / "manifest.json", releases=[])
            output = io.StringIO()
            with redirect_stdout(output):
                code = run(["--manifest", str(manifest), "list", "--min-score", "80"])
        rows = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(
            {row["id"] for row in rows},
            {
                "open-yap-1k-2026-09-03",
                "trl-grpo-ifstruct-2026-09-03",
                "k2-horizon-mova-36b-a4b-2026-09-03",
                "openbmb-minicpm5-2b-2026-09-07",
                "openbmb-ultradata-sft-agent-2609-2026-09-07",
                "openbmb-ultradata-rl-2609-2026-09-07",
            },
        )
