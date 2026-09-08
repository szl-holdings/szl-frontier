"""Offline regression tests for persistent GitHub receipt provenance."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import warnings
import zipfile


SCRIPT = Path(__file__).resolve().parents[1] / ".github/scripts/outside_seat_previous.py"
SPEC = importlib.util.spec_from_file_location("outside_seat_previous", SCRIPT)
chain = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(chain)
REPO = "szl-holdings/szl-frontier"
PREFIX = "/repos/" + REPO
SHA = "a" * 40


def run(number, *, attempt=1, event="schedule", conclusion="success"):
    return {
        "id": number * 10, "run_number": number, "run_attempt": attempt,
        "event": event, "status": "completed", "conclusion": conclusion,
        "head_branch": "main", "head_sha": SHA, "workflow_id": 99,
        "path": chain.WORKFLOW_PATH,
        "repository": {"id": 5, "full_name": REPO},
        "head_repository": {"id": 5, "full_name": REPO},
    }


def archive_bytes(entries=None):
    if entries is None:
        entries = [("receipt.json", b'{"receiptDigest":"fixture"}'), ("evidence/probe.bin", b"public bytes")]
    data = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(data, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, body in entries:
                archive.writestr(name, body)
    return data.getvalue()


def artifact(data, *, number=2, attempt=1):
    return {
        "id": 88, "name": f"estate-outside-seat-{number * 10}-{attempt}",
        "expired": False, "size_in_bytes": len(data),
        "digest": "sha256:" + hashlib.sha256(data).hexdigest(),
        "workflow_run": {"id": number * 10, "repository_id": 5,
                         "head_repository_id": 5, "head_branch": "main", "head_sha": SHA},
    }


class FakeGitHub:
    def __init__(self, runs=None, data=None):
        self.data = archive_bytes() if data is None else data
        self.runs = [run(2, conclusion="failure"), run(1)] if runs is None else runs
        self.responses = {
            PREFIX: {"id": 5, "full_name": REPO, "default_branch": "main"},
            f"{PREFIX}/actions/workflows/{chain.WORKFLOW}": {"id": 99, "path": chain.WORKFLOW_PATH},
            f"{PREFIX}/actions/runs/30/attempts/1": run(3),
            f"{PREFIX}/actions/workflows/99/runs?branch=main&status=completed&per_page=100&page=1":
                {"total_count": len(self.runs), "workflow_runs": self.runs},
            f"{PREFIX}/actions/runs/20": copy.deepcopy(next((r for r in self.runs if r["id"] == 20), run(2))),
            f"{PREFIX}/actions/runs/20/artifacts?per_page=100&page=1":
                {"total_count": 1, "artifacts": [artifact(self.data)]},
        }
        self.downloaded = []

    def json(self, path):
        return copy.deepcopy(self.responses[path])

    def archive(self, path):
        self.downloaded.append(path)
        return self.data

    @property
    def prior_artifact(self):
        return self.responses[f"{PREFIX}/actions/runs/20/artifacts?per_page=100&page=1"]["artifacts"][0]


class PreviousReceiptTests(unittest.TestCase):
    def retrieve(self, api):
        return chain.retrieve_previous(api, REPO, 30, 1, SHA)

    def test_genesis_only_without_eligible_prior_completed_runs(self):
        api = FakeGitHub(runs=[])
        data, status = self.retrieve(api)
        self.assertIsNone(data)
        self.assertEqual(status["status"], "GENESIS")
        self.assertEqual(api.downloaded, [])

    def test_latest_failed_run_is_chained_instead_of_older_success(self):
        api = FakeGitHub()
        data, status = self.retrieve(api)
        self.assertEqual(data, b'{"receiptDigest":"fixture"}')
        self.assertEqual(status["status"], "CHAINED")
        self.assertEqual(status["previousRunId"], 20)
        self.assertEqual(status["previousRunConclusion"], "failure")
        self.assertEqual(api.downloaded, [f"{PREFIX}/actions/artifacts/88/zip"])

    def test_pr_artifact_is_never_a_receipt_source(self):
        api = FakeGitHub(runs=[run(2, event="pull_request")])
        data, status = self.retrieve(api)
        self.assertIsNone(data)
        self.assertEqual(status["status"], "GENESIS")
        self.assertEqual(api.downloaded, [])

    def test_future_run_and_current_rerun_do_not_create_a_cycle(self):
        api = FakeGitHub(runs=[run(4), run(3), run(2)])
        _, status = self.retrieve(api)
        self.assertEqual(status["previousRunId"], 20)

    def test_missing_expired_or_wrong_attempt_never_falls_back(self):
        for defect in ("missing", "expired", "wrong_attempt"):
            with self.subTest(defect=defect):
                api = FakeGitHub()
                if defect == "missing":
                    api.responses[f"{PREFIX}/actions/runs/20/artifacts?per_page=100&page=1"] = {"total_count": 0, "artifacts": []}
                elif defect == "expired":
                    api.prior_artifact["expired"] = True
                else:
                    api.prior_artifact["name"] = "estate-outside-seat-20-2"
                with self.assertRaises(chain.ChainError):
                    self.retrieve(api)
                self.assertEqual(api.downloaded, [])

    def test_previous_attempt_race_blocks(self):
        api = FakeGitHub()
        api.responses[f"{PREFIX}/actions/runs/20"]["run_attempt"] = 2
        with self.assertRaisesRegex(chain.ChainError, "changed"):
            self.retrieve(api)

    def test_current_attempt_and_source_must_match_github_context(self):
        for key, value in (("run_attempt", 2), ("head_sha", "b" * 40), ("event", "pull_request")):
            with self.subTest(key=key):
                api = FakeGitHub()
                api.responses[f"{PREFIX}/actions/runs/30/attempts/1"][key] = value
                with self.assertRaises(chain.ChainError):
                    self.retrieve(api)

    def test_default_main_is_required(self):
        api = FakeGitHub()
        api.responses[PREFIX]["default_branch"] = "trunk"
        with self.assertRaisesRegex(chain.ChainError, "default branch"):
            self.retrieve(api)

    def test_wrong_artifact_provenance_is_rejected(self):
        for key, value in (("id", 777), ("repository_id", 7), ("head_repository_id", 8), ("head_branch", "feature"), ("head_sha", "b" * 40)):
            with self.subTest(key=key):
                api = FakeGitHub()
                api.prior_artifact["workflow_run"][key] = value
                with self.assertRaisesRegex(chain.ChainError, "Artifact repository"):
                    self.retrieve(api)

    def test_wrong_previous_workflow_or_repository_is_rejected(self):
        for key, value in (("workflow_id", 100), ("path", ".github/workflows/other.yml"), ("head_branch", "feature"), ("head_repository", None)):
            with self.subTest(key=key):
                api = FakeGitHub()
                api.runs[0][key] = value
                with self.assertRaises(chain.ChainError):
                    self.retrieve(api)

    def test_duplicate_artifact_is_ambiguous(self):
        api = FakeGitHub()
        payload = api.responses[f"{PREFIX}/actions/runs/20/artifacts?per_page=100&page=1"]
        payload["artifacts"].append(copy.deepcopy(payload["artifacts"][0]))
        payload["total_count"] = 2
        with self.assertRaisesRegex(chain.ChainError, "unique"):
            self.retrieve(api)

    def test_digest_mismatch_and_absence_are_rejected(self):
        for digest in ("", "sha256:" + "0" * 64):
            with self.subTest(digest=digest):
                api = FakeGitHub()
                api.prior_artifact["digest"] = digest
                with self.assertRaises(chain.ChainError):
                    self.retrieve(api)

    def test_failure_diagnostic_without_receipt_keeps_chain_blocked(self):
        data = archive_bytes([("chain-status.json", b'{"status":"BLOCKED"}')])
        with self.assertRaisesRegex(chain.ChainError, "exactly one root receipt"):
            self.retrieve(FakeGitHub(data=data))

    def test_nested_duplicate_symlink_or_oversized_receipts_are_rejected(self):
        symlink = zipfile.ZipInfo("receipt.json")
        symlink.create_system = 3
        symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
        scenarios = [
            [("../receipt.json", b"x")],
            [("nested/receipt.json", b"x")],
            [("receipt.json", b"x"), ("receipt.json", b"y")],
            [(symlink, b"some-target")],
            [("receipt.json", b"x" * (chain.MAX_RECEIPT_BYTES + 1))],
        ]
        for entries in scenarios:
            with self.subTest(entries=str(entries[0][0])):
                with self.assertRaises(chain.ChainError):
                    self.retrieve(FakeGitHub(data=archive_bytes(entries)))

    def test_unrelated_zip_paths_are_not_extracted(self):
        data = archive_bytes([("receipt.json", b"expected"), ("../../escape.txt", b"do not extract")])
        self.assertEqual(self.retrieve(FakeGitHub(data=data))[0], b"expected")

    def test_incomplete_history_is_not_genesis(self):
        api = FakeGitHub(runs=[])
        path = f"{PREFIX}/actions/workflows/99/runs?branch=main&status=completed&per_page=100&page=1"
        api.responses[path]["total_count"] = 2
        with self.assertRaisesRegex(chain.ChainError, "incomplete"):
            self.retrieve(api)

    def test_cli_writes_blocked_diagnostic_without_a_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            output, status = Path(directory) / "previous.json", Path(directory) / "chain-status.json"
            with patch.object(chain, "GitHub", return_value=FakeGitHub()), patch.object(chain, "retrieve_previous", side_effect=chain.ChainError("Prior artifact missing")), contextlib.redirect_stdout(io.StringIO()):
                result = chain.main(["--output", str(output), "--status-output", str(status)])
            self.assertEqual(result, 3)
            self.assertFalse(output.exists())
            self.assertEqual(json.loads(status.read_text())["status"], "BLOCKED")


class TransportTests(unittest.TestCase):
    def test_byte_limit(self):
        with self.assertRaises(chain.ChainError):
            chain.bounded_read(io.BytesIO(b"1234"), 3)

    def test_allowed_storage_hosts_require_https_and_no_credentials(self):
        self.assertTrue(chain.storage_url_allowed("https://productionresultssa1.blob.core.windows.net/path?sig=fixture"))
        for url in ("http://productionresultssa1.blob.core.windows.net/path", "https://evil.example/path", "https://blob.core.windows.net.evil.example/path", "https://user:pass@x.blob.core.windows.net/path", "https://x.blob.core.windows.net:444/path"):
            self.assertFalse(chain.storage_url_allowed(url))

    def test_storage_download_never_receives_github_token(self):
        requests = []
        class Opener:
            def open(self, request, timeout):
                requests.append(request)
                if len(requests) == 1:
                    raise urllib.error.HTTPError(request.full_url, 302, "Found", {"Location": "https://fixture.blob.core.windows.net/archive?sig=fixture"}, None)
                return io.BytesIO(b"zip fixture")
        client = chain.GitHub("test-token-not-a-secret")
        client.opener = Opener()
        self.assertEqual(client.archive(f"{PREFIX}/actions/artifacts/88/zip"), b"zip fixture")
        self.assertEqual(requests[0].get_header("Authorization"), "Bearer test-token-not-a-secret")
        self.assertIsNone(requests[1].get_header("Authorization"))


if __name__ == "__main__":
    unittest.main()
