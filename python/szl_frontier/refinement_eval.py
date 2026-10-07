# SPDX-License-Identifier: Apache-2.0
"""Evidence-bound qualification metrics for Alloy Refinement Fabric.

The evaluator keeps benchmark prompts and gold answers in the controller process.
Public reports contain case handles, digests, aggregate quality, compute, recovery,
and regression metrics only. It does not make provider calls or grant promotion.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from .refinement import (
    AlloyRefinementEngine,
    BranchOutcome,
    RefinementBoundaryError,
    RefinementResult,
    RECEIPT_SCHEMA,
    SolutionCandidate,
    canonical_bytes,
    normalize_answer,
    sha256_hex,
)

EVALUATION_SCHEMA = "szl.refinement.evaluation/v1"


class Grader(Protocol):
    name: str

    def correct(self, predicted: str, expected: str) -> bool:
        raise NotImplementedError


@dataclass(frozen=True)
class ExactMatchGrader:
    """Deterministic normalized exact-match grader for offline qualification."""

    name: str = "NORMALIZED_EXACT_MATCH"

    def correct(self, predicted: str, expected: str) -> bool:
        return normalize_answer(predicted) == normalize_answer(expected)


@dataclass(frozen=True)
class BenchmarkCase:
    case_id: str
    prompt: str
    expected_answer: str
    source: str
    source_revision: str

    def __post_init__(self) -> None:
        for name, value, maximum in (
            ("case_id", self.case_id, 256),
            ("prompt", self.prompt, 64_000),
            ("expected_answer", self.expected_answer, 8_192),
            ("source", self.source, 512),
            ("source_revision", self.source_revision, 256),
        ):
            text = str(value).strip()
            if not text or len(text) > maximum:
                raise RefinementBoundaryError(f"{name} is invalid")
            object.__setattr__(self, name, text)

    @property
    def handle(self) -> str:
        digest = sha256_hex(
            canonical_bytes(
                {
                    "case_id": self.case_id,
                    "source": self.source,
                    "source_revision": self.source_revision,
                }
            )
        )
        return f"refinement-case:{digest[:32]}"


@dataclass(frozen=True)
class CaseObservation:
    case: BenchmarkCase
    baseline_answer: str
    refinement: RefinementResult


class RefinementEvaluator:
    def __init__(self, grader: Grader | None = None) -> None:
        self.grader = grader or ExactMatchGrader()

    def evaluate(self, observations: Sequence[CaseObservation]) -> dict[str, Any]:
        rows = tuple(observations)
        if not rows:
            raise RefinementBoundaryError("at least one evaluation case is required")
        handles: set[str] = set()
        case_rows: list[dict[str, Any]] = []
        baseline_correct_count = 0
        refined_correct_count = 0
        recovered = 0
        regressed = 0
        calls: list[int] = []
        held = 0
        pair_digests: set[str] = set()

        for observation in rows:
            case = observation.case
            if case.handle in handles:
                raise RefinementBoundaryError("benchmark case handle is duplicated")
            handles.add(case.handle)
            result = observation.refinement
            receipt = dict(result.receipt)
            if receipt.get("task_sha256") != sha256_hex(case.prompt):
                raise RefinementBoundaryError("refinement receipt is bound to another task")
            receipt_digest = str(receipt.get("receipt_sha256") or "")
            body = dict(receipt)
            body.pop("receipt_sha256", None)
            if receipt_digest != sha256_hex(canonical_bytes(body)):
                raise RefinementBoundaryError("refinement receipt digest mismatch")
            if receipt.get("schema") != RECEIPT_SCHEMA:
                raise RefinementBoundaryError("unsupported refinement receipt schema")
            if result.state != receipt.get("state") or result.state not in {
                "PROPOSAL_READY", "REVIEW_REQUIRED"
            }:
                raise RefinementBoundaryError("refinement state differs from receipt")
            consensus = receipt.get("consensus")
            if not isinstance(consensus, Mapping) or consensus.get(
                "normalized_answer_sha256"
            ) != sha256_hex(normalize_answer(result.final_answer)):
                raise RefinementBoundaryError("refinement answer differs from receipt")
            # Bind the exact selected answer, not merely its normalization:
            # custom graders may distinguish answers such as "us" and "US".
            # Candidate digests already bind their raw answer and branch ID.
            receipt_branches = receipt.get("branches")
            if (
                not isinstance(receipt_branches, list)
                or not receipt_branches
                or len(receipt_branches) != len(result.branches)
            ):
                raise RefinementBoundaryError("refinement branches differ from receipt")
            final_candidates: list[SolutionCandidate] = []
            branch_ids: set[str] = set()
            for branch, branch_receipt in zip(result.branches, receipt_branches):
                if not isinstance(branch, BranchOutcome) or not isinstance(
                    branch_receipt, Mapping
                ):
                    raise RefinementBoundaryError("refinement branch is invalid")
                candidate = branch.final_candidate
                if (
                    not isinstance(candidate, SolutionCandidate)
                    or branch.branch_id in branch_ids
                    or branch.branch_id != candidate.branch_id
                    or branch_receipt.get("branch_id") != candidate.branch_id
                    or branch_receipt.get("final_candidate_sha256") != candidate.digest
                    or branch_receipt.get("final_answer_sha256") != sha256_hex(candidate.answer)
                ):
                    raise RefinementBoundaryError("refinement branch differs from receipt")
                branch_ids.add(branch.branch_id)
                final_candidates.append(candidate)
            selected = AlloyRefinementEngine._vote(final_candidates)
            if result.final_answer != selected["answer"]:
                raise RefinementBoundaryError("refinement answer differs from receipt selection")
            if dict(consensus) != {
                key: value for key, value in selected.items() if key != "answer"
            }:
                raise RefinementBoundaryError("refinement consensus differs from receipt")
            compute = receipt.get("compute")
            if not isinstance(compute, Mapping):
                raise RefinementBoundaryError("refinement compute receipt is missing")
            call_count = int(compute.get("calls_used", -1))
            if call_count < 1:
                raise RefinementBoundaryError("refinement call count is invalid")
            calls.append(call_count)
            pair = receipt.get("model_pair")
            if not isinstance(pair, Mapping):
                raise RefinementBoundaryError("model pair is missing")
            pair_digests.add(sha256_hex(canonical_bytes(pair)))

            baseline_ok = self.grader.correct(
                observation.baseline_answer, case.expected_answer
            )
            refined_ok = self.grader.correct(
                result.final_answer, case.expected_answer
            )
            baseline_correct_count += int(baseline_ok)
            refined_correct_count += int(refined_ok)
            recovered += int(not baseline_ok and refined_ok)
            regressed += int(baseline_ok and not refined_ok)
            held += int(result.state != "PROPOSAL_READY")
            case_rows.append(
                {
                    "case_handle": case.handle,
                    "case_sha256": sha256_hex(case.prompt),
                    "expected_answer_sha256": sha256_hex(
                        normalize_answer(case.expected_answer)
                    ),
                    "baseline_answer_sha256": sha256_hex(
                        normalize_answer(observation.baseline_answer)
                    ),
                    "refined_answer_sha256": sha256_hex(
                        normalize_answer(result.final_answer)
                    ),
                    "baseline_correct": baseline_ok,
                    "refined_correct": refined_ok,
                    "state": result.state,
                    "calls_used": call_count,
                    "receipt_sha256": receipt_digest,
                }
            )

        count = len(rows)
        baseline_accuracy = baseline_correct_count / count
        refined_accuracy = refined_correct_count / count
        baseline_wrong = count - baseline_correct_count
        mean_calls = sum(calls) / count
        gain = refined_accuracy - baseline_accuracy
        extra_calls = max(mean_calls - 1.0, 1.0)
        body: dict[str, Any] = {
            "schema": EVALUATION_SCHEMA,
            "grader": self.grader.name,
            "case_count": count,
            "source_count": len(
                {(row.case.source, row.case.source_revision) for row in rows}
            ),
            "model_pair_sha256": sorted(pair_digests),
            "quality": {
                "baseline_accuracy": baseline_accuracy,
                "refined_accuracy": refined_accuracy,
                "absolute_gain": gain,
                "recovered_count": recovered,
                "recovery_rate": recovered / max(1, baseline_wrong),
                "regressed_count": regressed,
                "regression_rate": regressed / max(1, baseline_correct_count),
                "held_count": held,
            },
            "compute": {
                "mean_calls": mean_calls,
                "min_calls": min(calls),
                "max_calls": max(calls),
                "accuracy_gain_per_extra_call": gain / extra_calls,
            },
            "cases": case_rows,
            "authority": {
                "training": "NONE",
                "promotion": "NONE",
                "execution": "NONE",
                "human_review_required": True,
            },
            "privacy": {
                "raw_prompts_persisted": False,
                "gold_answers_persisted": False,
                "hidden_reasoning_persisted": False,
                "handles_and_digests_only": True,
            },
        }
        for value in (
            baseline_accuracy,
            refined_accuracy,
            gain,
            mean_calls,
            body["quality"]["recovery_rate"],
            body["quality"]["regression_rate"],
            body["compute"]["accuracy_gain_per_extra_call"],
        ):
            if not math.isfinite(float(value)):
                raise RefinementBoundaryError("evaluation produced non-finite metrics")
        report = dict(body)
        report["report_sha256"] = sha256_hex(canonical_bytes(body))
        return report
