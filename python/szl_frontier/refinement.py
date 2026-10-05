# SPDX-License-Identifier: Apache-2.0
"""Alloy Refinement Fabric: bounded breadth-depth reasoning repair.

This module implements an original, provider-neutral test-time refinement
controller inspired by the public literature on self-consistency,
self-refinement, process supervision, verifier-free refinement, and
heterogeneous model collaboration.

The contract intentionally operates on *public verifiable steps*: concise
claims, calculations, evidence references, and dependency edges. It neither
requests nor persists hidden chain-of-thought. Model/provider calls live behind
small protocols and are not enabled by this package.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter, defaultdict, deque
from dataclasses import dataclass, field, replace
from typing import Any, Iterable, Mapping, Protocol, Sequence

RECEIPT_SCHEMA = "szl.refinement.receipt/v1"
RESULT_SCHEMA = "szl.refinement.result/v1"
POLICY_SCHEMA = "szl.refinement.policy/v1"
_STEP_ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$")
_ERROR_CODE = re.compile(r"^[A-Z][A-Z0-9_]{1,63}$")
VERDICTS = frozenset({"PASS", "FAIL", "UNCERTAIN"})


class RefinementBoundaryError(ValueError):
    """A source, model, budget, or receipt violated the fail-closed contract."""


def canonical_bytes(value: Any) -> bytes:
    """Return strict, stable UTF-8 JSON bytes."""

    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise RefinementBoundaryError("value is not strict canonical JSON") from exc
    return text.encode("utf-8")


def sha256_hex(value: bytes | str) -> str:
    data = value.encode("utf-8") if isinstance(value, str) else value
    return hashlib.sha256(data).hexdigest()


def _bounded_text(value: str, *, name: str, maximum: int) -> str:
    text = str(value).strip()
    if not text:
        raise RefinementBoundaryError(f"{name} is required")
    if len(text) > maximum:
        raise RefinementBoundaryError(f"{name} exceeds {maximum} characters")
    return text


def _bounded_probability(value: float, *, name: str) -> float:
    number = float(value)
    if not math.isfinite(number) or number < 0.0 or number > 1.0:
        raise RefinementBoundaryError(f"{name} must be finite in [0, 1]")
    return number


def normalize_answer(value: str) -> str:
    """Normalize an answer for parameter-free plurality voting."""

    text = _bounded_text(value, name="answer", maximum=8_192).casefold()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[\s.;,:!?]+$", "", text)
    return text


def _token_set(value: str) -> frozenset[str]:
    return frozenset(re.findall(r"[a-z0-9][a-z0-9_.:/+-]{0,63}", value.casefold()))


def jaccard_similarity(left: str, right: str) -> float:
    a, b = _token_set(left), _token_set(right)
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


@dataclass(frozen=True)
class ModelIdentity:
    """Immutable identity for one role in a refinement run."""

    provider: str
    model_id: str
    revision: str
    role: str
    temperature: float

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "provider", _bounded_text(self.provider, name="provider", maximum=128)
        )
        object.__setattr__(
            self, "model_id", _bounded_text(self.model_id, name="model_id", maximum=256)
        )
        object.__setattr__(
            self, "revision", _bounded_text(self.revision, name="revision", maximum=256)
        )
        object.__setattr__(
            self, "role", _bounded_text(self.role, name="role", maximum=64).upper()
        )
        temperature = float(self.temperature)
        if not math.isfinite(temperature) or temperature < 0.0 or temperature > 2.0:
            raise RefinementBoundaryError("temperature must be finite in [0, 2]")
        object.__setattr__(self, "temperature", temperature)

    def public_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model_id": self.model_id,
            "revision": self.revision,
            "role": self.role,
            "temperature": self.temperature,
        }


@dataclass(frozen=True)
class PublicStep:
    """A concise, externally checkable reasoning step; never hidden CoT."""

    step_id: str
    summary: str
    depends_on: tuple[str, ...] = ()
    evidence_refs: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        step_id = _bounded_text(self.step_id, name="step_id", maximum=64)
        if not _STEP_ID.fullmatch(step_id):
            raise RefinementBoundaryError("step_id is invalid")
        object.__setattr__(self, "step_id", step_id)
        object.__setattr__(
            self, "summary", _bounded_text(self.summary, name="summary", maximum=2_000)
        )
        dependencies = tuple(str(item).strip() for item in self.depends_on)
        if len(dependencies) != len(set(dependencies)):
            raise RefinementBoundaryError("step dependencies must be unique")
        if self.step_id in dependencies:
            raise RefinementBoundaryError("a step cannot depend on itself")
        if any(not _STEP_ID.fullmatch(item) for item in dependencies):
            raise RefinementBoundaryError("step dependency is invalid")
        object.__setattr__(self, "depends_on", dependencies)
        refs = tuple(
            _bounded_text(item, name="evidence_ref", maximum=512)
            for item in self.evidence_refs
        )
        if len(refs) != len(set(refs)):
            raise RefinementBoundaryError("evidence references must be unique")
        object.__setattr__(self, "evidence_refs", refs)

    @property
    def digest(self) -> str:
        return sha256_hex(
            canonical_bytes(
                {
                    "step_id": self.step_id,
                    "summary": self.summary,
                    "depends_on": list(self.depends_on),
                    "evidence_refs": list(self.evidence_refs),
                }
            )
        )

    def public_dict(self) -> dict[str, Any]:
        return {
            "step_id": self.step_id,
            "summary": self.summary,
            "depends_on": list(self.depends_on),
            "evidence_refs": list(self.evidence_refs),
            "sha256": self.digest,
        }


@dataclass(frozen=True)
class SolutionCandidate:
    branch_id: str
    answer: str
    steps: tuple[PublicStep, ...]
    model: ModelIdentity
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        branch_id = _bounded_text(self.branch_id, name="branch_id", maximum=64)
        if not _STEP_ID.fullmatch(branch_id):
            raise RefinementBoundaryError("branch_id is invalid")
        object.__setattr__(self, "branch_id", branch_id)
        object.__setattr__(
            self, "answer", _bounded_text(self.answer, name="answer", maximum=8_192)
        )
        steps = tuple(self.steps)
        if not steps or len(steps) > 64:
            raise RefinementBoundaryError("candidate must contain 1..64 public steps")
        identifiers = [step.step_id for step in steps]
        if len(identifiers) != len(set(identifiers)):
            raise RefinementBoundaryError("candidate step IDs must be unique")
        known: set[str] = set()
        for step in steps:
            if any(dep not in known for dep in step.depends_on):
                raise RefinementBoundaryError(
                    "steps must be topologically ordered and depend only on prior steps"
                )
            known.add(step.step_id)
        object.__setattr__(self, "steps", steps)
        metadata = dict(self.metadata)
        forbidden = {
            "chain_of_thought",
            "hidden_reasoning",
            "private_reasoning",
            "system_prompt",
            "raw_prompt",
            "raw_completion",
        }
        if forbidden & {str(key).casefold() for key in metadata}:
            raise RefinementBoundaryError("private reasoning/prompt material is forbidden")
        canonical_bytes(metadata)
        object.__setattr__(self, "metadata", metadata)

    @property
    def signature_text(self) -> str:
        return "\n".join([*(step.summary for step in self.steps), self.answer])

    @property
    def digest(self) -> str:
        return sha256_hex(
            canonical_bytes(
                {
                    "branch_id": self.branch_id,
                    "answer": self.answer,
                    "steps": [step.public_dict() for step in self.steps],
                    "model": self.model.public_dict(),
                    "metadata": dict(self.metadata),
                }
            )
        )

    def with_patch(self, proposal: "RepairProposal") -> "SolutionCandidate":
        index = {step.step_id: idx for idx, step in enumerate(self.steps)}
        if proposal.step.step_id not in index:
            raise RefinementBoundaryError("repair targets an unknown step")
        position = index[proposal.step.step_id]
        before = self.steps[position]
        if proposal.step.depends_on != before.depends_on:
            raise RefinementBoundaryError(
                "step-local repair cannot rewrite dependency topology"
            )
        updated = list(self.steps)
        updated[position] = proposal.step
        answer = self.answer if proposal.revised_answer is None else proposal.revised_answer
        return replace(self, steps=tuple(updated), answer=answer)


@dataclass(frozen=True)
class AuditFinding:
    step_id: str
    verdict: str
    error_code: str
    public_note: str
    confidence: float
    evidence_refs: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not _STEP_ID.fullmatch(str(self.step_id)):
            raise RefinementBoundaryError("audit step_id is invalid")
        verdict = str(self.verdict).strip().upper()
        if verdict not in VERDICTS:
            raise RefinementBoundaryError("audit verdict is invalid")
        object.__setattr__(self, "verdict", verdict)
        code = str(self.error_code).strip().upper()
        if verdict == "PASS":
            code = "NONE"
        elif not _ERROR_CODE.fullmatch(code):
            raise RefinementBoundaryError("error_code is invalid")
        object.__setattr__(self, "error_code", code)
        object.__setattr__(
            self,
            "public_note",
            _bounded_text(self.public_note, name="public_note", maximum=1_000),
        )
        object.__setattr__(
            self,
            "confidence",
            _bounded_probability(self.confidence, name="confidence"),
        )
        object.__setattr__(
            self,
            "evidence_refs",
            tuple(
                _bounded_text(item, name="audit evidence_ref", maximum=512)
                for item in self.evidence_refs
            ),
        )

    def receipt_dict(self) -> dict[str, Any]:
        return {
            "step_id": self.step_id,
            "verdict": self.verdict,
            "error_code": self.error_code,
            "confidence": self.confidence,
            "note_sha256": sha256_hex(self.public_note),
            "evidence_ref_sha256": [sha256_hex(item) for item in self.evidence_refs],
        }


@dataclass(frozen=True)
class RepairProposal:
    step: PublicStep
    public_summary: str
    revised_answer: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "public_summary",
            _bounded_text(
                self.public_summary, name="repair public_summary", maximum=1_000
            ),
        )
        if self.revised_answer is not None:
            object.__setattr__(
                self,
                "revised_answer",
                _bounded_text(
                    self.revised_answer, name="revised_answer", maximum=8_192
                ),
            )


class ExplorerAdapter(Protocol):
    identity: ModelIdentity

    def explore(
        self, task: str, *, branch_index: int, seed: int
    ) -> SolutionCandidate: ...


class AuditorRepairerAdapter(Protocol):
    identity: ModelIdentity

    def audit(
        self,
        task: str,
        candidate: SolutionCandidate,
        step: PublicStep,
        *,
        depth: int,
    ) -> AuditFinding: ...

    def repair(
        self,
        task: str,
        candidate: SolutionCandidate,
        finding: AuditFinding,
        *,
        depth: int,
    ) -> RepairProposal: ...


@dataclass(frozen=True)
class RefinementPolicy:
    # ``breadth`` is a ceiling, not a mandate. The engine can stop early when
    # recent branches add no new semantic cluster and answer agreement is high.
    breadth: int = 8
    min_breadth: int = 1
    saturation_window: int = 3
    max_depth: int = 3
    max_calls: int = 256
    cluster_similarity: float = 0.82
    consensus_stop: float = 0.75
    utility_stop: float = 0.10
    repair_confidence_floor: float = 0.50
    seed: int = 17

    def __post_init__(self) -> None:
        if not 1 <= int(self.breadth) <= 32:
            raise RefinementBoundaryError("breadth must be in [1, 32]")
        if not 1 <= int(self.min_breadth) <= int(self.breadth):
            raise RefinementBoundaryError("min_breadth must be in [1, breadth]")
        if not 1 <= int(self.saturation_window) <= 32:
            raise RefinementBoundaryError("saturation_window must be in [1, 32]")
        if not 0 <= int(self.max_depth) <= 8:
            raise RefinementBoundaryError("max_depth must be in [0, 8]")
        if not int(self.breadth) <= int(self.max_calls) <= 10_000:
            raise RefinementBoundaryError("max_calls is too small or too large")
        for name in (
            "cluster_similarity",
            "consensus_stop",
            "utility_stop",
            "repair_confidence_floor",
        ):
            _bounded_probability(float(getattr(self, name)), name=name)

    def public_dict(self) -> dict[str, Any]:
        return {
            "schema": POLICY_SCHEMA,
            "breadth": self.breadth,
            "min_breadth": self.min_breadth,
            "saturation_window": self.saturation_window,
            "max_depth": self.max_depth,
            "max_calls": self.max_calls,
            "cluster_similarity": self.cluster_similarity,
            "consensus_stop": self.consensus_stop,
            "utility_stop": self.utility_stop,
            "repair_confidence_floor": self.repair_confidence_floor,
            "seed": self.seed,
        }


@dataclass(frozen=True)
class BranchOutcome:
    branch_id: str
    initial_digest: str
    final_candidate: SolutionCandidate
    findings: tuple[AuditFinding, ...]
    patches: tuple[dict[str, Any], ...]
    unresolved: tuple[str, ...]
    depths_executed: int
    preserved_step_count: int
    changed_unflagged_step_count: int

    @property
    def pass_ratio(self) -> float:
        if not self.findings:
            return 0.0
        terminal: dict[str, AuditFinding] = {}
        for finding in self.findings:
            terminal[finding.step_id] = finding
        return sum(item.verdict == "PASS" for item in terminal.values()) / len(
            terminal
        )

    def receipt_dict(self) -> dict[str, Any]:
        return {
            "branch_id": self.branch_id,
            "initial_candidate_sha256": self.initial_digest,
            "final_candidate_sha256": self.final_candidate.digest,
            "initial_answer_sha256": self.patches[0]["initial_answer_sha256"]
            if self.patches
            else sha256_hex(self.final_candidate.answer),
            "final_answer_sha256": sha256_hex(self.final_candidate.answer),
            "final_step_sha256": [
                {"step_id": step.step_id, "sha256": step.digest}
                for step in self.final_candidate.steps
            ],
            "findings": [item.receipt_dict() for item in self.findings],
            "patches": list(self.patches),
            "unresolved_error_codes": list(self.unresolved),
            "depths_executed": self.depths_executed,
            "pass_ratio": self.pass_ratio,
            "regression_guard": {
                "preserved_step_count": self.preserved_step_count,
                "changed_unflagged_step_count": self.changed_unflagged_step_count,
                "passed": self.changed_unflagged_step_count == 0,
            },
        }


@dataclass(frozen=True)
class RefinementResult:
    task: str
    final_answer: str
    state: str
    branches: tuple[BranchOutcome, ...]
    receipt: Mapping[str, Any]

    def public_dict(self) -> dict[str, Any]:
        return {
            "schema": RESULT_SCHEMA,
            "state": self.state,
            "final_answer": self.final_answer,
            "receipt": dict(self.receipt),
        }


class AlloyRefinementEngine:
    """Provider-neutral breadth, audit, local repair, and consensus engine."""

    def __init__(
        self,
        explorer: ExplorerAdapter,
        auditor_repairer: AuditorRepairerAdapter,
        *,
        policy: RefinementPolicy | None = None,
    ) -> None:
        self.explorer = explorer
        self.auditor_repairer = auditor_repairer
        self.policy = policy or RefinementPolicy()
        if self.explorer.identity.role != "EXPLORER":
            raise RefinementBoundaryError("explorer identity role must be EXPLORER")
        if self.auditor_repairer.identity.role not in {
            "AUDITOR_REPAIRER",
            "AUDITOR",
        }:
            raise RefinementBoundaryError(
                "auditor identity role must be AUDITOR or AUDITOR_REPAIRER"
            )

    @staticmethod
    def _cluster(candidates: Sequence[SolutionCandidate], threshold: float) -> list[int]:
        representatives: list[str] = []
        labels: list[int] = []
        for candidate in candidates:
            for index, text in enumerate(representatives):
                if jaccard_similarity(candidate.signature_text, text) >= threshold:
                    labels.append(index)
                    break
            else:
                labels.append(len(representatives))
                representatives.append(candidate.signature_text)
        return labels

    @staticmethod
    def _cluster_metrics(labels: Sequence[int]) -> dict[str, Any]:
        counts = Counter(labels)
        total = len(labels)
        entropy = 0.0
        for count in counts.values():
            probability = count / total
            entropy -= probability * math.log2(probability)
        return {
            "cluster_count": len(counts),
            "novelty_ratio": len(counts) / total,
            "entropy_bits": entropy,
            "dominant_cluster_mass": max(counts.values()) / total,
        }

    @staticmethod
    def _vote(candidates: Sequence[SolutionCandidate]) -> dict[str, Any]:
        groups: dict[str, list[SolutionCandidate]] = defaultdict(list)
        for candidate in candidates:
            groups[normalize_answer(candidate.answer)].append(candidate)
        ordered = sorted(
            groups.items(),
            key=lambda item: (-len(item[1]), item[0]),
        )
        winner_key, winner_candidates = ordered[0]
        runner_up = len(ordered[1][1]) if len(ordered) > 1 else 0
        representative = sorted(
            winner_candidates, key=lambda item: item.branch_id
        )[0].answer
        return {
            "answer": representative,
            "normalized_answer_sha256": sha256_hex(winner_key),
            "votes": len(winner_candidates),
            "total": len(candidates),
            "agreement": len(winner_candidates) / len(candidates),
            "margin": (len(winner_candidates) - runner_up) / len(candidates),
            "histogram": {
                sha256_hex(key): len(value)
                for key, value in sorted(groups.items())
            },
        }

    @staticmethod
    def _dependent_steps(
        candidate: SolutionCandidate, changed_step_id: str
    ) -> tuple[str, ...]:
        reverse: dict[str, set[str]] = defaultdict(set)
        for step in candidate.steps:
            for dependency in step.depends_on:
                reverse[dependency].add(step.step_id)
        seen: set[str] = set()
        queue: deque[str] = deque([changed_step_id])
        while queue:
            current = queue.popleft()
            for dependent in sorted(reverse.get(current, ())):
                if dependent not in seen:
                    seen.add(dependent)
                    queue.append(dependent)
        return tuple(sorted(seen))

    def _refine_branch(
        self,
        task: str,
        initial: SolutionCandidate,
        *,
        calls: list[int],
    ) -> BranchOutcome:
        candidate = initial
        findings: list[AuditFinding] = []
        patches: list[dict[str, Any]] = []
        unresolved: set[str] = set()
        ever_flagged: set[str] = set()
        preserved = 0
        changed_unflagged = 0
        depths_executed = 0

        for depth in range(1, self.policy.max_depth + 1):
            if calls[0] >= self.policy.max_calls:
                unresolved.add("BUDGET_EXHAUSTED")
                break
            depths_executed = depth
            depth_failed = False
            for step in tuple(candidate.steps):
                if calls[0] >= self.policy.max_calls:
                    unresolved.add("BUDGET_EXHAUSTED")
                    break
                before_all = {item.step_id: item.digest for item in candidate.steps}
                finding = self.auditor_repairer.audit(
                    task, candidate, step, depth=depth
                )
                calls[0] += 1
                if finding.step_id != step.step_id:
                    raise RefinementBoundaryError(
                        "auditor finding is bound to the wrong step"
                    )
                findings.append(finding)
                if finding.verdict == "PASS":
                    continue
                depth_failed = True
                ever_flagged.add(step.step_id)
                if (
                    finding.verdict != "FAIL"
                    or finding.confidence < self.policy.repair_confidence_floor
                ):
                    unresolved.add(finding.error_code)
                    continue
                if calls[0] >= self.policy.max_calls:
                    unresolved.add("BUDGET_EXHAUSTED")
                    break

                proposal = self.auditor_repairer.repair(
                    task, candidate, finding, depth=depth
                )
                calls[0] += 1
                if proposal.step.step_id != step.step_id:
                    raise RefinementBoundaryError(
                        "repair proposal is bound to the wrong step"
                    )
                initial_answer_sha = sha256_hex(candidate.answer)
                repaired = candidate.with_patch(proposal)
                after_all = {item.step_id: item.digest for item in repaired.steps}
                changed = {
                    step_id
                    for step_id in before_all
                    if before_all[step_id] != after_all[step_id]
                }
                if changed != {step.step_id}:
                    raise RefinementBoundaryError(
                        "step-local repair changed unbound steps"
                    )
                preserved += len(before_all) - len(changed)
                changed_unflagged += len(changed - ever_flagged)

                if calls[0] >= self.policy.max_calls:
                    unresolved.add("BUDGET_EXHAUSTED")
                    break
                verification = self.auditor_repairer.audit(
                    task, repaired, proposal.step, depth=depth
                )
                calls[0] += 1
                findings.append(verification)
                verified = verification.verdict == "PASS"
                patches.append(
                    {
                        "step_id": step.step_id,
                        "depth": depth,
                        "error_code": finding.error_code,
                        "before_sha256": before_all[step.step_id],
                        "after_sha256": proposal.step.digest,
                        "summary_sha256": sha256_hex(proposal.public_summary),
                        "initial_answer_sha256": initial_answer_sha,
                        "revised_answer_sha256": sha256_hex(repaired.answer),
                        "verified": verified,
                        "verification_error_code": verification.error_code,
                    }
                )
                if not verified:
                    unresolved.add(verification.error_code)
                    continue
                candidate = repaired
                unresolved.discard(finding.error_code)

                # A local patch can invalidate descendants. Re-audit them now;
                # they are repaired in a later depth if needed.
                dependent_ids = set(self._dependent_steps(candidate, step.step_id))
                for dependent in candidate.steps:
                    if dependent.step_id not in dependent_ids:
                        continue
                    if calls[0] >= self.policy.max_calls:
                        unresolved.add("BUDGET_EXHAUSTED")
                        break
                    dependent_finding = self.auditor_repairer.audit(
                        task, candidate, dependent, depth=depth
                    )
                    calls[0] += 1
                    findings.append(dependent_finding)
                    if dependent_finding.verdict != "PASS":
                        unresolved.add(dependent_finding.error_code)
                        ever_flagged.add(dependent.step_id)

            vote = self._vote((candidate,))
            terminal: dict[str, AuditFinding] = {}
            for finding in findings:
                terminal[finding.step_id] = finding
            unresolved_steps = sum(
                item.verdict != "PASS" for item in terminal.values()
            )
            uncertainty = 1.0 - vote["agreement"]
            unresolved_rate = unresolved_steps / max(1, len(candidate.steps))
            cost_rate = calls[0] / self.policy.max_calls
            utility = (
                0.55 * unresolved_rate
                + 0.25 * uncertainty
                + 0.20 * (1.0 - cost_rate)
            )
            if not depth_failed or (
                utility <= self.policy.utility_stop and not unresolved
            ):
                break

        terminal_findings: dict[str, AuditFinding] = {}
        for item in findings:
            terminal_findings[item.step_id] = item
        for item in terminal_findings.values():
            if item.verdict != "PASS":
                unresolved.add(item.error_code)
        return BranchOutcome(
            branch_id=initial.branch_id,
            initial_digest=initial.digest,
            final_candidate=candidate,
            findings=tuple(findings),
            patches=tuple(patches),
            unresolved=tuple(sorted(unresolved)),
            depths_executed=depths_executed,
            preserved_step_count=preserved,
            changed_unflagged_step_count=changed_unflagged,
        )

    def run(self, task: str) -> RefinementResult:
        task = _bounded_text(task, name="task", maximum=32_000)
        calls = [0]
        initial: list[SolutionCandidate] = []
        seen_branches: set[str] = set()
        novelty_flags: list[bool] = []
        breadth_stop_reason = "MAX_BREADTH_REACHED"
        prior_cluster_count = 0
        for branch_index in range(self.policy.breadth):
            if calls[0] >= self.policy.max_calls:
                raise RefinementBoundaryError(
                    "budget exhausted before breadth initialization completed"
                )
            candidate = self.explorer.explore(
                task,
                branch_index=branch_index,
                seed=self.policy.seed + branch_index,
            )
            calls[0] += 1
            if candidate.model != self.explorer.identity:
                raise RefinementBoundaryError(
                    "candidate model identity differs from explorer identity"
                )
            if candidate.branch_id in seen_branches:
                raise RefinementBoundaryError("explorer returned duplicate branch_id")
            seen_branches.add(candidate.branch_id)
            initial.append(candidate)

            labels_now = self._cluster(initial, self.policy.cluster_similarity)
            cluster_count = len(set(labels_now))
            novelty_flags.append(cluster_count > prior_cluster_count)
            prior_cluster_count = cluster_count
            enough_for_saturation = len(initial) >= max(
                self.policy.min_breadth, self.policy.saturation_window
            )
            recent_novelty = novelty_flags[-self.policy.saturation_window :]
            agreement = self._vote(initial)["agreement"]
            if (
                enough_for_saturation
                and not any(recent_novelty)
                and agreement >= self.policy.consensus_stop
            ):
                breadth_stop_reason = "SATURATED_CONSENSUS"
                break

        labels = self._cluster(initial, self.policy.cluster_similarity)
        diversity = self._cluster_metrics(labels)
        outcomes = tuple(
            self._refine_branch(task, candidate, calls=calls)
            for candidate in initial
        )
        final_candidates = tuple(item.final_candidate for item in outcomes)
        vote = self._vote(final_candidates)
        patch_count = sum(len(item.patches) for item in outcomes)
        verified_patch_count = sum(
            bool(patch.get("verified"))
            for item in outcomes
            for patch in item.patches
        )
        preserved = sum(item.preserved_step_count for item in outcomes)
        changed_unflagged = sum(
            item.changed_unflagged_step_count for item in outcomes
        )
        unresolved = sorted(
            {
                code
                for item in outcomes
                for code in item.unresolved
                if code != "NONE"
            }
        )
        state = "PROPOSAL_READY" if not unresolved else "REVIEW_REQUIRED"

        body: dict[str, Any] = {
            "schema": RECEIPT_SCHEMA,
            "method": "ALLOY_REFINEMENT_FABRIC",
            "task_sha256": sha256_hex(task),
            "model_pair": {
                "explorer": self.explorer.identity.public_dict(),
                "auditor_repairer": self.auditor_repairer.identity.public_dict(),
                "heterogeneous": (
                    self.explorer.identity.model_id
                    != self.auditor_repairer.identity.model_id
                    or self.explorer.identity.revision
                    != self.auditor_repairer.identity.revision
                ),
            },
            "policy": self.policy.public_dict(),
            "compute": {
                "calls_used": calls[0],
                "max_calls": self.policy.max_calls,
                "utilization": calls[0] / self.policy.max_calls,
            },
            "breadth": {
                "branch_count": len(initial),
                "max_branch_count": self.policy.breadth,
                "stopped_early": len(initial) < self.policy.breadth,
                "stop_reason": breadth_stop_reason,
                **diversity,
            },
            "consensus": {
                key: value for key, value in vote.items() if key != "answer"
            },
            "repair": {
                "attempted": patch_count,
                "verified": verified_patch_count,
                "yield": verified_patch_count / max(1, patch_count),
                "unresolved_error_codes": unresolved,
            },
            "regression_guard": {
                "preserved_step_count": preserved,
                "changed_unflagged_step_count": changed_unflagged,
                "regression_rate": changed_unflagged / max(1, preserved),
                "passed": changed_unflagged == 0,
            },
            "branches": [item.receipt_dict() for item in outcomes],
            "state": state,
            "authority": {
                "execution": "NONE",
                "training": "NONE",
                "promotion": "NONE",
                "merge": "NONE",
                "human_review_required": True,
            },
            "privacy": {
                "hidden_chain_of_thought_requested": False,
                "hidden_chain_of_thought_persisted": False,
                "raw_prompts_persisted": False,
                "public_verifiable_steps_only": True,
            },
        }
        receipt = dict(body)
        receipt["receipt_sha256"] = sha256_hex(canonical_bytes(body))
        return RefinementResult(
            task=task,
            final_answer=vote["answer"],
            state=state,
            branches=outcomes,
            receipt=receipt,
        )


class ReplayExplorer:
    """Deterministic adapter for tests, offline qualification, and replay."""

    def __init__(
        self, identity: ModelIdentity, candidates: Sequence[SolutionCandidate]
    ) -> None:
        self.identity = identity
        self._candidates = tuple(candidates)

    def explore(
        self, task: str, *, branch_index: int, seed: int
    ) -> SolutionCandidate:
        del task, seed
        try:
            return self._candidates[branch_index]
        except IndexError as exc:
            raise RefinementBoundaryError("replay candidate is missing") from exc


class ScriptedAuditorRepairer:
    """Deterministic audit/repair adapter with no provider or network calls."""

    def __init__(
        self,
        identity: ModelIdentity,
        findings: Mapping[tuple[str, str, str], AuditFinding],
        repairs: Mapping[tuple[str, str, str], RepairProposal],
    ) -> None:
        self.identity = identity
        self._findings = dict(findings)
        self._repairs = dict(repairs)

    def audit(
        self,
        task: str,
        candidate: SolutionCandidate,
        step: PublicStep,
        *,
        depth: int,
    ) -> AuditFinding:
        del task
        key = (candidate.branch_id, step.step_id, step.digest)
        finding = self._findings.get(key)
        if finding is None:
            return AuditFinding(
                step_id=step.step_id,
                verdict="PASS",
                error_code="NONE",
                public_note=f"step accepted at depth {depth}",
                confidence=1.0,
            )
        return finding

    def repair(
        self,
        task: str,
        candidate: SolutionCandidate,
        finding: AuditFinding,
        *,
        depth: int,
    ) -> RepairProposal:
        del task, depth
        step = next(
            (item for item in candidate.steps if item.step_id == finding.step_id),
            None,
        )
        if step is None:
            raise RefinementBoundaryError("repair target is absent")
        key = (candidate.branch_id, step.step_id, step.digest)
        try:
            return self._repairs[key]
        except KeyError as exc:
            raise RefinementBoundaryError("scripted repair is missing") from exc
