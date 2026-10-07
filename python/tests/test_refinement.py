import unittest

from szl_frontier.refinement import (
    AlloyRefinementEngine,
    AuditFinding,
    ModelIdentity,
    PublicStep,
    RefinementBoundaryError,
    RefinementPolicy,
    RepairProposal,
    ReplayExplorer,
    ScriptedAuditorRepairer,
    SolutionCandidate,
    canonical_bytes,
    sha256_hex,
)


class RefinementTests(unittest.TestCase):
    def setUp(self) -> None:
        self.explorer_id = ModelIdentity(
            provider="local",
            model_id="explorer",
            revision="sha256:explorer-v1",
            role="EXPLORER",
            temperature=0.8,
        )
        self.auditor_id = ModelIdentity(
            provider="local",
            model_id="auditor",
            revision="sha256:auditor-v1",
            role="AUDITOR_REPAIRER",
            temperature=0.0,
        )

    def _candidate(self, branch_id: str, step2: str, answer: str) -> SolutionCandidate:
        return SolutionCandidate(
            branch_id=branch_id,
            answer=answer,
            model=self.explorer_id,
            steps=(
                PublicStep("s1", "Set x equal to two.", evidence_refs=("input:x=2",)),
                PublicStep("s2", step2, depends_on=("s1",)),
                PublicStep("s3", f"The reported result is {answer}.", depends_on=("s2",)),
            ),
        )

    def test_local_repair_preserves_unflagged_steps_and_votes(self) -> None:
        wrong = self._candidate("branch-0", "Compute x plus three as six.", "6")
        right = self._candidate("branch-1", "Compute x plus three as five.", "5")
        fixed_step = PublicStep(
            "s2",
            "Compute x plus three as five.",
            depends_on=("s1",),
            evidence_refs=("arithmetic:2+3=5",),
        )
        bad = AuditFinding(
            "s2",
            "FAIL",
            "ARITHMETIC_ERROR",
            "2 + 3 is 5, not 6.",
            0.99,
            ("arithmetic:2+3=5",),
        )
        findings = {
            ("branch-0", "s2", wrong.steps[1].digest): bad,
        }
        repairs = {
            ("branch-0", "s2", wrong.steps[1].digest): RepairProposal(
                step=fixed_step,
                public_summary="Replace the incorrect arithmetic result.",
                revised_answer="5",
            )
        }
        engine = AlloyRefinementEngine(
            ReplayExplorer(self.explorer_id, (wrong, right)),
            ScriptedAuditorRepairer(self.auditor_id, findings, repairs),
            policy=RefinementPolicy(
                breadth=2,
                max_depth=2,
                max_calls=64,
                consensus_stop=0.5,
            ),
        )
        result = engine.run("If x=2, compute x+3.")
        self.assertEqual(result.final_answer, "5")
        self.assertEqual(result.state, "PROPOSAL_READY")
        self.assertTrue(result.receipt["regression_guard"]["passed"])
        self.assertEqual(
            result.receipt["regression_guard"]["changed_unflagged_step_count"], 0
        )
        self.assertEqual(result.receipt["repair"]["verified"], 1)
        self.assertTrue(result.receipt["model_pair"]["heterogeneous"])
        body = dict(result.receipt)
        digest = body.pop("receipt_sha256")
        self.assertEqual(digest, sha256_hex(canonical_bytes(body)))
        self.assertFalse(result.receipt["privacy"]["hidden_chain_of_thought_persisted"])


    def test_adaptive_breadth_stops_redundant_sampling(self) -> None:
        candidates = tuple(
            self._candidate(f"branch-{index}", "Compute x plus three as five.", "5")
            for index in range(4)
        )
        engine = AlloyRefinementEngine(
            ReplayExplorer(self.explorer_id, candidates),
            ScriptedAuditorRepairer(self.auditor_id, {}, {}),
            policy=RefinementPolicy(
                breadth=4,
                min_breadth=2,
                saturation_window=1,
                max_depth=1,
                max_calls=64,
                consensus_stop=0.5,
            ),
        )
        result = engine.run("If x=2, compute x+3.")
        self.assertEqual(result.receipt["breadth"]["branch_count"], 2)
        self.assertTrue(result.receipt["breadth"]["stopped_early"])
        self.assertEqual(
            result.receipt["breadth"]["stop_reason"],
            "SATURATED_CONSENSUS",
        )

    def test_low_confidence_failure_holds(self) -> None:
        candidate = self._candidate("branch-0", "Compute x plus three as six.", "6")
        finding = AuditFinding(
            "s2",
            "FAIL",
            "ARITHMETIC_ERROR",
            "Possible arithmetic mismatch.",
            0.2,
        )
        engine = AlloyRefinementEngine(
            ReplayExplorer(self.explorer_id, (candidate,)),
            ScriptedAuditorRepairer(
                self.auditor_id,
                {("branch-0", "s2", candidate.steps[1].digest): finding},
                {},
            ),
            policy=RefinementPolicy(
                breadth=1,
                max_depth=1,
                max_calls=32,
                repair_confidence_floor=0.8,
            ),
        )
        result = engine.run("If x=2, compute x+3.")
        self.assertEqual(result.state, "REVIEW_REQUIRED")
        self.assertIn(
            "ARITHMETIC_ERROR",
            result.receipt["repair"]["unresolved_error_codes"],
        )

    def test_dependency_topology_rewrite_is_rejected(self) -> None:
        candidate = self._candidate("branch-0", "Compute x plus three as six.", "6")
        finding = AuditFinding(
            "s2", "FAIL", "ARITHMETIC_ERROR", "wrong", 1.0
        )
        proposal = RepairProposal(
            PublicStep("s2", "fixed", depends_on=()),
            "bad topology rewrite",
            revised_answer="5",
        )
        engine = AlloyRefinementEngine(
            ReplayExplorer(self.explorer_id, (candidate,)),
            ScriptedAuditorRepairer(
                self.auditor_id,
                {("branch-0", "s2", candidate.steps[1].digest): finding},
                {("branch-0", "s2", candidate.steps[1].digest): proposal},
            ),
            policy=RefinementPolicy(breadth=1, max_depth=1, max_calls=32),
        )
        with self.assertRaisesRegex(
            RefinementBoundaryError, "dependency topology"
        ):
            engine.run("task")

    def test_private_reasoning_metadata_is_rejected(self) -> None:
        with self.assertRaisesRegex(RefinementBoundaryError, "private reasoning"):
            SolutionCandidate(
                branch_id="branch-0",
                answer="5",
                model=self.explorer_id,
                steps=(PublicStep("s1", "public summary"),),
                metadata={"chain_of_thought": "do not persist"},
            )


if __name__ == "__main__":
    unittest.main()
