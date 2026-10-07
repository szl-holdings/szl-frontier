import unittest

from szl_frontier.refinement import (
    AlloyRefinementEngine,
    ModelIdentity,
    PublicStep,
    RefinementPolicy,
    ReplayExplorer,
    ScriptedAuditorRepairer,
    SolutionCandidate,
)
from szl_frontier.refinement_eval import BenchmarkCase, CaseObservation, RefinementEvaluator


class RefinementEvaluationTests(unittest.TestCase):
    def test_recovery_and_regression_metrics_are_separate(self) -> None:
        explorer_id = ModelIdentity("local", "explorer", "e1", "EXPLORER", 0.8)
        auditor_id = ModelIdentity(
            "local", "auditor", "a1", "AUDITOR_REPAIRER", 0.0
        )
        candidate = SolutionCandidate(
            "branch-0",
            "5",
            (PublicStep("s1", "2 plus 3 equals 5"),),
            explorer_id,
        )
        result = AlloyRefinementEngine(
            ReplayExplorer(explorer_id, (candidate,)),
            ScriptedAuditorRepairer(auditor_id, {}, {}),
            policy=RefinementPolicy(breadth=1, max_depth=1, max_calls=8),
        ).run("2 + 3")
        report = RefinementEvaluator().evaluate(
            (
                CaseObservation(
                    BenchmarkCase("math-1", "2 + 3", "5", "fixture", "r1"),
                    "6",
                    result,
                ),
            )
        )
        self.assertEqual(report["quality"]["baseline_accuracy"], 0.0)
        self.assertEqual(report["quality"]["refined_accuracy"], 1.0)
        self.assertEqual(report["quality"]["recovery_rate"], 1.0)
        self.assertEqual(report["quality"]["regression_rate"], 0.0)
        self.assertFalse(report["privacy"]["raw_prompts_persisted"])
        self.assertEqual(report["cases"][0]["case_handle"][:16], "refinement-case:")


if __name__ == "__main__":
    unittest.main()
