# SPDX-License-Identifier: Apache-2.0
"""Compile pinned frontier waves into reproducible evaluation inputs, never routes.

Stdlib only. This module does not download weights, execute repository code, infer
license clearance, allocate hardware, or authorize production. A checksum proves
input consistency, not publisher authenticity or permission to use a model.

Run from the repo root:
PYTHONPATH=python python -m szl_frontier.wave_plan --wave frontier/waves/2026-09-07.json \
  --pins frontier/evidence/2026-09-07-upstream-model-pins.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urlsplit

MAX_INPUT = 2 * 1024 * 1024
SHA40 = re.compile(r"[0-9a-f]{40}\Z")
REPO = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*\Z")
ORDER = ["github-source", "hugging-face-artifact-projection", "a-11-oy.com-product-surface", "a11oy.net-proof-registry"]
REQUIRED_EVIDENCE = {"primary-source-pin", "license-posture", "reproducible-evaluation", "rollback-or-fallback", "exact-source-revision", "domain-proof-record"}
ROLES = {"primary", "reference", "primary-quantized", "base-model"}
REQUIRED_MEASUREMENTS = ["quality_on_pinned_inputs", "incumbent_comparison", "fallback", "latency", "peak_memory", "cost", "input_rights", "runtime_image_digest", "tokenizer_and_template_identity"]


class WavePlanError(ValueError):
    """Input evidence cannot support even an evaluation-preparation record."""


def require(ok: bool, code: str) -> None:
    if not ok:
        raise WavePlanError(code)


def canonical(value: Any) -> bytes:
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    except (ValueError, TypeError) as exc:
        raise WavePlanError("NON_CANONICAL_JSON") from exc


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        require(key not in result, "DUPLICATE_JSON_KEY")
        result[key] = value
    return result


def _nonfinite(_: str) -> None:
    raise WavePlanError("NON_FINITE_JSON")


def load(path: Path) -> dict[str, Any]:
    with path.open("rb") as handle:
        data = handle.read(MAX_INPUT + 1)
    require(len(data) <= MAX_INPUT, "INPUT_TOO_LARGE")
    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=_pairs, parse_constant=_nonfinite)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise WavePlanError("INVALID_JSON") from exc
    require(isinstance(value, dict), "JSON_OBJECT_REQUIRED")
    return value


def repo_id(value: Any) -> str:
    require(isinstance(value, str) and REPO.fullmatch(value) is not None, "INVALID_REPOSITORY")
    return value


def model_url(value: Any) -> str:
    require(isinstance(value, str), "INVALID_MODEL_URL")
    parsed = urlsplit(value)
    require(parsed.scheme == "https" and parsed.netloc == "huggingface.co" and not parsed.query and not parsed.fragment, "NON_CANONICAL_MODEL_URL")
    result = repo_id(parsed.path.removeprefix("/"))
    require(value == "https://huggingface.co/" + result, "NON_CANONICAL_MODEL_URL")
    return result


def verify_pin_receipt(pins: Mapping[str, Any]) -> str:
    require(pins.get("schema") == "szl.frontier.upstream-model-pin-set.v1", "PIN_SCHEMA")
    require(pins.get("authority") == "PUBLIC_METADATA_ONLY", "PIN_AUTHORITY")
    receipt = pins.get("receipt")
    require(isinstance(receipt, dict), "PIN_RECEIPT_REQUIRED")
    require(receipt.get("algorithm") == "sha256" and receipt.get("scope") == "canonical-json(body-without-receipt)", "PIN_RECEIPT_SCHEME")
    body = {k: v for k, v in pins.items() if k != "receipt"}
    encoded = canonical(body)
    require(type(receipt.get("canonicalBytes")) is int and receipt["canonicalBytes"] == len(encoded), "PIN_BYTE_COUNT")
    actual = hashlib.sha256(encoded).hexdigest()
    require(receipt.get("digest") == actual, "PIN_DIGEST_MISMATCH")
    return actual


def compile_plan(wave: Mapping[str, Any], pins: Mapping[str, Any]) -> dict[str, Any]:
    require(wave.get("schema") == "szl.frontier.integration-wave.v1", "WAVE_SCHEMA")
    require(isinstance(wave.get("wave"), str) and bool(wave["wave"]), "WAVE_ID")
    policy = wave.get("policy")
    require(isinstance(policy, dict) and policy.get("defaultEffect") == "hold" and policy.get("automaticProductionPromotion") is False, "PRODUCTION_AUTHORITY_REFUSED")
    evidence = policy.get("requiredEvidence")
    require(isinstance(evidence, list) and all(isinstance(x, str) for x in evidence) and REQUIRED_EVIDENCE <= set(evidence), "REQUIRED_EVIDENCE_MISSING")
    alignment = wave.get("alignment")
    require(isinstance(alignment, dict) and alignment.get("order") == ORDER, "ALIGNMENT_ORDER")
    github = alignment.get("github")
    require(isinstance(github, dict), "SOURCE_AUTHORITY")
    control = github.get("controlPlane")
    require(control == "szl-holdings/szl-frontier" and wave.get("sourceOfTruth") == control, "SOURCE_AUTHORITY")
    consumers = github.get("consumers")
    require(isinstance(consumers, list) and all(isinstance(x, str) for x in consumers), "CONSUMERS")
    owners = {repo_id(x) for x in consumers} | {control}
    require(all(x.startswith("szl-holdings/") for x in owners), "FOREIGN_CONSUMER")
    pin_digest = verify_pin_receipt(pins)
    releases, models = wave.get("releases"), pins.get("models")
    require(isinstance(releases, list) and 1 <= len(releases) <= 50, "RELEASE_BUDGET")
    require(isinstance(models, list) and 1 <= len(models) <= 200, "MODEL_BUDGET")
    release_ids: set[str] = set()
    for row in releases:
        require(isinstance(row, dict) and isinstance(row.get("id"), str) and bool(row["id"]), "RELEASE_ID")
        require(row["id"] not in release_ids, "DUPLICATE_RELEASE")
        release_ids.add(row["id"])
        require(row.get("productionDisposition", "HOLD") == "HOLD", "PRODUCTION_AUTHORITY_REFUSED")
    index: dict[tuple[str, str], dict[str, Any]] = {}
    model_revisions: dict[str, str] = {}
    for model in models:
        require(isinstance(model, dict), "MODEL_ROW")
        release_id = model.get("releaseId")
        require(isinstance(release_id, str) and release_id in release_ids, "UNDECLARED_PIN_RELEASE")
        name = repo_id(model.get("repoId"))
        require((release_id, name) not in index, "DUPLICATE_PIN")
        revision = model.get("revision")
        require(isinstance(revision, str) and SHA40.fullmatch(revision) is not None, "IMMUTABLE_REVISION_REQUIRED")
        require(name not in model_revisions or model_revisions[name] == revision, "CONFLICTING_MODEL_REVISION")
        model_revisions[name] = revision
        require(isinstance(model.get("role"), str) and model["role"] in ROLES, "MODEL_ROLE")
        require(all(model.get(k) is False for k in ("private", "gated", "disabled")), "MODEL_ACCESS_REVIEW_REQUIRED")
        require(isinstance(model.get("license"), str) and bool(model["license"].strip()), "LICENSE_METADATA_REQUIRED")
        index[(release_id, name)] = model
    plans = []
    for release in sorted(releases, key=lambda r: r["id"]):
        release_id = release["id"]
        urls = release.get("artifacts")
        require(isinstance(urls, list) and bool(urls), "ARTIFACTS_REQUIRED")
        artifacts = [model_url(url) for url in urls]
        require(len(set(artifacts)) == len(artifacts), "DUPLICATE_ARTIFACT")
        primary = model_url(release.get("primaryArtifact"))
        require(primary in artifacts, "PRIMARY_NOT_IN_ARTIFACTS")
        targets = release.get("targetRepos")
        require(isinstance(targets, list) and bool(targets) and all(isinstance(x, str) for x in targets), "TARGETS_REQUIRED")
        require(set(targets) <= owners and len(set(targets)) == len(targets), "UNDECLARED_OR_DUPLICATE_OWNER")
        require(release.get("priority") in {"P0", "P1", "P2"}, "PRIORITY")
        closure, pending = set(artifacts), list(artifacts)
        while pending:
            name = pending.pop()
            model = index.get((release_id, name))
            require(model is not None, "ARTIFACT_PIN_MISSING")
            bases = model.get("baseModel")
            require(bases is None or isinstance(bases, list), "BASE_MODEL_SHAPE")
            for base in bases or []:
                base = repo_id(base)
                require(base != name, "SELF_REFERENTIAL_BASE_MODEL")
                if base not in closure:
                    closure.add(base)
                    pending.append(base)
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(name: str) -> None:
            require(name not in visiting, "CYCLIC_BASE_MODEL")
            if name in visited:
                return
            visiting.add(name)
            for base in index[(release_id, name)].get("baseModel") or []:
                visit(base)
            visiting.remove(name)
            visited.add(name)

        for name in sorted(closure):
            visit(name)
        scoped = {name for rid, name in index if rid == release_id}
        require(scoped == closure, "UNDECLARED_PIN_ARTIFACT")
        require(index[(release_id, primary)]["role"] in {"primary", "primary-quantized"}, "PRIMARY_ROLE_MISMATCH")
        for name in artifacts:
            if name != primary:
                require(index[(release_id, name)]["role"] == "reference", "REFERENCE_ROLE_MISMATCH")
        for name in closure - set(artifacts):
            require(index[(release_id, name)]["role"] == "base-model", "BASE_ROLE_MISMATCH")
        rows = []
        for name in sorted(closure):
            model = index[(release_id, name)]
            rows.append({
                "repoId": name, "revision": model["revision"], "role": model["role"],
                "source": "https://huggingface.co/" + name + "/tree/" + model["revision"],
                "observedLicenseMetadata": model["license"], "licenseTextVerified": False,
                "licenseApproved": False, "pipelineTag": model.get("pipelineTag"),
                "remoteCodeAllowed": False, "weightsDownloaded": False,
            })
        plans.append({
            "releaseId": release_id, "priority": release["priority"], "primaryRepoId": primary,
            "targetRepos": sorted(targets), "artifacts": rows,
            "state": "EVALUATION_PREPARATION_ONLY", "productionDisposition": "HOLD",
            "executionAuthorized": False, "hardwareAllocated": False,
            "servingCompatibility": "UNMEASURED", "benchmarkResults": None,
            "requiredMeasurements": REQUIRED_MEASUREMENTS,
            "unresolved": ["license_text_and_use_review", "evaluation_fixture_manifest", "engine_and_hardware_preflight", "model_execution", "quality_and_fallback_acceptance", "sealed_production_authorization"],
        })
    body = {
        "schema": "szl.frontier.pinned-wave-evaluation-plan.v1", "wave": wave["wave"],
        "waveSha256": digest(wave), "pinReceiptSha256": pin_digest,
        "alignmentOrder": ORDER, "releaseCount": len(plans), "artifactCount": sum(len(r["artifacts"]) for r in plans),
        "productionPromotionCount": 0, "networkAccess": False,
        "receiptAuthority": "LOCAL_CONTENT_INTEGRITY_NOT_SIGNATURE_OR_AUTHORIZATION", "plans": plans,
    }
    return {**body, "planSha256": digest(body)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wave", type=Path, required=True)
    parser.add_argument("--pins", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        plan = compile_plan(load(args.wave), load(args.pins))
        text = json.dumps(plan, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            # Never replace an existing evidence record or follow a destination symlink.
            with args.output.open("x", encoding="utf-8") as handle:
                handle.write(text)
        else:
            sys.stdout.write(text)
    except (WavePlanError, OSError) as exc:
        code = str(exc) if isinstance(exc, WavePlanError) else type(exc).__name__
        print(json.dumps({"state": "INCOMPLETE", "error": code, "productionDisposition": "HOLD"}), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
