import copy
from dataclasses import replace
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
from szl_frontier.refinement_eval import (
    BenchmarkCase,
    CaseObservation,
    RefinementEvaluator,
)


class ReceiptBindingTests(unittest.TestCase):
    def setUp(self):
        self.explorer = ModelIdentity("local", "explorer", "r1", "EXPLORER", 0.8)
        self.auditor = ModelIdentity("local", "auditor", "r1", "AUDITOR_REPAIRER", 0)
        self.candidate = SolutionCandidate(
            "branch-0", "wrong", (PublicStep("s1", "original calculation"),), self.explorer
        )

    def engine(self, *, auditor=None, candidate=None, depth=1, calls=8):
        return AlloyRefinementEngine(
            ReplayExplorer(self.explorer, [candidate or self.candidate]),
            auditor or ScriptedAuditorRepairer(self.auditor, {}, {}),
            policy=RefinementPolicy(breadth=1, max_depth=depth, max_calls=calls),
        )

    def evaluate(self, result):
        return RefinementEvaluator().evaluate([
            CaseObservation(BenchmarkCase("id", "task", "gold", "fixture", "r1"), "wrong", result)
        ])

    def repairing_auditor(self, *, wrong_verification=False, wrong_dependent=False):
        identity = self.auditor

        class Auditor:
            def audit(self, task, candidate, step, *, depth):
                if step.step_id == "s1" and step.summary == "original calculation":
                    return AuditFinding("s1", "FAIL", "ARITHMETIC", "incorrect", 1)
                wrong = (wrong_verification and step.step_id == "s1") or (
                    wrong_dependent and step.step_id == "s2"
                )
                return AuditFinding("wrong_step" if wrong else step.step_id, "PASS", "NONE", "accepted", 1)

            def repair(self, task, candidate, finding, *, depth):
                return RepairProposal(PublicStep("s1", "repaired calculation"), "corrected", "gold")

        auditor = Auditor()
        auditor.identity = identity
        return auditor

    def test_wrong_step_verification_is_rejected(self):
        with self.assertRaisesRegex(RefinementBoundaryError, "verification.*wrong step"):
            self.engine(auditor=self.repairing_auditor(wrong_verification=True)).run("task")

    def test_wrong_step_dependent_reaudit_is_rejected(self):
        candidate = replace(self.candidate, steps=(
            self.candidate.steps[0], PublicStep("s2", "dependent calculation", ("s1",)),
        ))
        with self.assertRaisesRegex(RefinementBoundaryError, "dependent audit.*wrong step"):
            self.engine(candidate=candidate, auditor=self.repairing_auditor(wrong_dependent=True)).run("task")

    def test_valid_repair_and_dependent_reaudit_remain_compatible(self):
        candidate = replace(self.candidate, steps=(
            self.candidate.steps[0], PublicStep("s2", "dependent calculation", ("s1",)),
        ))
        result = self.engine(candidate=candidate, auditor=self.repairing_auditor()).run("task")
        self.assertEqual(result.state, "PROPOSAL_READY")
        self.assertTrue(result.receipt["branches"][0]["patches"][0]["verified"])
        self.assertEqual(self.evaluate(result)["quality"]["refined_accuracy"], 1)

    def test_zero_depth_is_held_without_disabling_negative_control(self):
        result = self.engine(depth=0).run("task")
        self.assertEqual(result.state, "REVIEW_REQUIRED")
        self.assertEqual(result.receipt["repair"]["unresolved_error_codes"], ["AUDIT_NOT_PERFORMED"])
        self.assertEqual(result.receipt["compute"]["calls_used"], 1)
        self.assertEqual(self.evaluate(result)["quality"]["held_count"], 1)

    def test_budget_exhaustion_before_audit_is_held(self):
        result = self.engine(calls=1).run("task")
        self.assertEqual(result.state, "REVIEW_REQUIRED")
        self.assertIn("AUDIT_NOT_PERFORMED", result.receipt["repair"]["unresolved_error_codes"])
        self.assertIn("BUDGET_EXHAUSTED", result.receipt["repair"]["unresolved_error_codes"])

    def test_evaluator_rejects_substituted_answer(self):
        result = self.engine().run("task")
        with self.assertRaisesRegex(RefinementBoundaryError, "answer differs"):
            self.evaluate(replace(result, final_answer="gold"))

    def test_evaluator_rejects_substituted_state(self):
        result = self.engine().run("task")
        with self.assertRaisesRegex(RefinementBoundaryError, "state differs"):
            self.evaluate(replace(result, state="REVIEW_REQUIRED"))

    def test_evaluator_rejects_substitution_with_same_normalized_answer(self):
        result = self.engine().run("task")
        with self.assertRaisesRegex(RefinementBoundaryError, "answer differs"):
            self.evaluate(replace(result, final_answer=" WRONG. "))

    def test_case_sensitive_grader_uses_exact_receipt_bound_answer(self):
        class CaseSensitiveGrader:
            name = "CASE_SENSITIVE"

            def correct(self, predicted, expected):
                return predicted == expected

        result = self.engine(candidate=replace(self.candidate, answer="us")).run("task")
        case = BenchmarkCase("id", "task", "US", "fixture", "r1")
        evaluator = RefinementEvaluator(CaseSensitiveGrader())
        report = evaluator.evaluate([CaseObservation(case, "us", result)])
        self.assertEqual(report["quality"]["refined_accuracy"], 0)
        with self.assertRaisesRegex(RefinementBoundaryError, "answer differs"):
            evaluator.evaluate([CaseObservation(case, "us", replace(result, final_answer="US"))])

    def test_evaluator_rejects_substitution_from_another_branch(self):
        candidates = [replace(self.candidate, branch_id="b0", answer="us"),
                      replace(self.candidate, branch_id="b1", answer="US")]
        result = AlloyRefinementEngine(
            ReplayExplorer(self.explorer, candidates),
            ScriptedAuditorRepairer(self.auditor, {}, {}),
            policy=RefinementPolicy(breadth=2, max_depth=1, max_calls=8),
        ).run("task")
        self.assertEqual(result.final_answer, "us")
        with self.assertRaisesRegex(RefinementBoundaryError, "answer differs"):
            self.evaluate(replace(result, final_answer="US"))

    def test_evaluator_rejects_substituted_final_candidate(self):
        result = self.engine().run("task")
        branch = result.branches[0]
        replacement = replace(branch, final_candidate=replace(branch.final_candidate, answer="WRONG"))
        with self.assertRaisesRegex(RefinementBoundaryError, "branch differs"):
            self.evaluate(replace(result, branches=(replacement,)))

    def test_evaluator_rejects_inconsistent_consensus_with_valid_digest(self):
        result = self.engine().run("task")
        receipt = copy.deepcopy(result.receipt)
        receipt["consensus"]["votes"] = 999
        receipt.pop("receipt_sha256")
        receipt["receipt_sha256"] = sha256_hex(canonical_bytes(receipt))
        with self.assertRaisesRegex(RefinementBoundaryError, "consensus differs"):
            self.evaluate(replace(result, receipt=receipt))

    def test_evaluator_rejects_missing_duplicate_or_reordered_branches(self):
        candidates = [replace(self.candidate, branch_id="b0", answer="us"),
                      replace(self.candidate, branch_id="b1", answer="US")]
        result = AlloyRefinementEngine(
            ReplayExplorer(self.explorer, candidates),
            ScriptedAuditorRepairer(self.auditor, {}, {}),
            policy=RefinementPolicy(breadth=2, max_depth=1, max_calls=8),
        ).run("task")
        for branches in ((), result.branches[:1],
                         (result.branches[0], result.branches[0]),
                         tuple(reversed(result.branches))):
            with self.subTest(branch_ids=[branch.branch_id for branch in branches]):
                with self.assertRaisesRegex(RefinementBoundaryError, "branch"):
                    self.evaluate(replace(result, branches=branches))

    def test_evaluator_rejects_other_receipt_schema_even_with_valid_digest(self):
        result = self.engine().run("task")
        receipt = copy.deepcopy(result.receipt)
        receipt["schema"] = "unrecognized/v1"
        receipt.pop("receipt_sha256")
        receipt["receipt_sha256"] = sha256_hex(canonical_bytes(receipt))
        with self.assertRaisesRegex(RefinementBoundaryError, "unsupported.*schema"):
            self.evaluate(replace(result, receipt=receipt))

    def test_evaluator_rejects_missing_consensus_even_with_valid_digest(self):
        result = self.engine().run("task")
        receipt = copy.deepcopy(result.receipt)
        receipt.pop("consensus")
        receipt.pop("receipt_sha256")
        receipt["receipt_sha256"] = sha256_hex(canonical_bytes(receipt))
        with self.assertRaisesRegex(RefinementBoundaryError, "answer differs"):
            self.evaluate(replace(result, receipt=receipt))

    def test_nonpassing_findings_cannot_use_reserved_none(self):
        for verdict in ("FAIL", "UNCERTAIN"):
            for code in ("NONE", "none", " None "):
                with self.subTest(verdict=verdict, code=code):
                    with self.assertRaisesRegex(RefinementBoundaryError, "error_code"):
                        AuditFinding("s1", verdict, code, "not accepted", 0)

    def test_audit_enums_and_step_ids_are_not_text_coerced(self):
        class TextLike:
            def __init__(self, value):
                self.value = value

            def __str__(self):
                return self.value

        for field, values in (
            ("step_id", (None, 1, TextLike("s1"))),
            ("verdict", (None, True, TextLike("PASS"))),
            ("error_code", (None, False, TextLike("NONE"))),
        ):
            for value in values:
                with self.subTest(field=field, value=value):
                    args = dict(step_id="s1", verdict="PASS", error_code="NONE", public_note="note", confidence=1)
                    args[field] = value
                    with self.assertRaises(RefinementBoundaryError):
                        AuditFinding(**args)

    def test_pass_requires_none_and_valid_normalized_pass_is_preserved(self):
        with self.assertRaisesRegex(RefinementBoundaryError, "PASS requires"):
            AuditFinding("s1", "PASS", "ARITHMETIC", "inconsistent", 1)
        finding = AuditFinding("s1", " pass ", " none ", "accepted", 1)
        self.assertEqual((finding.verdict, finding.error_code), ("PASS", "NONE"))

    def test_valid_nonpassing_findings_hold(self):
        for verdict in ("FAIL", "UNCERTAIN"):
            with self.subTest(verdict=verdict):
                finding = AuditFinding("s1", verdict, "ARITHMETIC", "not accepted", 0)
                auditor = ScriptedAuditorRepairer(self.auditor, {
                    ("branch-0", "s1", self.candidate.steps[0].digest): finding,
                }, {})
                result = self.engine(auditor=auditor).run("task")
                self.assertEqual(result.state, "REVIEW_REQUIRED")
                self.assertEqual(result.receipt["repair"]["unresolved_error_codes"], ["ARITHMETIC"])


if __name__ == "__main__":
    unittest.main()
