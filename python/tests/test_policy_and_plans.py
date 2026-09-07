from __future__ import annotations

import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from szl_frontier.catalog import CatalogLoader
from szl_frontier.domain import FrontierRelease, GateState
from szl_frontier.evaluation import EvaluationPlanner
from szl_frontier.policy import MaterialityPolicy

from helpers import baseline_release, write_manifest


class PolicyAndPlanTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.catalog = CatalogLoader(write_manifest(Path(self.temp.name) / "manifest.json", releases=[])).load()
        self.policy = MaterialityPolicy()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_curated_scores_are_deterministic(self) -> None:
        expected = {
            "open-yap-1k-2026-09-03": 81,
            "vlm-run-gateway-2026-09-04": 72,
            "trl-grpo-ifstruct-2026-09-03": 90,
            "k2-horizon-mova-36b-a4b-2026-09-03": 93,
            "vaani-noise-event-2026-08-07": 72,
        }
        for release_id, score in expected.items():
            with self.subTest(release_id=release_id):
                self.assertEqual(self.policy.score(self.catalog.by_id(release_id)), score)

    def test_no_new_admission_can_promote_to_production(self) -> None:
        for release in self.catalog.releases:
            with self.subTest(release=release.id):
                self.assertEqual(self.policy.production_disposition(release).value, "HOLD")
                self.assertTrue(self.policy.production_blockers(release))

    def test_all_gates_still_require_a_sealed_receipt(self) -> None:
        source = self.catalog.by_id("open-yap-1k-2026-09-03")
        release = replace(
            source,
            maturity="released",
            license_posture="clear",
            gates=tuple(
                replace(gate, state=GateState.PASS)
                for gate in source.gates
            ),
        )
        self.assertEqual(self.policy.production_disposition(release).value, "HOLD")
        self.assertEqual(
            self.policy.production_disposition(
                release,
                receipt_sealed=True,
            ).value,
            "PROMOTE",
        )

    def test_post_training_plan_requires_heldout_semantic_checks(self) -> None:
        release = self.catalog.by_id("trl-grpo-ifstruct-2026-09-03")
        plan = EvaluationPlanner().plan(release)
        metric_names = {metric.name for metric in plan.metrics}
        self.assertIn("schema_exact_match", metric_names)
        self.assertIn("semantic_task_accuracy", metric_names)
        self.assertTrue(any("Reward functions" in invariant for invariant in plan.invariants))

    def test_k2_uses_agent_model_shadow_plan(self) -> None:
        release = self.catalog.by_id("k2-horizon-mova-36b-a4b-2026-09-03")
        plan = EvaluationPlanner().plan(release)
        metric_names = {metric.name for metric in plan.metrics}
        self.assertEqual(plan.lane, "agent-model-shadow")
        self.assertIn("agent_task_success_rate", metric_names)
        self.assertIn("tool_call_exact_match", metric_names)
        self.assertIn("long_context_grounded_recall", metric_names)
        self.assertTrue(any("action authority" in invariant for invariant in plan.invariants))

    def test_agent_memory_uses_memory_covenant_shadow_plan(self) -> None:
        item = baseline_release()
        item["id"] = "agent-memory-test"
        item["category"] = "agent-memory"
        release = FrontierRelease.from_mapping(item)
        plan = EvaluationPlanner().plan(release)
        metric_names = {metric.name for metric in plan.metrics}
        self.assertEqual(plan.lane, "agent-memory-shadow")
        self.assertIn("provenance_exact_match", metric_names)
        self.assertIn("secret_exposure_rate", metric_names)
        self.assertIn("cross_tenant_leakage_rate", metric_names)
        self.assertIn("deleted_memory_return_rate", metric_names)
        self.assertTrue(any("system-of-record evidence" in invariant for invariant in plan.invariants))

    def test_vaani_stays_held_behind_gated_access(self) -> None:
        release = self.catalog.by_id("vaani-noise-event-2026-08-07")
        states = {gate.id: gate.state.value for gate in release.gates}
        self.assertEqual(states["vaani-access"], "hold")
        self.assertEqual(states["vaani-rights"], "hold")
        plan = EvaluationPlanner().plan(release)
        self.assertEqual(plan.lane, "speech-data-sandbox")
        self.assertTrue(any("gated-access" in item for item in plan.stop_conditions))
