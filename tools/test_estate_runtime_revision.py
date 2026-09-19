# Copyright 2026 SZL Holdings - SPDX-License-Identifier: Apache-2.0
"""Offline regressions for provider-reported Space source/runtime revisions."""
from __future__ import annotations

import unittest
from unittest import mock

if __package__:
    from . import test_estate_outside_seat as fixtures
else:
    import test_estate_outside_seat as fixtures


estate = fixtures.estate
NOW, SHA, OTHER_SHA, SPACE = (
    fixtures.NOW, fixtures.SHA, fixtures.OTHER_SHA, fixtures.SPACE
)
MISSING = object()
INVALID_REVISIONS = (
    ("missing", MISSING),
    ("null", None),
    ("blank", ""),
    ("whitespace", " "),
    ("boolean", True),
    ("integer", 123),
    ("float", 1.5),
    ("list", [SHA]),
    ("object", {"sha": SHA}),
    ("short-sha", SHA[:7]),
    ("truncated-sha", SHA[:-1]),
    ("oversized-sha", SHA + "a"),
    ("nonhex-sha", "g" * 40),
    ("uppercase-sha", SHA.upper()),
    ("branch", "main"),
    ("branch-ref", "refs/heads/main"),
    ("tag-ref", "refs/tags/v1.0"),
    ("pull-request-ref", "refs/pr/1"),
    ("padded-sha", " " + SHA),
    ("newline-sha", SHA + "\n"),
)


class SpaceRuntimeRevisionTests(unittest.TestCase):
    # Borrow fixture plumbing, not the base class's discoverable test methods.
    run_fixture = fixtures.WitnessFixtureTests.run_fixture

    def setUp(self):
        fixtures.WitnessFixtureTests.setUp(self)
        blocker = mock.patch(
            "socket.socket.connect",
            side_effect=AssertionError("network access is forbidden in revision fixtures"),
        )
        blocker.start()
        self.addCleanup(blocker.stop)

    def metadata(self, source=SHA, runtime=SHA, stage="RUNNING"):
        metadata = fixtures.space_metadata()
        metadata["sha"] = source
        metadata["runtime"] = {"stage": stage, "sha": runtime}
        return metadata

    def install_metadata(self, metadata, listing=None):
        self.transport.add("/api/spaces", [{"id": SPACE} if listing is None else listing])
        self.transport.add(f"/api/spaces/{SPACE}", metadata)

    def check(self, metadata, listing=None):
        self.install_metadata(metadata, listing)
        self.transport.calls.clear()
        rows, findings = estate.check_spaces_freshness(
            "SZLHOLDINGS", 30, self.client,
            expected=["alpha"], creators=[], now=NOW,
        )
        self.assertEqual(len(rows), 1, rows)
        self.assertEqual(rows[0]["space"], SPACE)
        self.assertEqual(self.transport.calls, [
            "https://huggingface.co/api/spaces?author=SZLHOLDINGS&limit=100",
            f"https://huggingface.co/api/spaces/{SPACE}",
        ])
        for note in rows[0]["findings"]:
            self.assertIn(f"{SPACE}: {note}", findings)
        return rows[0], findings

    def assert_revision_row(self, row, status, source, runtime, parity):
        # Check the actual verdict first, so false success fails behaviorally.
        self.assertEqual(row["status"], status, row)
        for key, expected in (
            ("sourceRevision", source),
            ("runtimeRevision", runtime),
            ("providerRevisionParity", parity),
        ):
            self.assertIn(key, row, row)
            self.assertEqual(row[key], expected, row)
        if status == "VERIFIED":
            self.assertEqual(row["findings"], [], row)
        else:
            self.assertTrue(row["findings"], row)

    def test_live_like_matching_metadata_is_verified(self):
        revision = "0123456789abcdef0123456789abcdef01234567"
        metadata = self.metadata(source=revision, runtime=revision)
        metadata["runtime"].update({
            "hardware": {"current": "cpu-basic", "requested": "cpu-basic"},
            "gcTimeout": 172800,
            "replicas": {"current": 1, "requested": 1},
            "domains": [{"domain": "szlholdings-alpha.hf.space", "stage": "READY"}],
        })
        row, findings = self.check(metadata)
        self.assert_revision_row(row, "VERIFIED", revision, revision, "MATCH")
        self.assertEqual(row["runtimeStage"], "RUNNING")
        self.assertEqual(row["ageHours"], 1.0)
        self.assertEqual(findings, [])

    def test_different_valid_revisions_are_a_finding_in_either_direction(self):
        for source, runtime in ((SHA, OTHER_SHA), (OTHER_SHA, SHA)):
            with self.subTest(source=source, runtime=runtime):
                row, findings = self.check(self.metadata(source=source, runtime=runtime))
                self.assert_revision_row(row, "FINDING", source, runtime, "MISMATCH")
                self.assertTrue(findings)

    def test_valid_64_character_revisions_are_compared_without_truncation(self):
        revision = "0123456789abcdef" * 4
        different = revision[:-1] + "0"
        cases = (
            (revision, revision, "VERIFIED", "MATCH"),
            (revision, different, "FINDING", "MISMATCH"),
            (revision, SHA, "FINDING", "MISMATCH"),
            (SHA, revision, "FINDING", "MISMATCH"),
        )
        for source, runtime, status, parity in cases:
            with self.subTest(source=source, runtime=runtime):
                row, findings = self.check(self.metadata(source=source, runtime=runtime))
                self.assert_revision_row(row, status, source, runtime, parity)
                self.assertEqual(bool(findings), status != "VERIFIED")

    def test_running_building_does_not_excuse_revision_mismatch(self):
        row, findings = self.check(self.metadata(runtime=OTHER_SHA, stage="RUNNING_BUILDING"))
        self.assert_revision_row(row, "FINDING", SHA, OTHER_SHA, "MISMATCH")
        self.assertEqual(row["runtimeStage"], "RUNNING_BUILDING")
        self.assertTrue(findings)

    def test_matching_running_building_preserves_existing_stage_verdict(self):
        row, findings = self.check(self.metadata(stage="RUNNING_BUILDING"))
        self.assert_revision_row(row, "VERIFIED", SHA, SHA, "MATCH")
        self.assertEqual(findings, [])

    def test_missing_or_malformed_runtime_revision_is_incomplete(self):
        for label, revision in INVALID_REVISIONS:
            with self.subTest(runtime_revision=label):
                metadata = self.metadata()
                if revision is MISSING:
                    del metadata["runtime"]["sha"]
                else:
                    metadata["runtime"]["sha"] = revision
                row, findings = self.check(metadata)
                self.assert_revision_row(row, "INCOMPLETE", SHA, None, "UNAVAILABLE")
                self.assertEqual(row["runtimeStage"], "RUNNING")
                self.assertTrue(findings)

    def test_missing_or_malformed_source_revision_is_null_and_incomplete(self):
        for label, revision in INVALID_REVISIONS:
            with self.subTest(source_revision=label):
                metadata = self.metadata()
                if revision is MISSING:
                    del metadata["sha"]
                else:
                    metadata["sha"] = revision
                row, findings = self.check(metadata)
                self.assert_revision_row(row, "INCOMPLETE", None, SHA, "UNAVAILABLE")
                self.assertTrue(findings)

    def test_equal_invalid_revisions_cannot_be_a_match(self):
        for revision in (None, "", "main", SHA[:7]):
            with self.subTest(revision=revision):
                row, findings = self.check(self.metadata(source=revision, runtime=revision))
                self.assert_revision_row(row, "INCOMPLETE", None, None, "UNAVAILABLE")
                self.assertTrue(findings)

    def test_missing_or_malformed_runtime_object_is_incomplete(self):
        for runtime in (MISSING, None, {}, [], "RUNNING", 123):
            with self.subTest(runtime=runtime):
                metadata = self.metadata()
                if runtime is MISSING:
                    del metadata["runtime"]
                else:
                    metadata["runtime"] = runtime
                row, findings = self.check(metadata)
                self.assert_revision_row(row, "INCOMPLETE", SHA, None, "UNAVAILABLE")
                self.assertTrue(findings)

    def test_blank_or_invalid_metadata_cannot_pass(self):
        for metadata in (None, {}, [], "", "not metadata", 123):
            with self.subTest(metadata=metadata):
                row, findings = self.check(metadata)
                self.assert_revision_row(row, "INCOMPLETE", None, None, "UNAVAILABLE")
                self.assertTrue(findings)

    def test_matching_revisions_preserve_stale_source_finding(self):
        metadata = self.metadata()
        metadata["lastModified"] = "2026-09-01T00:00:00Z"
        row, findings = self.check(metadata)
        self.assert_revision_row(row, "FINDING", SHA, SHA, "MATCH")
        self.assertGreater(row["ageHours"], 30)
        self.assertTrue(any("source metadata age" in note for note in row["findings"]))
        self.assertTrue(findings)

    def test_missing_runtime_sha_and_stale_source_retain_source_age_finding(self):
        metadata = self.metadata()
        del metadata["runtime"]["sha"]
        metadata["lastModified"] = "2026-09-01T00:00:00Z"

        row, findings = self.check(metadata)

        self.assert_revision_row(row, "INCOMPLETE", SHA, None, "UNAVAILABLE")
        self.assertEqual(row["runtimeStage"], "RUNNING")
        self.assertGreater(row["ageHours"], 30)
        age_findings = [note for note in row["findings"] if "source metadata age" in note]
        self.assertTrue(age_findings, row)
        self.assertGreater(len(row["findings"]), len(age_findings), row)
        for note in age_findings:
            self.assertIn(f"{SPACE}: {note}", findings)

    def test_missing_runtime_sha_and_paused_stage_retain_stage_finding(self):
        metadata = self.metadata(stage="PAUSED")
        del metadata["runtime"]["sha"]

        row, findings = self.check(metadata)

        self.assert_revision_row(row, "INCOMPLETE", SHA, None, "UNAVAILABLE")
        self.assertEqual(row["runtimeStage"], "PAUSED")
        stage_findings = [note for note in row["findings"] if "PAUSED" in note]
        self.assertTrue(stage_findings, row)
        self.assertGreater(len(row["findings"]), len(stage_findings), row)
        for note in stage_findings:
            self.assertIn(f"{SPACE}: {note}", findings)

    def test_stale_profile_without_runtime_revision_retains_source_age_finding(self):
        profile = "SZLHOLDINGS/README"
        metadata = fixtures.space_metadata(profile)
        metadata["sdk"] = "static"
        metadata["lastModified"] = "2026-09-01T00:00:00Z"
        metadata["runtime"] = {"stage": "RUNNING"}
        self.install_metadata(self.metadata())
        self.transport.add(f"/api/spaces/{profile}", metadata)

        rows, findings = estate.check_spaces_freshness(
            "SZLHOLDINGS", 30, self.client,
            expected=["alpha", "README"], creators=[], now=NOW,
        )

        profile_rows = [row for row in rows if row["space"] == profile]
        self.assertEqual(len(profile_rows), 1, rows)
        row = profile_rows[0]
        self.assert_revision_row(row, "INCOMPLETE", SHA, None, "UNAVAILABLE")
        self.assertEqual(row["inventory"], "organization-profile")
        self.assertEqual(row["runtimeStage"], "RUNNING")
        self.assertGreater(row["ageHours"], 30)
        age_findings = [note for note in row["findings"] if "source metadata age" in note]
        self.assertTrue(age_findings, row)
        self.assertGreater(len(row["findings"]), len(age_findings), row)
        for note in row["findings"]:
            self.assertIn(f"{profile}: {note}", findings)

    def test_matching_revisions_preserve_nonoperational_stage_findings(self):
        for stage in ("PAUSED", "RUNTIME_ERROR", "BUILD_ERROR", "BUILDING"):
            with self.subTest(stage=stage):
                row, findings = self.check(self.metadata(stage=stage))
                self.assert_revision_row(row, "FINDING", SHA, SHA, "MATCH")
                self.assertEqual(row["runtimeStage"], stage)
                self.assertTrue(any(stage in note for note in row["findings"]))
                self.assertTrue(findings)

    def test_matching_revisions_do_not_repair_malformed_stage(self):
        for stage in (None, "", " ", 123, []):
            with self.subTest(stage=stage):
                row, findings = self.check(self.metadata(stage=stage))
                self.assert_revision_row(row, "INCOMPLETE", SHA, SHA, "MATCH")
                self.assertTrue(findings)

    def test_matching_revisions_do_not_repair_wrong_repository_identity(self):
        metadata = self.metadata()
        metadata["id"] = "SZLHOLDINGS/different-space"
        row, findings = self.check(metadata)
        self.assert_revision_row(row, "INCOMPLETE", SHA, SHA, "UNAVAILABLE")
        self.assertTrue(any("identity" in note for note in row["findings"]))
        self.assertTrue(findings)

    def test_untrusted_identity_never_establishes_revision_parity(self):
        for identity in (MISSING, None, "", 123, "SZLHOLDINGS/different-space"):
            for runtime in (SHA, OTHER_SHA):
                with self.subTest(identity=identity, runtime=runtime):
                    metadata = self.metadata(runtime=runtime)
                    if identity is MISSING:
                        del metadata["id"]
                    else:
                        metadata["id"] = identity
                    row, findings = self.check(metadata)
                    self.assert_revision_row(row, "INCOMPLETE", SHA, runtime, "UNAVAILABLE")
                    self.assertTrue(any("identity" in note for note in row["findings"]))
                    self.assertTrue(findings)

    def test_detail_metadata_controls_parity_even_when_listing_disagrees(self):
        cases = (
            (self.metadata(runtime=OTHER_SHA), self.metadata(), "FINDING", OTHER_SHA, "MISMATCH"),
            (self.metadata(), self.metadata(runtime=OTHER_SHA), "VERIFIED", SHA, "MATCH"),
            (self.metadata(runtime=None), self.metadata(), "INCOMPLETE", None, "UNAVAILABLE"),
        )
        for metadata, listing, status, revision, parity in cases:
            with self.subTest(parity=parity):
                row, findings = self.check(metadata, listing=listing)
                self.assert_revision_row(row, status, SHA, revision, parity)
                self.assertEqual(bool(findings), status != "VERIFIED")

    def test_full_run_receipt_propagates_parity_verdict_and_keeps_production_hold(self):
        unavailable = self.metadata()
        del unavailable["runtime"]["sha"]
        cases = (
            ("match", self.metadata(), "VERIFIED", SHA, "MATCH", 0),
            ("mismatch", self.metadata(runtime=OTHER_SHA), "FINDING", OTHER_SHA, "MISMATCH", 2),
            ("unavailable", unavailable, "INCOMPLETE", None, "UNAVAILABLE", 2),
            ("rebuilding-mismatch", self.metadata(runtime=OTHER_SHA, stage="RUNNING_BUILDING"),
             "FINDING", OTHER_SHA, "MISMATCH", 2),
        )
        for label, metadata, status, revision, parity, exit_code in cases:
            with self.subTest(case=label):
                self.install_metadata(metadata)
                self.transport.calls.clear()
                receipt = self.run_fixture()
                self.assertEqual(receipt["overallStatus"], status, receipt)
                self.assertEqual(receipt["exitCode"], exit_code, receipt)
                self.assertEqual(receipt["configurationErrors"], [])
                self.assertEqual(receipt["transportErrors"], [])
                self.assertEqual(len(receipt["spaces"]["rows"]), 1)
                row = receipt["spaces"]["rows"][0]
                self.assert_revision_row(row, status, SHA, revision, parity)
                self.assertEqual(bool(receipt["spaces"]["findings"]), status != "VERIFIED")
                self.assertEqual(receipt["doctrine"]["productionDisposition"], "HOLD")
                self.assertEqual(receipt["doctrine"]["promotionEffect"], "NONE")
                self.assertEqual(self.transport.calls, [
                    f"https://huggingface.co/api/models/{fixtures.MODEL}/revision/{SHA}",
                    "https://huggingface.co/api/spaces?author=SZLHOLDINGS&limit=100",
                    f"https://huggingface.co/api/spaces/{SPACE}",
                ])


if __name__ == "__main__":
    unittest.main()
