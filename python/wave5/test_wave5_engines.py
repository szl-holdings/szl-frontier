"""Offline Wave-5 binding tests. Fixture results are not product qualification."""
from __future__ import annotations

import unittest

from wave5_engines import (
    EngineError,
    GOLD,
    MAX_ROUNDS,
    Release,
    bind_leads,
    compare_modes,
    reconcile_release,
    replay_impact,
    run_loop,
    terra_fixture,
)


class F1Tests(unittest.TestCase):
    def test_aware_cancels_unexecuted_and_preserves_sent(self):
        result = replay_impact(terra_fixture(), "parcel-source", aware=True)
        self.assertEqual(result["false_valid_descendants"], 0)
        self.assertIn("export-action", result["cancelled_unexecuted"])
        self.assertIn("notify-action", result["preserved_executed_history"])
        self.assertNotIn("unrelated-matter", result["descendants"])
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["rewrites_historical_execution"])

    def test_naive_leaves_false_valid(self):
        result = replay_impact(terra_fixture(), "parcel-source", aware=False)
        self.assertGreaterEqual(result["false_valid_descendants"], 1)
        self.assertEqual(result["cancelled_unexecuted"], [])

    def test_unknown_target_fail_closed(self):
        with self.assertRaisesRegex(EngineError, "UNKNOWN_CORRECTION_TARGET"):
            replay_impact(terra_fixture(), "missing", aware=True)


class F3Tests(unittest.TestCase):
    def test_parent_aligned_running_child_is_incomplete(self):
        result = reconcile_release(Release(
            parent_snapshot="ALIGNED",
            children={"space": "running", "proof": "succeeded"},
            write_accepted=True,
            timeout_after_write=False,
            cdn_revisions={"edge": "aaa"},
        ))
        self.assertFalse(result["complete"])
        self.assertIn("PARENT_ALIGNED_CANNOT_PREEMPT_CHILD", result["blockers"])

    def test_timeout_after_write_is_unknown_not_unsent(self):
        result = reconcile_release(Release(
            parent_snapshot="PENDING",
            children={"space": "unknown_after_attempt"},
            write_accepted=True,
            timeout_after_write=True,
            cdn_revisions={"edge": "aaa"},
        ))
        self.assertIn("UNKNOWN_AFTER_ATTEMPT", result["blockers"])
        self.assertEqual(result["verdict"], "INCOMPLETE")

    def test_mixed_cdn_detected(self):
        result = reconcile_release(Release(
            parent_snapshot="ALIGNED",
            children={"space": "succeeded", "proof": "succeeded"},
            write_accepted=True,
            timeout_after_write=False,
            cdn_revisions={"edge": "aaa", "origin": "bbb"},
        ))
        self.assertIn("MIXED_CDN_REVISION", result["blockers"])
        self.assertFalse(result["complete"])

    def test_clean_children_can_converge_without_authority(self):
        result = reconcile_release(Release(
            parent_snapshot="ALIGNED",
            children={"space": "succeeded", "proof": "succeeded"},
            write_accepted=True,
            timeout_after_write=False,
            cdn_revisions={"edge": "aaa", "origin": "aaa"},
        ))
        self.assertTrue(result["complete"])
        self.assertFalse(result["production_authorized"])


class F7Tests(unittest.TestCase):
    def test_adaptive_beats_single_on_overclaim_without_minting_permission(self):
        single = run_loop("overclaim", "single")
        adaptive = run_loop("overclaim", "adaptive")
        self.assertFalse(single["accepted"])
        self.assertTrue(adaptive["accepted"])
        self.assertLessEqual(adaptive["compute_units"], MAX_ROUNDS)
        self.assertFalse(adaptive["productionAuthorized"])
        self.assertFalse(adaptive["trainingAdmission"])
        self.assertFalse(adaptive["permission_created"])
        self.assertLessEqual(len(adaptive["rounds"]), MAX_ROUNDS)

    def test_all_tasks_adaptive_accept_on_this_fixture(self):
        for task in GOLD:
            with self.subTest(task=task):
                cmp = compare_modes(task)
                self.assertTrue(cmp["adaptive_accepted"])
                self.assertFalse(cmp["productionAuthorized"])


class BindTests(unittest.TestCase):
    def test_unknowns_stay_null_and_kernels_not_zero(self):
        result = bind_leads([{
            "repo": "szl-holdings/szl-frontier",
            "number": 190,
            "head": "1e9751f893d4d725f972486fe50f4405a2a99085",
            "draft": True,
            "state": "open",
        }])
        self.assertIsNone(result["authoritative_organization_population"])
        self.assertIsNone(result["kernels_count"])
        self.assertFalse(result["complete"])
        self.assertEqual(result["source_content_files_read"], 0)

    def test_duplicate_lead_rejected(self):
        row = {"repo": "szl-holdings/szl-frontier", "number": 190,
               "head": "1e9751f", "draft": True, "state": "open"}
        with self.assertRaisesRegex(EngineError, "DUPLICATE_LEAD"):
            bind_leads([row, dict(row)])


if __name__ == "__main__":
    unittest.main(verbosity=2)
