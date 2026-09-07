"""Catalog loading and curated frontier admissions.

The JavaScript manifest remains authoritative for releases already admitted by
SZL. Python-only admissions live in :mod:`szl_frontier.admissions` so source
verification records can evolve without entangling catalog mechanics. The
loader keeps the public JS/Python parity contract fail-closed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

from .admissions import PYTHON_ADMISSIONS
from .domain import FrontierRelease, SchemaError
from .policy import MaterialityPolicy

DEFAULT_MANIFEST = Path("public/frontier/release-evaluation-manifest.v1.json")
SUPPORTED_SCHEMA = "szl.frontier.hugging-face-release-intake.v1"


@dataclass(frozen=True, slots=True)
class Catalog:
    """Validated release registry plus manifest policy metadata."""

    releases: tuple[FrontierRelease, ...]
    evaluated_at: str
    materiality_threshold: int
    schema: str = SUPPORTED_SCHEMA

    def __post_init__(self) -> None:
        ids = [release.id for release in self.releases]
        if len(ids) != len(set(ids)):
            raise SchemaError("catalog contains duplicate release ids")

    def by_id(self, release_id: str) -> FrontierRelease:
        for release in self.releases:
            if release.id == release_id:
                return release
        raise KeyError(release_id)

    def categories(self) -> tuple[str, ...]:
        return tuple(sorted({release.category for release in self.releases}))


class CatalogLoader:
    """Load the JS-generated manifest and merge Python-only admissions."""

    def __init__(self, manifest_path: Path = DEFAULT_MANIFEST) -> None:
        self.manifest_path = manifest_path

    def load(self) -> Catalog:
        # Keep the standalone edge CLI out of package import side effects.
        from .edge_lane import edge_admissions

        manifest = self._read_manifest(self.manifest_path)
        schema = str(manifest.get("schema", ""))
        if schema != SUPPORTED_SCHEMA:
            raise SchemaError(
                f"unsupported frontier manifest schema {schema!r}; expected {SUPPORTED_SCHEMA!r}"
            )

        raw_manifest_releases = manifest.get("releases", ())
        if not isinstance(raw_manifest_releases, list):
            raise SchemaError("frontier manifest releases must be an array")
        manifest_releases = [
            FrontierRelease.from_mapping(item, origin="js-manifest")
            for item in raw_manifest_releases
        ]
        self._validate_js_projection(raw_manifest_releases, manifest_releases)
        python_releases = [
            FrontierRelease.from_mapping(item, origin="python-admission")
            for item in (*PYTHON_ADMISSIONS, *edge_admissions())
        ]
        releases = self._merge(manifest_releases, python_releases)
        threshold = int(manifest.get("policy", {}).get("materialityThreshold", 70))
        return Catalog(
            releases=tuple(sorted(releases, key=lambda release: (release.released_at, release.id))),
            evaluated_at=str(manifest.get("evaluatedAt", "")),
            materiality_threshold=threshold,
            schema=schema,
        )

    @staticmethod
    def _validate_js_projection(
        raw_releases: Iterable[Mapping[str, Any]],
        releases: Iterable[FrontierRelease],
    ) -> None:
        """Prove Python arithmetic agrees with fields emitted by the JS catalog.

        The public JSON manifest is a cross-language contract. If JavaScript
        changes scoring or gate semantics without the Python implementation being
        updated, CI must fail rather than letting two control planes disagree.
        """

        policy = MaterialityPolicy()
        for raw, release in zip(raw_releases, releases, strict=True):
            if "materialityScore" in raw:
                expected = int(raw["materialityScore"])
                actual = policy.score(release)
                if actual != expected:
                    raise SchemaError(
                        f"cross-runtime materiality drift for {release.id}: "
                        f"manifest={expected}, python={actual}"
                    )
            if "evaluationDecision" in raw:
                expected = str(raw["evaluationDecision"])
                actual = policy.evaluation_decision(release).value
                if actual != expected:
                    raise SchemaError(
                        f"cross-runtime evaluation drift for {release.id}: "
                        f"manifest={expected}, python={actual}"
                    )
            if "productionDisposition" in raw:
                expected = str(raw["productionDisposition"])
                actual = policy.production_disposition(release).value
                if actual != expected:
                    raise SchemaError(
                        f"cross-runtime production drift for {release.id}: "
                        f"manifest={expected}, python={actual}"
                    )

    @staticmethod
    def _read_manifest(path: Path) -> Mapping[str, Any]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise SchemaError(f"frontier manifest not found: {path}") from exc
        except json.JSONDecodeError as exc:
            raise SchemaError(f"frontier manifest is not valid JSON: {path}") from exc
        if not isinstance(payload, Mapping):
            raise SchemaError("frontier manifest root must be an object")
        return payload

    @staticmethod
    def _merge(
        baseline: Iterable[FrontierRelease],
        additions: Iterable[FrontierRelease],
    ) -> list[FrontierRelease]:
        merged = {release.id: release for release in baseline}
        for release in additions:
            existing = merged.get(release.id)
            if existing is not None:
                # Duplicate IDs are allowed only when the primary source is identical;
                # otherwise fail closed instead of shadowing one admission.
                if existing.primary_source != release.primary_source:
                    raise SchemaError(
                        f"release id collision for {release.id}: primary source mismatch"
                    )
                continue
            merged[release.id] = release
        return list(merged.values())
