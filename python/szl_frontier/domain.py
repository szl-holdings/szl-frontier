"""Domain model for the SZL Hugging Face frontier control plane.

The module deliberately contains no I/O.  Keeping validation and policy-facing
state pure makes it straightforward to unit test, serialize deterministically,
and reuse from GitHub Actions, a CLI, or a long-running A11oy worker.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import StrEnum
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse

HF_ORIGIN = "https://huggingface.co"


class FrontierError(RuntimeError):
    """Base class for fail-closed frontier control-plane failures."""


class SchemaError(FrontierError):
    """Raised when a release or manifest violates the admitted schema."""


class GateScope(StrEnum):
    EVALUATION = "evaluation"
    PRODUCTION = "production"


class GateState(StrEnum):
    PASS = "pass"
    PENDING = "pending"
    HOLD = "hold"


class EvaluationDecision(StrEnum):
    """Decision vocabulary kept byte-for-byte compatible with the JS catalog."""

    EVALUATE = "EVALUATE"
    BENCHMARK = "BENCHMARK"
    SANDBOX = "SANDBOX"
    WATCH = "WATCH"
    IGNORE = "IGNORE"


class ProductionDisposition(StrEnum):
    HOLD = "HOLD"
    PROMOTE = "PROMOTE"


@dataclass(frozen=True, slots=True)
class ReleaseSignals:
    """Five bounded factors used by the deterministic materiality policy.

    Positive factors are each constrained to ``0..25``; ``risk_penalty`` is
    constrained to ``0..25`` and subtracted from the sum.  The resulting score
    is therefore stable, inspectable, and independent of an LLM judgment.
    """

    impact: int
    estate_fit: int
    evidence_quality: int
    integration_readiness: int
    risk_penalty: int

    def __post_init__(self) -> None:
        for name, value in (
            ("impact", self.impact),
            ("estate_fit", self.estate_fit),
            ("evidence_quality", self.evidence_quality),
            ("integration_readiness", self.integration_readiness),
            ("risk_penalty", self.risk_penalty),
        ):
            if not 0 <= value <= 25:
                raise SchemaError(f"{name} must be between 0 and 25; got {value}")

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "ReleaseSignals":
        return cls(
            impact=int(value["impact"]),
            estate_fit=int(value["estateFit"]),
            evidence_quality=int(value["evidenceQuality"]),
            integration_readiness=int(value["integrationReadiness"]),
            risk_penalty=int(value["riskPenalty"]),
        )

    def as_mapping(self) -> dict[str, int]:
        return {
            "impact": self.impact,
            "estateFit": self.estate_fit,
            "evidenceQuality": self.evidence_quality,
            "integrationReadiness": self.integration_readiness,
            "riskPenalty": self.risk_penalty,
        }


@dataclass(frozen=True, slots=True)
class ReleaseGate:
    id: str
    title: str
    scope: GateScope
    state: GateState
    evidence: str

    def __post_init__(self) -> None:
        if not self.id or not self.title or not self.evidence:
            raise SchemaError("release gate requires id, title, and evidence")

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "ReleaseGate":
        return cls(
            id=str(value["id"]),
            title=str(value["title"]),
            scope=GateScope(value["scope"]),
            state=GateState(value["state"]),
            evidence=str(value["evidence"]),
        )

    def as_mapping(self) -> dict[str, str]:
        return {
            "id": self.id,
            "title": self.title,
            "scope": self.scope.value,
            "state": self.state.value,
            "evidence": self.evidence,
        }


@dataclass(frozen=True, slots=True)
class WatchSpec:
    """How a release should be re-probed for upstream change detection."""

    kind: str
    repo_id: str | None = None
    author: str | None = None
    baseline_count: int | None = None
    baseline_revision: str | None = None
    baseline_fingerprint: str | None = None

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "WatchSpec":
        return cls(
            kind=str(value["kind"]),
            repo_id=value.get("repoId"),
            author=value.get("author"),
            baseline_count=value.get("baselineCount"),
            baseline_revision=value.get("baselineRevision"),
            baseline_fingerprint=value.get("baselineFingerprint"),
        )

    def as_mapping(self) -> dict[str, Any]:
        result: dict[str, Any] = {"kind": self.kind}
        if self.repo_id is not None:
            result["repoId"] = self.repo_id
        if self.author is not None:
            result["author"] = self.author
        if self.baseline_count is not None:
            result["baselineCount"] = self.baseline_count
        if self.baseline_revision is not None:
            result["baselineRevision"] = self.baseline_revision
        if self.baseline_fingerprint is not None:
            result["baselineFingerprint"] = self.baseline_fingerprint
        return result


@dataclass(frozen=True, slots=True)
class FrontierRelease:
    """Immutable admitted frontier release.

    URLs are constrained to Hugging Face primary sources because the watcher is
    designed to make evidence provenance obvious and to avoid silently routing
    collection through arbitrary third-party hosts.
    """

    id: str
    title: str
    publisher: str
    released_at: date
    category: str
    primary_source: str
    artifact_source: str
    target_organs: tuple[str, ...]
    why_it_matters: str
    operational_target: str
    maturity: str
    license: str
    license_posture: str
    resource_class: str
    posture: str
    signals: ReleaseSignals
    source_claims: tuple[str, ...]
    gates: tuple[ReleaseGate, ...]
    watch: WatchSpec
    origin: str = "manifest"

    def __post_init__(self) -> None:
        if not self.id or not self.title or not self.category:
            raise SchemaError("release requires id, title, and category")
        if not self.target_organs:
            raise SchemaError(f"release {self.id} requires at least one target organ")
        if len(set(self.target_organs)) != len(self.target_organs):
            raise SchemaError(f"release {self.id} has duplicate target organs")
        for field_name, url in (
            ("primary_source", self.primary_source),
            ("artifact_source", self.artifact_source),
        ):
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.netloc != "huggingface.co":
                raise SchemaError(
                    f"{field_name} for {self.id} must use {HF_ORIGIN}; got {url}"
                )
        gate_ids = [gate.id for gate in self.gates]
        if len(set(gate_ids)) != len(gate_ids):
            raise SchemaError(f"release {self.id} contains duplicate gate ids")

    @classmethod
    def from_mapping(
        cls, value: Mapping[str, Any], *, origin: str = "manifest"
    ) -> "FrontierRelease":
        return cls(
            id=str(value["id"]),
            title=str(value["title"]),
            publisher=str(value["publisher"]),
            released_at=date.fromisoformat(str(value["releasedAt"])),
            category=str(value["category"]),
            primary_source=str(value["primarySource"]),
            artifact_source=str(value["artifactSource"]),
            target_organs=tuple(str(item) for item in value["targetOrgans"]),
            why_it_matters=str(value["whyItMatters"]),
            operational_target=str(value["operationalTarget"]),
            maturity=str(value["maturity"]),
            license=str(value["license"]),
            license_posture=str(value["licensePosture"]),
            resource_class=str(value["resourceClass"]),
            posture=str(value["posture"]),
            signals=ReleaseSignals.from_mapping(value["signals"]),
            source_claims=tuple(str(item) for item in value.get("sourceClaims", ())),
            gates=tuple(ReleaseGate.from_mapping(item) for item in value["gates"]),
            watch=WatchSpec.from_mapping(value["watch"]),
            origin=origin,
        )

    def as_mapping(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "publisher": self.publisher,
            "releasedAt": self.released_at.isoformat(),
            "category": self.category,
            "primarySource": self.primary_source,
            "artifactSource": self.artifact_source,
            "targetOrgans": list(self.target_organs),
            "whyItMatters": self.why_it_matters,
            "operationalTarget": self.operational_target,
            "maturity": self.maturity,
            "license": self.license,
            "licensePosture": self.license_posture,
            "resourceClass": self.resource_class,
            "posture": self.posture,
            "signals": self.signals.as_mapping(),
            "sourceClaims": list(self.source_claims),
            "gates": [gate.as_mapping() for gate in self.gates],
            "watch": self.watch.as_mapping(),
            "origin": self.origin,
        }


@dataclass(frozen=True, slots=True)
class SourceSnapshot:
    """Bounded metadata collected from a primary Hugging Face source."""

    kind: str
    source: str
    revision: str | None = None
    created_at: str | None = None
    last_modified: str | None = None
    private: bool = False
    gated: bool = False
    disabled: bool = False
    downloads: int | None = None
    likes: int | None = None
    pipeline_tag: str | None = None
    library_name: str | None = None
    license: str | None = None
    artifact_fingerprint: str | None = None
    content_bytes: int | None = None
    inventory_count: int | None = None
    observed_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc), compare=False
    )

    @property
    def publicly_usable(self) -> bool:
        return not self.private and not self.gated and not self.disabled

    def as_mapping(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "source": self.source,
            "revision": self.revision,
            "createdAt": self.created_at,
            "lastModified": self.last_modified,
            "private": self.private,
            "gated": self.gated,
            "disabled": self.disabled,
            "downloads": self.downloads,
            "likes": self.likes,
            "pipelineTag": self.pipeline_tag,
            "libraryName": self.library_name,
            "license": self.license,
            "artifactFingerprint": self.artifact_fingerprint,
            "contentBytes": self.content_bytes,
            "inventoryCount": self.inventory_count,
            "observedAt": self.observed_at.isoformat(),
        }


@dataclass(frozen=True, slots=True)
class MetricRequirement:
    name: str
    direction: str
    rationale: str
    required: bool = True


@dataclass(frozen=True, slots=True)
class EvaluationPlan:
    release_id: str
    lane: str
    metrics: tuple[MetricRequirement, ...]
    invariants: tuple[str, ...]
    artifacts: tuple[str, ...]
    stop_conditions: tuple[str, ...]

    def as_mapping(self) -> dict[str, Any]:
        return {
            "releaseId": self.release_id,
            "lane": self.lane,
            "metrics": [
                {
                    "name": metric.name,
                    "direction": metric.direction,
                    "rationale": metric.rationale,
                    "required": metric.required,
                }
                for metric in self.metrics
            ],
            "invariants": list(self.invariants),
            "artifacts": list(self.artifacts),
            "stopConditions": list(self.stop_conditions),
        }


@dataclass(frozen=True, slots=True)
class Assessment:
    release: FrontierRelease
    materiality_score: int
    evaluation_decision: EvaluationDecision
    production_disposition: ProductionDisposition
    production_blockers: tuple[str, ...]
    snapshot: SourceSnapshot | None = None
    evaluation_plan: EvaluationPlan | None = None

    def as_mapping(self) -> dict[str, Any]:
        return {
            "release": self.release.as_mapping(),
            "materialityScore": self.materiality_score,
            "evaluationDecision": self.evaluation_decision.value,
            "productionDisposition": self.production_disposition.value,
            "productionBlockers": list(self.production_blockers),
            "snapshot": self.snapshot.as_mapping() if self.snapshot else None,
            "evaluationPlan": (
                self.evaluation_plan.as_mapping() if self.evaluation_plan else None
            ),
        }


def tupled(values: Iterable[str]) -> tuple[str, ...]:
    """Normalize an iterable into a duplicate-free tuple while preserving order."""

    return tuple(dict.fromkeys(str(value) for value in values))
