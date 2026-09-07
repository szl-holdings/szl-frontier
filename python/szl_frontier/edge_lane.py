"""MiniCPM5 edge-agent intake, content-aware watch, and inert tool qualification.

Copyright 2026 SZL Holdings. SPDX-License-Identifier: Apache-2.0

No weights are downloaded, tools executed, or production routes changed here.
Upstream repository text is data, never an instruction to this control plane.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Mapping
from urllib.parse import quote, urlparse
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

SOURCE_REPOSITORY = "szl-holdings/szl-frontier"
MODEL_ID = "openbmb/MiniCPM5-2B"
MODEL_REVISION = "3497c460c89e00520c3cfa2e73f49ab7647f1177"
MAX_BYTES = 8 * 1024 * 1024
ARTIFACTS = (
    ("model", MODEL_ID, MODEL_REVISION, "compact-agent-model", ("szl-nemo", "szl-serve", "szl-forge"),
     "Qualify a local proposal-only agent against the admitted baseline; do not replace the frontier reasoning tier."),
    ("dataset", "openbmb/UltraData-SFT-Agent-2609", "f684cc1a9f3e19f6f4929102cd9b06cc0b895b8a",
     "agent-post-training-data", ("szl-forge", "szl-nemo"),
     "Evaluate bounded tool-use trajectories for post-training only after rights and contamination review."),
    ("dataset", "openbmb/UltraData-RL-2609", "e6ecfa733708a4c54b5a98c3ca0fd16fc6923790",
     "verifiable-reward-data", ("szl-forge", "szl-nemo"),
     "Audit verifiable reward tasks; code cases remain inert until a separately admitted sandbox executes them."),
)


class EdgeError(ValueError):
    """Invalid, incomplete, or untrusted evidence; fail closed."""


def _object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise EdgeError("duplicate JSON object key")
        result[key] = value
    return result


def _nonfinite(value: str) -> None:
    raise EdgeError("non-finite JSON number")


def strict_json(text: str | bytes) -> Any:
    """Reject ambiguous objects and JavaScript-style non-finite constants."""
    try:
        return json.loads(text, object_pairs_hook=_object, parse_constant=_nonfinite)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise EdgeError("invalid JSON evidence") from exc


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                    ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def source_url(kind: str, repo_id: str) -> str:
    return "https://huggingface.co/" + ("datasets/" if kind == "dataset" else "") + repo_id


def release_id(repo_id: str) -> str:
    return repo_id.replace("/", "-").lower() + "-2026-09-07"


def edge_admissions() -> tuple[dict[str, Any], ...]:
    """Use the existing catalog schema and policy without granting execution."""
    rows = []
    for kind, repo, revision, category, owners, reason in ARTIFACTS:
        rid = release_id(repo)
        def gate(suffix: str, title: str, scope: str, state: str, evidence: str) -> dict[str, str]:
            return dict(id=rid + "-" + suffix, title=title, scope=scope, state=state, evidence=evidence)
        rows.append({
            "id": rid, "title": repo.split("/")[1], "publisher": "OpenBMB",
            "releasedAt": "2026-09-07", "category": category,
            "primarySource": source_url(kind, repo), "artifactSource": source_url(kind, repo),
            "targetOrgans": list(owners), "whyItMatters": reason,
            "operationalTarget": "Run the bounded edge-lane plan; publish measured evidence, not upstream benchmark claims.",
            "maturity": "released", "license": "Apache-2.0 declared upstream; downstream source obligations require review",
            "licensePosture": "review-required", "resourceClass": "bounded local evaluation",
            "posture": "EVALUATE_NOW",
            "signals": {"impact": 23, "estateFit": 24, "evidenceQuality": 23, "integrationReadiness": 20, "riskPenalty": 7},
            "sourceClaims": ["Primary model/dataset card and immutable repository revision observed on 2026-09-07.",
                             "Capabilities and quality are upstream claims until independently reproduced."],
            "gates": [
                gate("source", "Immutable primary source recorded", "evaluation", "pass", source_url(kind, repo) + "/tree/" + revision),
                gate("measured", "Pinned evaluation completed", "evaluation", "pending", "No live SZL model or training run has been performed by this intake."),
                gate("rights", "Model and constituent data rights admitted", "production", "hold", "Record license and constituent-source review separately; metadata is not rights clearance."),
                gate("quality", "Quality, latency and tool reliability reproduced", "production", "pending", "Require a pinned held-out suite, baseline comparison, runtime/image identity and measured results."),
                gate("fallback", "Rollback and abstention verified", "production", "pending", "Unknown inputs fail closed; no new production default or autonomous tool authority."),
            ],
            # Deliberately no legacy baselineFingerprint. The legacy engine then
            # abstains from revision-only alerts. scan() owns content comparison.
            "watch": {"kind": kind, "repoId": repo, "baselineRevision": revision},
        })
    return tuple(rows)


def build_plan() -> dict[str, Any]:
    """Deterministic projection consumed by GitHub, the HF publisher, and Codex."""
    return {
        "schema": "szl.frontier.edge-lane-plan.v1", "sourceRepository": SOURCE_REPOSITORY,
        "authorityChain": ["GitHub", "Hugging Face", "a-11-oy.com", "a11oy.net"],
        "priority": "P1", "status": "EVALUATION", "productionDisposition": "HOLD",
        "productionPromotion": False, "runtimeVerified": False, "trainingAuthorized": False,
        "weightsRehosted": False, "benchmarks": None,
        "artifacts": [{"kind": kind, "repoId": repo, "revision": rev, "primarySource": source_url(kind, repo),
                       "owners": list(owners), "reason": reason} for kind, repo, rev, _, owners, reason in ARTIFACTS],
        "serving": {"modelId": MODEL_ID, "revision": MODEL_REVISION, "mode": "proposal-only",
                    "preferredToolBackend": "sglang", "toolCallParser": "minicpm5",
                    "upstreamMinimumSglang": "0.5.16", "qualifiedRuntimeImageDigest": None,
                    "trustRemoteCode": False, "initialContextTokens": 4096,
                    "claimedNativeContextTokens": 131072, "maxNewTokens": 256,
                    "launchAuthorized": False, "reason": "Pin and qualify the runtime image before launching; native context is not a tested memory budget."},
        "data": {"automaticIngestion": False, "maxPilotRowsPerDataset": 256,
                 "rightsReview": "pending", "decontamination": "pending", "executeEmbeddedCode": False,
                 "retainFailureTraceLabels": True, "privateMemoryInGradients": False},
        "qualification": ["tool argument schema and duplicate-key rejection", "held-out task success versus baseline",
                          "p50/p95 latency and peak memory on named hardware", "malformed-output abstention",
                          "long-context quality at 4K, then 16K and 32K only when budget-qualified",
                          "fallback and rollback witness", "license and provenance evidence"],
        "nextExperiments": [{"name": "GGUF local-device comparison", "status": "HOLD", "reason": "Separate checkpoint pin and device evidence required."},
                            {"name": "DSpark speculative decoding", "status": "HOLD", "reason": "No remote-code authorization; qualify draft/target pins, implementation, output parity and performance separately."}],
        "publication": {"hfSpace": "SZLHOLDINGS/szl-frontier", "hfDataset": "SZLHOLDINGS/szl-frontier-covenant",
                        "source": "existing protected-main publisher only", "productClaim": "not operational",
                        "proofClaim": "evaluation plan, not a sealed performance receipt"},
    }


def _cosmetic(path: str) -> bool:
    name = PurePosixPath(path).name.lower()
    return (name.startswith("readme") and name.endswith(".md")) or path in {".gitattributes", ".gitignore"} or path.startswith("docs/") or (path.startswith("assets/") and PurePosixPath(path).suffix.lower() in {".png", ".jpg", ".jpeg", ".svg", ".webp"})


def material_identity(payload: Mapping[str, Any], repo_id: str) -> str:
    """Hash substantive files plus license/config semantics, not revision or likes.

    Requires blobs=true metadata so same-name, same-size weight/data changes
    cannot disappear. Missing object identities are unknown, not a clean scan.
    README prose is excluded, but relevant parsed card configuration is retained.
    """
    if payload.get("id", payload.get("modelId")) != repo_id:
        raise EdgeError("upstream repository identity mismatch")
    if not re.fullmatch(r"[0-9a-f]{40}", str(payload.get("sha", ""))):
        raise EdgeError("upstream revision is not immutable")
    siblings = payload.get("siblings")
    if not isinstance(siblings, list) or not siblings:
        raise EdgeError("missing artifact inventory")
    rows, names = [], set()
    for item in siblings:
        if not isinstance(item, dict):
            raise EdgeError("invalid inventory entry")
        name = item.get("rfilename")
        if not isinstance(name, str) or not name or name.startswith("/") or "\\" in name or any(p in {"", ".", ".."} for p in name.split("/")):
            raise EdgeError("invalid artifact path")
        if name in names:
            raise EdgeError("duplicate artifact path")
        names.add(name)
        if _cosmetic(name):
            continue
        lfs = item.get("lfs") or {}
        if not isinstance(lfs, dict):
            raise EdgeError("invalid large-file identity")
        oid = lfs.get("sha256") or lfs.get("oid") or item.get("blobId")
        if isinstance(oid, str) and oid.startswith("sha256:"):
            oid = oid[7:]
        size = item.get("size", lfs.get("size"))
        if not isinstance(oid, str) or not re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})", oid):
            raise EdgeError("missing substantive blob identity; request blobs=true")
        if type(size) is not int or size < 0:
            raise EdgeError("missing substantive file size")
        rows.append({"name": name, "oid": oid, "size": size})
    if not rows:
        raise EdgeError("no substantive artifacts")
    card = payload.get("cardData")
    if not isinstance(card, dict) or not card.get("license"):
        raise EdgeError("missing license metadata")
    semantics = {key: card.get(key) for key in ("license", "license_name", "license_link", "base_model", "configs", "data_files", "default_config_name")}
    return digest({"schema": "szl.frontier.artifact-identity.v1", "repoId": repo_id,
                   "files": sorted(rows, key=lambda row: row["name"]), "card": semantics,
                   "pipelineTag": payload.get("pipeline_tag"), "libraryName": payload.get("library_name"),
                   "private": payload.get("private", False), "gated": payload.get("gated", False),
                   "disabled": payload.get("disabled", False)})


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        raise EdgeError("metadata redirect refused")


def fetch_metadata(kind: str, repo_id: str, revision: str) -> Mapping[str, Any]:
    """Six bounded unauthenticated GETs at most per complete scan; no downloads."""
    if (kind, repo_id) not in {(a[0], a[1]) for a in ARTIFACTS}:
        raise EdgeError("source is outside the admitted edge lane")
    if revision != "main" and not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise EdgeError("revision must be main or a full commit SHA")
    plural = "models" if kind == "model" else "datasets"
    path = "/".join(quote(p, safe="") for p in repo_id.split("/"))
    url = f"https://huggingface.co/api/{plural}/{path}/revision/{revision}?blobs=true"
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "SZL-Edge-Intake/1"})
    opener = build_opener(ProxyHandler({}), _NoRedirect())
    with opener.open(request, timeout=20) as response:
        if response.status != 200 or response.geturl() != url or urlparse(response.geturl()).netloc != "huggingface.co":
            raise EdgeError("unexpected metadata response")
        if response.headers.get("Link"):
            raise EdgeError("paginated metadata requires explicit complete inventory")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise EdgeError("metadata response exceeded byte budget")
    payload = strict_json(raw)
    if not isinstance(payload, dict):
        raise EdgeError("metadata root must be an object")
    if revision != "main" and payload.get("sha") != revision:
        raise EdgeError("pinned revision was not returned")
    return payload


def scan(fetch: Callable[[str, str, str], Mapping[str, Any]] | None = None) -> dict[str, Any]:
    """Compare live inventories to pinned revisions; incomplete evidence is visible."""
    live = fetch is None
    fetch = fetch or fetch_metadata
    now = datetime.now(timezone.utc).isoformat()
    result: dict[str, Any] = {"schema": "szl.frontier.watch-output.v1", "live": live,
        "evaluatedThrough": now, "catalogEvaluatedAt": "2026-09-07T00:00:00Z",
        "sourceCount": len(ARTIFACTS), "successfulSources": 0, "sourceResults": [],
        "errors": [], "materialCandidates": [], "productionPromotion": False}
    for kind, repo, revision, _, _, reason in ARTIFACTS:
        try:
            baseline, current = fetch(kind, repo, revision), fetch(kind, repo, "main")
            if baseline.get("sha") != revision:
                raise EdgeError("baseline revision mismatch")
            before, after = material_identity(baseline, repo), material_identity(current, repo)
            changed = before != after
            result["sourceResults"].append({"status": "ok", "repoId": repo, "baselineRevision": revision,
                "observedRevision": current["sha"], "baselineFingerprint": before,
                "artifactFingerprint": after, "materialChange": changed})
            result["successfulSources"] += 1
            if changed:
                result["materialCandidates"].append({"id": release_id(repo), "title": "P1: " + repo.split("/")[1],
                    "primarySource": source_url(kind, repo), "material": True, "materialityScore": 83,
                    "productionDisposition": "HOLD", "priority": "P1",
                    "fingerprint": digest({"repoId": repo, "identity": after}),
                    "reasons": ["Substantive artifact or license/config identity differs from the reviewed pin.", reason,
                                "Evaluate only; no weight download, training, tool execution, or production promotion."]})
        except Exception as exc:  # One inaccessible source must not conceal the other outcomes.
            # Avoid copying arbitrary upstream response text into public evidence.
            result["errors"].append({"repoId": repo, "errorType": type(exc).__name__, "message": "primary-source comparison incomplete"})
            result["sourceResults"].append({"status": "error", "repoId": repo})
    return result


def check_tool_response(payload: Any, evidence_id: str) -> dict[str, Any]:
    """Validate one inert lookup proposal; never invoke the proposed function."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", evidence_id):
        raise EdgeError("invalid expected evidence id")
    if not isinstance(payload, dict) or payload.get("model") != MODEL_ID:
        raise EdgeError("response model mismatch")
    choices = payload.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        raise EdgeError("one response choice required")
    choice = choices[0]
    if type(choice.get("index")) is not int or choice.get("index") != 0 or choice.get("finish_reason") != "tool_calls":
        raise EdgeError("complete tool-call response required")
    message = choice.get("message")
    if not isinstance(message, dict) or message.get("role") != "assistant":
        raise EdgeError("assistant message required")
    calls = message.get("tool_calls")
    if not isinstance(calls, list) or len(calls) != 1 or not isinstance(calls[0], dict):
        raise EdgeError("exactly one inert proposal required")
    call = calls[0]
    function = call.get("function")
    if call.get("type") != "function" or not isinstance(call.get("id"), str) or not call["id"].strip() or not isinstance(function, dict) or function.get("name") != "lookup_evidence":
        raise EdgeError("unexpected function proposal")
    arguments = function.get("arguments")
    if not isinstance(arguments, str) or len(arguments.encode()) > 4096:
        raise EdgeError("bounded JSON argument string required")
    if strict_json(arguments) != {"evidence_id": evidence_id}:
        raise EdgeError("tool arguments differ from expected schema/value")
    report = {"schema": "szl.frontier.edge-output-contract.v1", "contractPassed": True,
              "modelId": MODEL_ID, "responseSha256": digest(payload), "runtimeVerified": False,
              "evidenceClass": "operator-supplied-output-contract", "sealed": False,
              "toolExecuted": False, "productionDisposition": "HOLD"}
    report["recordSha256"] = digest(report)
    return report


def _emit(payload: Any, output: str | None) -> None:
    text = json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    if output:
        path = Path(output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    else:
        print(text, end="")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("plan", "watch", "check-tool"):
        child = sub.add_parser(name)
        child.add_argument("--output")
        if name == "watch":
            child.add_argument("--require-complete", action="store_true")
        if name == "check-tool":
            child.add_argument("--response", required=True)
            child.add_argument("--evidence-id", required=True)
    args = parser.parse_args()
    try:
        if args.command == "plan":
            _emit(build_plan(), args.output)
        elif args.command == "watch":
            report = scan()
            _emit(report, args.output)
            if args.require_complete and report["errors"]:
                return 1
        else:
            with Path(args.response).open("rb") as stream:
                raw = stream.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise EdgeError("response evidence exceeded byte budget")
            _emit(check_tool_response(strict_json(raw), args.evidence_id), args.output)
    except (EdgeError, OSError, TypeError, ValueError) as exc:
        if args.command == "check-tool" and args.output:
            _emit({"schema": "szl.frontier.edge-output-contract.v1", "contractPassed": False,
                   "runtimeVerified": False, "sealed": False, "toolExecuted": False,
                   "productionDisposition": "HOLD", "errorType": type(exc).__name__}, args.output)
        parser.exit(1, f"edge lane blocked: {type(exc).__name__}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
