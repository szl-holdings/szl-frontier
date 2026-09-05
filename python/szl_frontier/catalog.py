"""Catalog loading and curated frontier admissions.

The existing JavaScript manifest remains authoritative for releases already
admitted by SZL.  This Python control plane imports that manifest and then adds
new admissions that were verified against primary Hugging Face sources.  A
future JS migration can move those additions into the generated manifest
without changing Python call sites.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

from .domain import FrontierRelease, SchemaError
from .policy import MaterialityPolicy

DEFAULT_MANIFEST = Path("public/frontier/release-evaluation-manifest.v1.json")
SUPPORTED_SCHEMA = "szl.frontier.hugging-face-release-intake.v1"


def _gate(
    gate_id: str,
    title: str,
    scope: str,
    state: str,
    evidence: str,
) -> dict[str, str]:
    return {
        "id": gate_id,
        "title": title,
        "scope": scope,
        "state": state,
        "evidence": evidence,
    }


# These admissions are intentionally narrow: only items verified as materially
# relevant and not already present in the JS-generated manifest are listed.
PYTHON_ADMISSIONS: tuple[Mapping[str, Any], ...] = (
    {
        "id": "open-yap-1k-2026-09-03",
        "title": "Open Yap 1K full-duplex conversational speech corpus",
        "publisher": "The Agentic Data Company",
        "releasedAt": "2026-09-03",
        "category": "speech-training-data",
        "primarySource": "https://huggingface.co/blog/TheAgenticDataCompany/open-yap-1k",
        "artifactSource": "https://huggingface.co/datasets/TheAgenticDataCompany/open-yap-1k",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "szl-second-brain",
            "a11oy",
            "szl-serve",
        ],
        "whyItMatters": (
            "Natural dual-channel speech with overlap, interruption, backchannels, "
            "and 48 kHz audio is a materially better substrate for evaluating or "
            "post-training full-duplex voice systems than scripted turn-taking data."
        ),
        "operationalTarget": (
            "Start with the 8.9-hour Hub sample, benchmark turn-taking and streaming "
            "behavior, and require legal review of the full-corpus data-use agreement "
            "before any 1,000-hour ingestion."
        ),
        "maturity": "released",
        "license": (
            "Hub sample CC-BY-4.0; full 1,000-hour corpus governed by a separate data-use agreement"
        ),
        "licensePosture": "mixed",
        "resourceClass": "large dual-channel audio corpus",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 23,
            "estateFit": 22,
            "evidenceQuality": 24,
            "integrationReadiness": 19,
            "riskPenalty": 7,
        },
        "sourceClaims": [
            "The Hub sample contains 8.9 hours across 16 conversations.",
            "The announced full corpus contains 1,000 hours of dual-channel English conversation recorded at 48 kHz.",
            "The full corpus has a separate data-use agreement and must not be treated as equivalent to the Hub sample license.",
        ],
        "gates": [
            _gate(
                "open-yap-source",
                "Primary article and sample dataset pinned",
                "evaluation",
                "pass",
                "Official Hugging Face article and dataset card recorded.",
            ),
            _gate(
                "open-yap-sample",
                "Sample-only benchmark first",
                "evaluation",
                "pending",
                "Run bounded tests on the Hub sample before requesting or ingesting the full corpus.",
            ),
            _gate(
                "open-yap-rights",
                "Full-corpus rights admitted",
                "production",
                "hold",
                "The full-corpus data-use agreement requires separate review and explicit admission.",
            ),
            _gate(
                "open-yap-privacy",
                "Speaker privacy constraints enforced",
                "production",
                "pending",
                "No identity inference, voice cloning, or prohibited redistribution paths may be enabled.",
            ),
            _gate(
                "open-yap-quality",
                "Full-duplex quality improvement reproduced",
                "production",
                "pending",
                "Require measured gains on overlap handling, barge-in, latency, and turn-taking against the current baseline.",
            ),
        ],
        "watch": {
            "kind": "dataset",
            "repoId": "TheAgenticDataCompany/open-yap-1k",
        },
    },
    {
        "id": "vlm-run-gateway-2026-09-04",
        "title": "VLM Run Gateway unified OCR/VLM evaluation API",
        "publisher": "VLM Run",
        "releasedAt": "2026-09-04",
        "category": "multimodal-deployment-evaluation",
        "primarySource": "https://huggingface.co/blog/vlm-run/introducing-gateway",
        "artifactSource": "https://huggingface.co/blog/vlm-run/introducing-gateway",
        "targetOrgans": [
            "szl-frontier",
            "a11oy",
            "szl-command-lab",
            "szl-serve",
            "szl-lake",
        ],
        "whyItMatters": (
            "A unified API across OCR, VLM, ViT, document, image, and video workloads "
            "can accelerate reproducible model bake-offs while exposing serving details "
            "such as quantization, FPS, and model/runtime variance that affect visual quality."
        ),
        "operationalTarget": (
            "Use only as an external evaluation adapter in an isolated lane; compare exact "
            "model revisions and outputs against direct/self-hosted baselines before any dependency decision."
        ),
        "maturity": "alpha",
        "license": "Service and underlying model licenses vary; review per evaluated model",
        "licensePosture": "review-required",
        "resourceClass": "external multimodal inference gateway",
        "posture": "SANDBOX_ONLY",
        "signals": {
            "impact": 20,
            "estateFit": 22,
            "evidenceQuality": 19,
            "integrationReadiness": 21,
            "riskPenalty": 10,
        },
        "sourceClaims": [
            "The release exposes a unified API for OCR models, VLMs, and ViT-style vision models.",
            "The article describes document pipelines and video input with FPS control.",
            "The service is explicitly alpha and should not be treated as a production control-plane dependency.",
        ],
        "gates": [
            _gate(
                "vlm-run-source",
                "Primary Hugging Face article pinned",
                "evaluation",
                "pass",
                "Hugging Face community release article recorded.",
            ),
            _gate(
                "vlm-run-isolation",
                "External-service isolation",
                "evaluation",
                "pending",
                "Use non-sensitive benchmark fixtures only; no production documents or credentials.",
            ),
            _gate(
                "vlm-run-parity",
                "Direct-serving parity measured",
                "production",
                "pending",
                "Compare outputs and quality against exact self-hosted model revisions and serving parameters.",
            ),
            _gate(
                "vlm-run-terms",
                "Service and model terms admitted",
                "production",
                "hold",
                "Underlying model licenses and gateway terms must be reviewed per workload.",
            ),
            _gate(
                "vlm-run-slo",
                "Reliability and observability SLO proven",
                "production",
                "pending",
                "Require latency, retry, rate-limit, error-mode, and provenance receipts before dependency promotion.",
            ),
        ],
        "watch": {"kind": "blog", "repoId": "vlm-run/introducing-gateway"},
    },
    {
        "id": "trl-grpo-ifstruct-2026-09-03",
        "title": "TRL GRPO structured-output post-training recipe",
        "publisher": "Hugging Face / Liquid AI contributors",
        "releasedAt": "2026-09-03",
        "category": "post-training-structured-output",
        "primarySource": "https://huggingface.co/blog/grpo-with-trl-ifstruct",
        "artifactSource": "https://huggingface.co/blog/grpo-with-trl-ifstruct",
        "targetOrgans": [
            "szl-frontier",
            "szl-nemo",
            "a11oy-factory",
            "szl-kernels",
            "a11oy",
        ],
        "whyItMatters": (
            "The recipe demonstrates a cheap, reproducible way to train small models for "
            "schema compliance using TRL/GRPO, which directly targets governed JSON, YAML, "
            "tool-call, and receipt contracts used by SZL kernels and agents."
        ),
        "operationalTarget": (
            "Reproduce the published structured-output lift on a tiny baseline, then swap in "
            "SZL schemas and reward functions while preserving held-out evaluation and rollback baselines."
        ),
        "maturity": "released-recipe",
        "license": "Review TRL, base-model, dataset, and generated-checkpoint licenses independently",
        "licensePosture": "review-required",
        "resourceClass": "low-cost GPU post-training",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 22,
            "estateFit": 25,
            "evidenceQuality": 24,
            "integrationReadiness": 23,
            "riskPenalty": 4,
        },
        "sourceClaims": [
            "The published run uses roughly 500 samples and 100 GRPO training steps.",
            "The article reports IFStruct compliance improving from 22.6% to 29.7% on the demonstrated 350M model.",
            "The recipe uses TRL and is small enough to reproduce before applying SZL-specific rewards or schemas.",
        ],
        "gates": [
            _gate(
                "trl-source",
                "Primary recipe pinned",
                "evaluation",
                "pass",
                "Official Hugging Face article recorded.",
            ),
            _gate(
                "trl-reproduce",
                "Published baseline reproduced",
                "evaluation",
                "pending",
                "Re-run the small published experiment with pinned model, data, package, and seed metadata.",
            ),
            _gate(
                "trl-heldout",
                "Held-out SZL schema benchmark",
                "production",
                "pending",
                "Require improvement on unseen schemas rather than reward-hacked training examples.",
            ),
            _gate(
                "trl-regression",
                "General capability regression bounded",
                "production",
                "pending",
                "Track syntax validity, semantic accuracy, latency, refusal behavior, and non-structured task regressions.",
            ),
            _gate(
                "trl-license",
                "Component licenses admitted",
                "production",
                "hold",
                "Base model, training data, TRL version, and produced checkpoint must each be cleared.",
            ),
        ],
        "watch": {"kind": "blog", "repoId": "grpo-with-trl-ifstruct"},
    },
)


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
            for item in PYTHON_ADMISSIONS
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

        The public JSON manifest is a cross-language contract.  If JavaScript
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
                # otherwise we fail closed instead of shadowing one admission.
                if existing.primary_source != release.primary_source:
                    raise SchemaError(
                        f"release id collision for {release.id}: primary source mismatch"
                    )
                continue
            merged[release.id] = release
        return list(merged.values())
