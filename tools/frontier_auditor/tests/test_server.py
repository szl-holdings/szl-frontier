"""Witness the local viewer contract, including receipt-on-write, never on GET."""
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import szl_frontier_codex as core


class ViewerContractTests(unittest.TestCase):
    def test_loopback_viewer_reads_do_not_write_and_unsealed_paths_are_denied(self):
        with tempfile.TemporaryDirectory(prefix="szl-viewer-") as directory:
            root = pathlib.Path(directory)
            observed = {"github": [], "huggingface": {k: [] for k in ("models", "datasets", "spaces", "collections")},
                        "errors": [], "coverage": {"scope": "SYNTHETIC_TEST_ONLY"}}
            report = core.build_snapshot(root, observed, {"scope": "SYNTHETIC_TEST_ONLY"})
            before = core.hash_files(root, ["migration_receipts.jsonl", "bundle_manifest.json"])
            process = subprocess.Popen([sys.executable, "-B", str(ROOT / "szl_frontier_codex.py"), "serve", "--output", str(root), "--port", "0", "--expected-bundle-sha256", report["bundle_sha256"]],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                address = json.loads(process.stdout.readline())["url"]
                self.assertTrue(address.startswith("http://127.0.0.1:"))
                with urllib.request.urlopen(address, timeout=5) as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn("text/html", response.headers["Content-Type"])
                    self.assertIn(b"SZL", response.read())
                with urllib.request.urlopen(urllib.request.Request(address + "/estate_manifest.json", method="HEAD"), timeout=5) as response:
                    self.assertEqual(response.status, 200)
                for suffix in ("/../README.md", "/repository_scorecards/", "/.audit.lock", "/verification.json"):
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(address + suffix, timeout=5)
                    self.assertEqual(error.exception.code, 404)
                self.assertEqual(before, core.hash_files(root, before))
                self.assertTrue(core.verify_bundle(root, report["bundle_sha256"])["passed"])
            finally:
                process.terminate()
                process.communicate(timeout=10)


if __name__ == "__main__":
    unittest.main()
