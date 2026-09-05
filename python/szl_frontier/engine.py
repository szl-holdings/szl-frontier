"""Orchestration layer for catalog policy, Hub evidence, plans, and receipts."""

from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from .catalog import Catalog
from .domain import Assessment, ProductionDisposition, SourceSnapshot
from .evaluation import EvaluationPlanner
from .huggingface import HuggingFaceClient
from .policy import MaterialityPolicy
from .receipts import EvidenceReceipt, ReceiptError, ReceiptFactory, sha256_hex


class FrontierEngine:
    """Single coordination surface used by humans, CI, and future agents.

    The engine is intentionally policy-first.  A live source can enrich an
    evaluation but can never turn a HOLD into production promotion by itself.
    """

    def __init__(
        self,
        catalog: Catalog,
        *,
        policy: MaterialityPolicy | None = None,
        planner: EvaluationPlanner | None = None,
        hf_client: HuggingFaceClient | None = None,
    ) -> None:
        self.catalog = catalog
        self.policy = policy or MaterialityPolicy(catalog.materiality_threshold)
        self.planner = planner or EvaluationPlanner()
        self.hf_client = hf_client or HuggingFaceClient()

    def assess(
        self,
        release_id: str,
        *,
        live: bool = False,
        promotion_receipt: EvidenceReceipt | None = None,
        hmac_key: bytes | None = None,
    ) -> Assessment:
        release = self.catalog.by_id(release_id)
        snapshot = self.hf_client.snapshot(release) if live else None
        receipt_sealed = False
        if promotion_receipt is not None:
            try:
                promotion_receipt.verify(hmac_key=hmac_key)
            except ReceiptError:
                receipt_sealed = False
            else:
                receipt_sealed = (
                    promotion_receipt.sealed
                    and promotion_receipt.release_id == release.id
                    and promotion_receipt.subject
                    == "hugging-face-frontier-production-authorization"
                    and promotion_receipt.payload.get("productionAuthorized") is True
                    and promotion_receipt.payload.get("catalogEvaluatedAt")
                    == self.catalog.evaluated_at
                )
        blockers = list(
            self.policy.production_blockers(
                release,
                receipt_sealed=receipt_sealed,
            )
        )
        if snapshot is not None and not snapshot.publicly_usable:
            blockers.append("upstream source is private, gated, or disabled")
        disposition = (
            ProductionDisposition.PROMOTE
            if not blockers
            else ProductionDisposition.HOLD
        )
        return Assessment(
            release=release,
            materiality_score=self.policy.score(release),
            evaluation_decision=self.policy.evaluation_decision(release),
            production_disposition=disposition,
            production_blockers=tuple(blockers),
            snapshot=snapshot,
            evaluation_plan=self.planner.plan(release),
        )

    def assess_all(self, *, live: bool = False) -> tuple[Assessment, ...]:
        return tuple(self.assess(release.id, live=live) for release in self.catalog.releases)

    def material(self, *, live: bool = False) -> tuple[Assessment, ...]:
        return tuple(
            assessment
            for assessment in self.assess_all(live=live)
            if assessment.materiality_score >= self.policy.threshold
        )

    def is_new_observation(self, assessment: Assessment) -> bool:
        """Return whether an observation is new relative to the admitted cursor.

        Python-only admissions are compared to reviewable immutable baselines.
        JS-manifest releases must show an upstream modification after the manifest
        cursor (or an expanded inventory) before they can alert.
        """

        snapshot = assessment.snapshot
        if snapshot is None or not snapshot.publicly_usable:
            return False
        release = assessment.release
        if release.origin == "python-admission":
            if release.watch.kind == "dataset":
                if (
                    not release.watch.baseline_revision
                    or not release.watch.baseline_fingerprint
                    or not snapshot.revision
                    or not snapshot.artifact_fingerprint
                ):
                    return False
                return (
                    snapshot.revision != release.watch.baseline_revision
                    or snapshot.artifact_fingerprint
                    != release.watch.baseline_fingerprint
                )
            if release.watch.kind == "blog":
                if (
                    not release.watch.baseline_fingerprint
                    or not snapshot.artifact_fingerprint
                ):
                    return False
                return (
                    snapshot.artifact_fingerprint
                    != release.watch.baseline_fingerprint
                )
            return False
        if (
            release.watch.kind == "model-inventory"
            and release.watch.baseline_count is not None
            and snapshot.inventory_count is not None
            and snapshot.inventory_count > release.watch.baseline_count
        ):
            return True

        observed = snapshot.last_modified or snapshot.created_at
        if not observed or not self.catalog.evaluated_at:
            return False
        try:
            observed_at = self._parse_timestamp(observed)
            cursor = self._parse_timestamp(self.catalog.evaluated_at)
        except ValueError:
            return False
        return observed_at > cursor

    @staticmethod
    def _parse_timestamp(value: str) -> datetime:
        text = value.strip()
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed = parsedate_to_datetime(text)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"unparseable timestamp: {value}") from exc
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def notification_fingerprint(assessment: Assessment) -> str:
        """Stable dedupe key: release identity + the bounded upstream snapshot."""

        snapshot = assessment.snapshot
        observed = None
        if snapshot is not None:
            observed = {
                "revision": snapshot.revision,
                "lastModified": (
                    None
                    if assessment.release.watch.kind == "blog"
                    else snapshot.last_modified
                ),
                "artifactFingerprint": snapshot.artifact_fingerprint,
                "inventoryCount": snapshot.inventory_count,
                "private": snapshot.private,
                "gated": snapshot.gated,
                "disabled": snapshot.disabled,
            }
        return sha256_hex(
            {
                "releaseId": assessment.release.id,
                "materialityScore": assessment.materiality_score,
                "source": assessment.release.primary_source,
                "observed": observed,
            }
        )

    def receipt(
        self,
        assessment: Assessment,
        *,
        factory: ReceiptFactory | None = None,
        previous_receipt_digest: str | None = None,
    ) -> EvidenceReceipt:
        factory = factory or ReceiptFactory()
        payload = {
            "assessment": assessment.as_mapping(),
            "catalogEvaluatedAt": self.catalog.evaluated_at,
            "controlPlaneObservedAt": datetime.now(timezone.utc).isoformat(),
        }
        return factory.create(
            release_id=assessment.release.id,
            subject="hugging-face-frontier-assessment",
            payload=payload,
            previous_receipt_digest=previous_receipt_digest,
        )
