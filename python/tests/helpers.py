from __future__ import annotations

import json
from pathlib import Path


def baseline_release() -> dict:
    return {
        "id": "baseline-model-2026-09-01",
        "title": "Baseline model",
        "publisher": "Example",
        "releasedAt": "2026-09-01",
        "category": "inference-runtime",
        "primarySource": "https://huggingface.co/example/baseline-model",
        "artifactSource": "https://huggingface.co/example/baseline-model",
        "targetOrgans": ["szl-frontier"],
        "whyItMatters": "A deterministic fixture for cross-runtime policy tests.",
        "operationalTarget": "Benchmark in isolation.",
        "maturity": "released",
        "license": "Apache-2.0",
        "licensePosture": "clear",
        "resourceClass": "test",
        "posture": "EVALUATE_NOW",
        "signals": {
            "impact": 20,
            "estateFit": 20,
            "evidenceQuality": 20,
            "integrationReadiness": 20,
            "riskPenalty": 5,
        },
        "sourceClaims": ["Fixture."],
        "gates": [
            {
                "id": "source",
                "title": "Source",
                "scope": "evaluation",
                "state": "pass",
                "evidence": "Pinned.",
            },
            {
                "id": "perf",
                "title": "Performance",
                "scope": "production",
                "state": "pending",
                "evidence": "Not reproduced.",
            },
        ],
        "watch": {"kind": "model", "repoId": "example/baseline-model"},
        "materialityScore": 75,
        "material": True,
        "evaluationDecision": "EVALUATE",
        "productionDisposition": "HOLD",
    }


def write_manifest(path: Path, *, releases: list[dict] | None = None) -> Path:
    payload = {
        "schema": "szl.frontier.hugging-face-release-intake.v1",
        "evaluatedAt": "2026-09-04T13:36:00Z",
        "policy": {
            "defaultEffect": "hold",
            "materialityThreshold": 70,
        },
        "releases": releases if releases is not None else [baseline_release()],
    }
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path
