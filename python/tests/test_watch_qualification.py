"""Synthetic, offline regression cases for watch bundle source coverage."""

from __future__ import annotations

import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from szl_frontier import watch_qualification as watch
from szl_frontier.watch_qualification import qualify_watch_bundle


REVISION = "a" * 40
OTHER_REVISION = "b" * 40
REPOSITORY = "szl-holdings/szl-frontier"
CONFIG_PATH = "frontier/watch-expected.v1.json"


class WatchQualificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = {
            "schema": "szl.frontier.watch-expected.v1",
            "sourceRepository": REPOSITORY,
            "roles": {
                "js-manifest": [{"id": "A"}, {"id": "B"}],
                "python-admission": [{"id": "A"}],
                "edge-lane": [{"id": "org/model"}],
            },
        }
        self.write_config()
        self.reports = {
            "js-manifest": self.report("js-manifest", "id", ["A", "B"]),
            "python-admission": self.report("python-admission", "id", ["A"]),
            "edge-lane": self.report("edge-lane", "repoId", ["org/model"]),
        }
        self.refresh_combined()
        self.run_binding = {
            "sourceRepository": REPOSITORY,
            "sourceRevision": REVISION,
            "configSha256": self.binding["sha256"],
        }

    def write_config(self) -> None:
        path = self.root / CONFIG_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = (json.dumps(self.config, sort_keys=True) + "\n").encode("utf-8")
        path.write_bytes(raw)
        self.binding = {
            "repository": REPOSITORY,
            "path": CONFIG_PATH,
            "revision": REVISION,
            "sha256": hashlib.sha256(raw).hexdigest(),
        }
        for report in getattr(self, "reports", {}).values():
            report["configSha256"] = self.binding["sha256"]

    def component_binding(self) -> dict:
        return {
            "sourceRepository": REPOSITORY,
            "sourceRevision": REVISION,
            "configSha256": self.binding["sha256"],
        }

    def report(self, role: str, field: str, names: list[str]) -> dict:
        return {
            **self.component_binding(),
            "schema": watch.ROLE_SCHEMAS[role],
            "live": True,
            "sourceCount": len(names),
            "successfulSources": len(names),
            "sourceResults": [{field: name, "status": "ok"} for name in names],
            "errors": [],
            "productionPromotion": False,
        }

    def refresh_combined(self) -> None:
        rows = [copy.deepcopy(row) for role in
                ("js-manifest", "python-admission", "edge-lane")
                for row in self.reports[role]["sourceResults"]]
        self.reports["combined"] = {
            **self.component_binding(),
            "schema": watch.COMBINED_SCHEMA,
            "live": True,
            "sourceCount": len(rows),
            "successfulSources": len(rows),
            "sourceResults": rows,
            "errors": [],
            "productionPromotion": False,
        }

    def qualify(self, *, run_binding=True) -> dict:
        return qualify_watch_bundle(
            checkout_root=self.root,
            trusted_config_binding=self.binding,
            reports=self.reports,
            run_binding=self.run_binding if run_binding else None,
        )

    def assert_honest(self, result: dict) -> None:
        for key in ("provenanceAuthenticated", "runtimeVerified",
                    "productionAuthorization", "productionPromotion"):
            self.assertIs(result[key], False)
        self.assertEqual(result["productionDisposition"], "HOLD")

    def test_exact_scoped_coverage_is_advisory_not_release(self):
        result = self.qualify()
        self.assertEqual(result["qualification"], "SOURCE_COVERAGE_ADVISORY")
        self.assertIs(result["sourceCoverage"], True)
        self.assert_honest(result)

    def test_duplicate_a_missing_b_with_same_counts_is_blocked(self):
        rows = self.reports["js-manifest"]["sourceResults"]
        rows[1]["id"] = "A"
        self.refresh_combined()
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIn("duplicate source", result["reason"])
        self.assert_honest(result)

    def test_unexpected_identity_is_blocked(self):
        self.reports["js-manifest"]["sourceResults"][1]["id"] = "C"
        self.refresh_combined()
        self.assertIn("unexpected source", self.qualify()["reason"])

    def test_explicit_alias_is_accepted_in_its_role_only(self):
        self.config["roles"]["js-manifest"][1]["aliases"] = ["old-B"]
        self.write_config()
        self.run_binding["configSha256"] = self.binding["sha256"]
        self.reports["js-manifest"]["sourceResults"][1]["id"] = "old-B"
        self.refresh_combined()
        self.assertEqual(self.qualify()["qualification"], "SOURCE_COVERAGE_ADVISORY")
        self.reports["python-admission"]["sourceResults"][0]["id"] = "old-B"
        self.refresh_combined()
        self.assertEqual(self.qualify()["qualification"], "BLOCKED")

    def test_ambiguous_alias_is_blocked(self):
        self.config["roles"]["js-manifest"][1]["aliases"] = ["A"]
        self.write_config()
        self.run_binding["configSha256"] = self.binding["sha256"]
        self.assertIn("ambiguous", self.qualify()["reason"])

    def test_same_asset_in_two_roles_is_not_a_global_duplicate(self):
        self.assertEqual(self.qualify()["qualification"], "SOURCE_COVERAGE_ADVISORY")

    def test_source_count_conflict_is_blocked(self):
        self.reports["python-admission"]["sourceCount"] = 2
        self.assertIn("count conflict", self.qualify()["reason"])

    def test_combined_rows_must_equal_role_rows(self):
        self.reports["combined"]["sourceResults"][0]["id"] = "not-A"
        self.assertIn("combined rows differ", self.qualify()["reason"])

    def test_errors_and_promotion_do_not_pass(self):
        self.reports["edge-lane"]["errors"] = [{"repoId": "org/model"}]
        self.assertEqual(self.qualify()["qualification"], "BLOCKED")
        self.reports["edge-lane"]["errors"] = []
        self.reports["combined"]["productionPromotion"] = True
        self.assertEqual(self.qualify()["qualification"], "BLOCKED")

    def test_missing_config_or_run_binding_is_not_current(self):
        absent = qualify_watch_bundle(checkout_root=self.root,
                                      trusted_config_binding=None, reports=self.reports)
        self.assertEqual(absent["qualification"], "MISSING_BINDING")
        result = self.qualify(run_binding=False)
        self.assertEqual(result["qualification"], "MISSING_BINDING")
        self.assertIs(result["sourceCoverage"], True)
        self.assert_honest(result)

    def test_historical_revision_is_separate_from_current_coverage(self):
        self.run_binding["sourceRevision"] = OTHER_REVISION
        for report in self.reports.values():
            report["sourceRevision"] = OTHER_REVISION
        result = self.qualify()
        self.assertEqual(result["qualification"], "HISTORICAL")
        self.assertIs(result["sourceCoverage"], True)
        self.assert_honest(result)

    def test_conflicting_report_metadata_is_blocked(self):
        self.reports["js-manifest"]["sourceRevision"] = OTHER_REVISION
        self.assertIn("conflicting sourceRevision", self.qualify()["reason"])

    def test_wrong_config_bytes_or_path_are_blocked(self):
        self.binding["sha256"] = "0" * 64
        self.assertIn("content hash mismatch", self.qualify()["reason"])
        self.binding["sha256"] = self.run_binding["configSha256"]
        self.binding["path"] = "../watch-expected.v1.json"
        self.assertIn("safe repository-relative", self.qualify()["reason"])


    def test_each_component_requires_every_binding_field(self):
        original = copy.deepcopy(self.reports)
        for component in original:
            for field in ("sourceRepository", "sourceRevision", "configSha256"):
                with self.subTest(component=component, field=field):
                    self.reports = copy.deepcopy(original)
                    del self.reports[component][field]
                    result = self.qualify()
                    self.assertEqual(result["qualification"], "MISSING_BINDING")
                    self.assertIs(result["sourceCoverage"], False)
                    self.assert_honest(result)

    def test_each_component_rejects_conflicting_binding_fields(self):
        original = copy.deepcopy(self.reports)
        conflicts = {
            "sourceRepository": "other/repository",
            "sourceRevision": OTHER_REVISION,
            "configSha256": "0" * 64,
        }
        for component in original:
            for field, value in conflicts.items():
                with self.subTest(component=component, field=field):
                    self.reports = copy.deepcopy(original)
                    self.reports[component][field] = value
                    result = self.qualify()
                    self.assertEqual(result["qualification"], "BLOCKED")
                    self.assertIs(result["sourceCoverage"], False)
                    self.assert_honest(result)

    def test_top_level_binding_does_not_replace_component_bindings(self):
        for report in self.reports.values():
            for field in ("sourceRepository", "sourceRevision", "configSha256"):
                del report[field]
        result = self.qualify()
        self.assertEqual(result["qualification"], "MISSING_BINDING")
        self.assertIs(result["sourceCoverage"], False)
        self.assert_honest(result)

    def test_null_component_binding_is_invalid_not_missing(self):
        original = copy.deepcopy(self.reports)
        for field in ("sourceRepository", "sourceRevision", "configSha256"):
            with self.subTest(field=field):
                self.reports = copy.deepcopy(original)
                self.reports["combined"][field] = None
                result = self.qualify()
                self.assertEqual(result["qualification"], "BLOCKED")
                self.assertIs(result["sourceCoverage"], False)
                self.assert_honest(result)

    def test_mixed_component_revisions_block_without_top_level_binding(self):
        self.reports["edge-lane"]["sourceRevision"] = OTHER_REVISION
        result = self.qualify(run_binding=False)
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIs(result["sourceCoverage"], False)
        self.assert_honest(result)

    def test_configuration_read_requests_only_bounded_bytes(self):
        requested = []
        real_fdopen = watch.os.fdopen

        class Reader:
            def __init__(self, stream):
                self.stream = stream

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return self.stream.__exit__(*args)

            def fileno(self):
                return self.stream.fileno()

            def read(self, size):
                requested.append(size)
                return self.stream.read(size)

        with mock.patch.object(watch.os, "fdopen", side_effect=lambda *args:
                               Reader(real_fdopen(*args))):
            self.assertEqual(self.qualify()["qualification"],
                             "SOURCE_COVERAGE_ADVISORY")
        self.assertEqual(requested, [watch.MAX_CONFIG_BYTES + 1])

    def test_grown_read_is_rejected_at_the_byte_cap(self):
        real_fdopen = watch.os.fdopen
        requested = []

        class Reader:
            def __init__(self, stream):
                self.stream = stream

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return self.stream.__exit__(*args)

            def fileno(self):
                return self.stream.fileno()

            def read(self, size):
                requested.append(size)
                return b"x" * size

        with mock.patch.object(watch.os, "fdopen", side_effect=lambda *args:
                               Reader(real_fdopen(*args))):
            result = self.qualify()
        self.assertEqual(requested, [watch.MAX_CONFIG_BYTES + 1])
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIn("byte limit", result["reason"])
        self.assert_honest(result)

    def test_nonregular_configuration_is_rejected(self):
        self.binding["path"] = "frontier"
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIn("regular file", result["reason"])
        self.assert_honest(result)

    def test_link_and_reparse_components_are_rejected(self):
        real_lstat = Path.lstat
        target = self.root / CONFIG_PATH
        for link in (True, False):
            with self.subTest(kind="symlink" if link else "reparse"):
                def redirected(path, *args, **kwargs):
                    info = real_lstat(path, *args, **kwargs)
                    if path != target:
                        return info
                    return SimpleNamespace(
                        st_mode=watch.stat.S_IFLNK if link else info.st_mode,
                        st_file_attributes=0 if link else 0x400,
                    )

                with mock.patch.object(Path, "lstat", redirected):
                    result = self.qualify()
                self.assertEqual(result["qualification"], "BLOCKED")
                self.assertIn("links or reparse", result["reason"])
                self.assert_honest(result)

    def test_replaced_opened_file_identity_is_rejected(self):
        info = (self.root / CONFIG_PATH).stat()
        replacement = SimpleNamespace(st_mode=info.st_mode, st_dev=info.st_dev,
                                      st_ino=info.st_ino + 1)
        with mock.patch.object(watch.os, "fstat", return_value=replacement):
            result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIn("changed during admission", result["reason"])
        self.assert_honest(result)

    def test_read_time_size_or_mtime_change_is_rejected(self):
        info = (self.root / CONFIG_PATH).stat()
        for field in ("st_size", "st_mtime_ns"):
            with self.subTest(field=field):
                after = SimpleNamespace(st_size=info.st_size,
                                        st_mtime_ns=info.st_mtime_ns)
                setattr(after, field, getattr(after, field) + 1)
                with mock.patch.object(watch.os, "fstat", side_effect=[info, after]):
                    result = self.qualify()
                self.assertEqual(result["qualification"], "BLOCKED")
                self.assertIn("changed during read", result["reason"])
                self.assert_honest(result)

    def test_noncanonical_configuration_paths_are_rejected(self):
        for path in ("frontier//watch-expected.v1.json", "/frontier/config.json",
                     "frontier/config.json:stream", "frontier\\config.json"):
            with self.subTest(path=path):
                self.binding["path"] = path
                result = self.qualify()
                self.assertEqual(result["qualification"], "BLOCKED")
                self.assert_honest(result)

    def test_under_limit_deep_json_returns_structured_block(self):
        raw = ("[" * 2000 + "0" + "]" * 2000).encode("utf-8")
        self.assertLess(len(raw), watch.MAX_CONFIG_BYTES)
        (self.root / CONFIG_PATH).write_bytes(raw)
        self.binding["sha256"] = hashlib.sha256(raw).hexdigest()
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assert_honest(result)

    def test_deep_report_rows_return_structured_block(self):
        nested = {}
        current = nested
        for _ in range(2000):
            current["next"] = {}
            current = current["next"]
        self.reports["js-manifest"]["sourceResults"][0]["detail"] = nested
        self.reports["combined"]["sourceResults"][0]["detail"] = nested
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assert_honest(result)

    def test_bool_counts_cannot_claim_integer_coverage(self):
        self.reports["python-admission"]["sourceCount"] = True
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assert_honest(result)

    def test_role_schema_and_live_contract_cannot_be_swapped(self):
        original = copy.deepcopy(self.reports)
        for component in original:
            for field, value in (("schema", "szl.frontier.unrelated.v1"),
                                 ("live", False)):
                with self.subTest(component=component, field=field):
                    self.reports = copy.deepcopy(original)
                    self.reports[component][field] = value
                    result = self.qualify()
                    self.assertEqual(result["qualification"], "BLOCKED")
                    self.assert_honest(result)

    def test_python_role_uses_declared_python_schema(self):
        self.reports["python-admission"]["schema"] = watch.WATCH_SCHEMA
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assert_honest(result)

    def test_bounded_nested_row_remains_advisory(self):
        nested = {"detail": [{"value": "retained"}]}
        self.reports["js-manifest"]["sourceResults"][0]["detail"] = nested
        self.refresh_combined()
        result = self.qualify()
        self.assertEqual(result["qualification"], "SOURCE_COVERAGE_ADVISORY")
        self.assert_honest(result)

    def test_duplicate_config_members_return_structured_block(self):
        raw = b'{"schema":"x","schema":"szl.frontier.watch-expected.v1"}'
        (self.root / CONFIG_PATH).write_bytes(raw)
        self.binding["sha256"] = hashlib.sha256(raw).hexdigest()
        result = self.qualify()
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assert_honest(result)

    def cli(self, *, run_revision=True, raw=None, report_path="bundle.json"):
        if raw is None:
            raw = json.dumps(self.reports).encode("utf-8")
        (self.root / "bundle.json").write_bytes(raw)
        args = ["--checkout-root", str(self.root), "--config-path", CONFIG_PATH,
                "--config-revision", REVISION, "--config-sha256", self.binding["sha256"],
                "--reports-root", str(self.root), "--reports", report_path]
        if run_revision:
            args += ["--run-revision", self.run_binding["sourceRevision"]]
        before = {path: path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        stdout = io.StringIO()
        with mock.patch("sys.stdout", stdout):
            status = watch.main(args)
        after = {path: path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(after, before, "CLI must not write inputs or receipts")
        result = json.loads(stdout.getvalue())
        self.assert_honest(result)
        return status, result

    def test_cli_advisory_success_keeps_production_hold(self):
        status, result = self.cli()
        self.assertEqual(status, 0)
        self.assertEqual(result["qualification"], "SOURCE_COVERAGE_ADVISORY")

    def test_cli_missing_run_revision_returns_nonzero_binding_hold(self):
        status, result = self.cli(run_revision=False)
        self.assertEqual(status, 3)
        self.assertEqual(result["qualification"], "MISSING_BINDING")

    def test_cli_current_producers_without_bindings_cannot_qualify(self):
        for report in self.reports.values():
            for field in ("sourceRepository", "sourceRevision", "configSha256"):
                del report[field]
        status, result = self.cli()
        self.assertEqual(status, 3)
        self.assertEqual(result["qualification"], "MISSING_BINDING")

    def test_cli_duplicate_json_members_fail_before_qualification(self):
        status, result = self.cli(raw=b'{"js-manifest":{},"js-manifest":{}}')
        self.assertEqual(status, 3)
        self.assertEqual(result["qualification"], "BLOCKED")
        self.assertIn("duplicate JSON", result["reason"])

    def test_cli_nonfinite_or_nonobject_reports_are_blocked(self):
        for raw in (b'{"value":NaN}', b'{"value":Infinity}', b'[]', b'null', b'\xff'):
            with self.subTest(raw=raw):
                status, result = self.cli(raw=raw)
                self.assertEqual(status, 3)
                self.assertEqual(result["qualification"], "BLOCKED")

    def test_cli_report_size_and_depth_are_bounded(self):
        for raw in (b' ' * (watch.MAX_CONFIG_BYTES + 1),
                    ("[" * 2000 + "0" + "]" * 2000).encode("utf-8")):
            with self.subTest(size=len(raw)):
                status, result = self.cli(raw=raw)
                self.assertEqual(status, 3)
                self.assertEqual(result["qualification"], "BLOCKED")

    def test_cli_escaped_and_missing_report_paths_are_blocked(self):
        for path in ("../bundle.json", "/bundle.json", "a//b.json", "missing.json"):
            with self.subTest(path=path):
                status, result = self.cli(report_path=path)
                self.assertEqual(status, 3)
                self.assertEqual(result["qualification"], "BLOCKED")

    def test_cli_changed_combined_rows_returns_nonzero(self):
        self.reports["combined"]["sourceResults"][0]["id"] = "not-A"
        status, result = self.cli()
        self.assertEqual(status, 3)
        self.assertEqual(result["qualification"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
