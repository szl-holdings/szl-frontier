#!/usr/bin/env python3
"""SZL Frontier 3: read-only observations, sealed evidence, offline exploration.

Python 3.11+, standard library only. Run --help for live audit, verify, diff,
plan, and local dashboard commands. Embedded text is never executed as a mission.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import hashlib
import http.server
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.parse
from collections import Counter
from typing import Any, Mapping

VERSION = "3.1.1"
SCHEMA = "szl.estate.manifest.v3"
ROOT = pathlib.Path(__file__).resolve().parent
BOUNDARY = ("This is a read-only, point-in-time metadata observation. Source, CI, "
            "provider state, HTTP reachability, application readiness, training quality, "
            "publication eligibility and authorization are separate. Hashes detect changes "
            "against a retained digest; these receipts are unsigned and do not prove truth or identity.")
INVENTORY_FILES = ("preflight.json", "github_inventory.json", "huggingface_inventory.json",
                   "local_inventory.json", "findings.json", "estate_manifest.json",
                   "estate_manifest.sha256")
PLAN_FILES = ("migration_plan.json", "blocked_items.json", "FINAL_AUDIT.md", "dashboard.html")
SEAL_EXCLUDED = {"bundle_manifest.json", "bundle_manifest.sha256", "verification.json", ".audit.lock"}


class EvidenceError(RuntimeError):
    pass


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def file_hash(path: pathlib.Path) -> str:
    return sha256(path.read_bytes())


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_bytes(canonical_bytes(value) + b"\n")
    os.replace(temp, path)


def read_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_keys)


def unique_keys(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise EvidenceError("Duplicate JSON key")
        out[key] = value
    return out


def safe_path(root: pathlib.Path, name: str) -> pathlib.Path:
    if not isinstance(name, str) or not name or "\\" in name or ":" in name:
        raise EvidenceError("Invalid bundle path")
    part = pathlib.PurePosixPath(name)
    if part.is_absolute() or any(x in ("..", ".") for x in name.split("/")):
        raise EvidenceError("Bundle path escapes snapshot")
    target = root.joinpath(*part.parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise EvidenceError("Bundle path escapes snapshot")
    current = target
    while current != root:
        if current.is_symlink() or (hasattr(current, "is_junction") and current.is_junction()):
            raise EvidenceError("Links are not permitted in an evidence bundle")
        current = current.parent
    return target


def hash_files(root: pathlib.Path, names) -> dict[str, str]:
    return {name: file_hash(safe_path(root, name)) for name in sorted(names)}


def receipt_errors(root: pathlib.Path) -> tuple[list[str], int, str]:
    errors, previous, count = [], "", 0
    path = root / "migration_receipts.jsonl"
    if not path.is_file():
        return ["Missing receipt chain"], 0, ""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
        if not lines or any(not line.strip() for line in lines):
            return ["Empty or blank receipt chain"], 0, ""
        for number, line in enumerate(lines, 1):
            entry = json.loads(line, object_pairs_hook=unique_keys)
            claimed = entry.pop("receipt_sha256")
            if entry.get("schema") != "szl.migration.receipt.v2":
                errors.append(f"Receipt {number}: schema mismatch")
            if claimed != sha256(canonical_bytes(entry)):
                errors.append(f"Receipt {number}: content hash mismatch")
            if entry.get("previous_receipt_sha256") != previous or entry.get("sequence") != number:
                errors.append(f"Receipt {number}: chain mismatch")
            if entry.get("remote_mutation") is not False or entry.get("signed") is not False:
                errors.append(f"Receipt {number}: invalid authority claim")
            for kind in ("inputs", "outputs"):
                refs = entry.get(kind)
                if not isinstance(refs, dict):
                    raise EvidenceError("Receipt artifact bindings must be objects")
                for name, expected in refs.items():
                    target = safe_path(root, name)
                    if not target.is_file() or file_hash(target) != expected:
                        errors.append(f"Receipt {number}: {kind} binding mismatch for {name}")
            previous, count = claimed, number
    except (OSError, ValueError, KeyError, TypeError, AttributeError, EvidenceError) as exc:
        errors.append(f"Malformed receipt chain: {type(exc).__name__}")
    return errors, count, previous


def append_receipt(root: pathlib.Path, action: str, inputs: Mapping[str, str],
                   outputs: Mapping[str, str], result: str) -> dict:
    path = root / "migration_receipts.jsonl"
    errors, count, previous = receipt_errors(root) if path.exists() else ([], 0, "")
    if errors:
        raise EvidenceError("Refusing to extend invalid receipt chain: " + "; ".join(errors))
    entry = {"schema": "szl.migration.receipt.v2", "sequence": count + 1,
             "timestamp": utc_now(), "tool_version": VERSION, "action": action,
             "inputs": dict(inputs), "outputs": dict(outputs), "result": result,
             "previous_receipt_sha256": previous, "remote_mutation": False, "signed": False}
    entry["receipt_sha256"] = sha256(canonical_bytes(entry))
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(canonical_bytes(entry).decode("utf-8") + "\n")
    return entry


def bundle_files(root: pathlib.Path) -> dict[str, str]:
    files = {}
    for path in sorted(root.rglob("*")):
        name = path.relative_to(root).as_posix()
        safe_path(root, name)
        if path.is_file() and name not in SEAL_EXCLUDED:
            files[name] = file_hash(path)
    return files


def seal_bundle(root: pathlib.Path, stage: str = "all") -> dict:
    errors, count, head = receipt_errors(root)
    if errors:
        raise EvidenceError("Cannot seal invalid receipts: " + "; ".join(errors))
    files = bundle_files(root)
    seal = {"schema": "szl.evidence.bundle.v1", "stage": stage, "created_at": utc_now(),
            "files": files, "receipt_count": count, "receipt_head_sha256": head,
            "signed": False, "claim_boundary": BOUNDARY}
    write_json(root / "bundle_manifest.json", seal)
    root_hash = file_hash(root / "bundle_manifest.json")
    (root / "bundle_manifest.sha256").write_text(root_hash + "  bundle_manifest.json\n", encoding="utf-8")
    return {"bundle_sha256": root_hash, "file_count": len(files), "receipt_count": count}


def read_checksum(path: pathlib.Path, expected_name: str) -> str:
    value = path.read_text(encoding="utf-8").strip()
    match = re.fullmatch(r"([0-9a-f]{64})  " + re.escape(expected_name), value)
    if not match:
        raise EvidenceError(f"Malformed checksum: {path.name}")
    return match.group(1)


def verify_bundle(root: pathlib.Path, expected_bundle_sha256: str | None = None) -> dict:
    root = pathlib.Path(root).resolve()
    errors, root_hash, seal = [], None, {}
    try:
        if not root.is_dir():
            raise EvidenceError("Snapshot directory does not exist")
        for name in ("bundle_manifest.json", "bundle_manifest.sha256"):
            safe_path(root, name)
        root_hash = file_hash(root / "bundle_manifest.json")
        if root_hash != read_checksum(root / "bundle_manifest.sha256", "bundle_manifest.json"):
            errors.append("Bundle manifest checksum mismatch")
        if expected_bundle_sha256 is not None and root_hash != expected_bundle_sha256.lower():
            errors.append("Retained external bundle digest mismatch")
        seal = read_json(root / "bundle_manifest.json")
        if not isinstance(seal, dict):
            seal = {}
            raise EvidenceError("Bundle manifest must be an object")
        if seal.get("schema") != "szl.evidence.bundle.v1" or seal.get("stage") not in {"inventory", "all"}:
            raise EvidenceError("Unsupported bundle schema or stage")
        if seal.get("signed") is not False:
            errors.append("Invalid bundle signature claim")
        files = seal.get("files")
        if not isinstance(files, dict):
            raise EvidenceError("Invalid bundle file map")
        required = set(INVENTORY_FILES) | {"migration_receipts.jsonl"}
        if seal["stage"] == "all":
            required.update(PLAN_FILES)
        errors.extend("Required artifact not sealed: " + name for name in sorted(required - files.keys()))
        actual_files = bundle_files(root)
        for name, expected in files.items():
            safe_path(root, name)
            if not re.fullmatch("[0-9a-f]{64}", str(expected)) or actual_files.get(name) != expected:
                errors.append("Artifact hash mismatch or missing: " + name)
        errors.extend("Unexpected unsealed artifact: " + name for name in sorted(actual_files.keys() - files.keys()))
        if file_hash(root / "estate_manifest.json") != read_checksum(root / "estate_manifest.sha256", "estate_manifest.json"):
            errors.append("Estate manifest checksum mismatch")
        manifest = read_json(root / "estate_manifest.json")
        if manifest.get("schema") != SCHEMA:
            errors.append("Unsupported estate manifest schema")
        for key, filename in (("github", "github_inventory.json"), ("huggingface", "huggingface_inventory.json"), ("local", "local_inventory.json")):
            if manifest.get(key) != read_json(root / filename):
                errors.append("Inventory projection mismatch: " + key)
        receipt_problems, count, head = receipt_errors(root)
        errors.extend(receipt_problems)
        if count != seal.get("receipt_count") or head != seal.get("receipt_head_sha256"):
            errors.append("Receipt count/head does not match bundle")
    except (OSError, ValueError, KeyError, TypeError, AttributeError, EvidenceError) as exc:
        errors.append(f"Invalid evidence bundle: {type(exc).__name__}: {str(exc)[:160]}")
    return {"schema": "szl.verification.v2", "verified_at": utc_now(), "passed": not errors,
            "errors": errors, "bundle_sha256": root_hash, "file_count": len(seal.get("files", {})) if isinstance(seal.get("files"), dict) else 0,
            "external_anchor_checked": expected_bundle_sha256 is not None, "signed": False,
            "claim_scope": "BYTE_INTEGRITY_AND_RECEIPT_BINDINGS_ONLY", "remote_mutation": False}


def manifest_status(observed: dict) -> str:
    if observed.get("errors") or any(r.get("tree_truncated") or r.get("audit_state") == "PARTIAL" for r in observed.get("github", [])):
        return "PARTIAL"
    if observed.get("local", {}).get("state") in {"PARTIAL", "UNAVAILABLE"}:
        return "PARTIAL"
    def incomplete(value):
        if isinstance(value, dict):
            return any(value.get(k) is False for k in ("complete", "inventory_complete", "enumeration_complete", "details_complete")) or value.get("state") in {"PARTIAL", "UNAVAILABLE", "ERROR", "LIMITED"} or any(incomplete(v) for v in value.values())
        if isinstance(value, list):
            return any(incomplete(v) for v in value)
        return False
    return "PARTIAL" if incomplete(observed.get("coverage", {})) else "OBSERVED"


def derive_findings(observed: dict) -> list[dict]:
    findings = []
    def add(platform, asset, severity, code, **kwargs):
        findings.append({"platform": platform, "asset": asset, "severity": severity, "code": code, **kwargs})
    for repo in observed.get("github", []):
        asset = f"{repo.get('owner')}/{repo.get('name')}"
        if repo.get("tree_truncated") or repo.get("audit_state") == "PARTIAL":
            add("github", asset, "BLOCKED", "incomplete-source-observation", claim_scope="COVERAGE")
        if not repo.get("license") or repo.get("license") == "NOASSERTION":
            add("github", asset, "MEDIUM", "license-unverified", claim_scope="API_METADATA_ONLY")
        for item in repo.get("path_findings", []):
            for tag in item.get("tags", []):
                if tag in {"secret-risk-path", "secret-candidate", "virtualenv", "cache", "backup", "oversized-50mb", "checkpoint", "compiled"}:
                    add("github", asset, "REVIEW" if "secret" in tag else "MEDIUM", tag,
                        path=item.get("path"), evidence={"sha": item.get("sha"), "size": item.get("size")}, claim_scope="PATH_HINT_ONLY_NOT_CONFIRMED_CONTENT")
        ci = repo.get("ci") or {}
        failed = [x for key in ("check_runs", "workflow_runs") for x in (ci.get(key) or [])
                  if x.get("conclusion") in {"failure", "timed_out", "action_required", "startup_failure"}]
        if failed:
            add("github", asset, "HIGH", "observed-ci-failure", evidence={"runs": failed}, claim_scope="OBSERVED_COMMIT_CHECKS_NOT_RELEASE_GATE")
    for kind, assets in observed.get("huggingface", {}).items():
        for asset in assets:
            identifier = str(asset.get("id"))
            if not asset.get("license"):
                add("huggingface", identifier, "MEDIUM", "license-unverified", kind=kind, claim_scope="API_METADATA_ONLY")
            stage = str(asset.get("provider_stage") or (asset.get("provider_runtime") or {}).get("stage") or (asset.get("runtime") or {}).get("stage") or "UNKNOWN")
            if any(s in stage for s in ("ERROR", "PAUSED", "STOPPED", "SLEEPING")):
                add("huggingface", identifier, "REVIEW", "provider-runtime-attention", kind=kind, evidence={"stage": stage}, claim_scope="PROVIDER_DECLARED_NOT_APPLICATION_PROOF")
    for error in observed.get("errors", []):
        add("inventory", error.get("scope", "unknown"), "BLOCKED", "inventory-error", evidence=error, claim_scope="COVERAGE")
    return sorted(findings, key=lambda x: (x["platform"], str(x["asset"]), x["code"], str(x.get("path", ""))))


def build_plan(manifest: dict, findings: list) -> dict:
    ranked = []
    for repo in manifest.get("github", []):
        asset = f"{repo.get('owner')}/{repo.get('name')}"
        matching = [f for f in findings if f["asset"] == asset and f["severity"] in {"HIGH", "BLOCKED"}]
        score = 30 if "frontend" in str(repo.get("archetype")) else 10
        if repo.get("archived") or repo.get("disabled"):
            score = -100
        score -= 20 * bool(matching)
        ranked.append({"asset": asset, "platform": "github", "archetype": repo.get("archetype"),
                       "revision": repo.get("revision"), "priority": score,
                       "reasons": ["Verification priority only; metadata does not establish migration eligibility."],
                       "eligible_for_pilot": False, "blockers": matching,
                       "verification_tasks": ["Confirm canonical ownership and current source", "Inspect repository instructions and protection", "Run native baseline build and tests", "Verify changed application contracts and runtime", "Capture accessibility/performance baseline for UI changes"],
                       "mutation_authorized_by_this_plan": False})
    ranked.sort(key=lambda x: (-x["priority"], x["asset"]))
    return {"schema": "szl.migration.plan.v2", "generated_at": manifest["generated_at"],
            "source_snapshot_canonical_sha256": sha256(canonical_bytes(manifest)), "github_ranked": ranked,
            "huggingface_tasks": [{"asset": a.get("id"), "kind": kind, "revision": a.get("sha"),
                                    "tasks": ["Verify license and lineage", "Validate artifact content", "Evaluate on a declared benchmark", "Bind source and publication receipt", "Witness application runtime"]}
                                   for kind, assets in manifest.get("huggingface", {}).items() for a in assets],
            "pilot_candidate": None, "next_verification_candidate": ranked[0]["asset"] if ranked else None,
            "remote_mutation_authorized": False}


def create_scorecards(root: pathlib.Path, manifest: dict) -> None:
    dimensions = ("security", "accessibility", "performance", "test_coverage", "provenance", "runtime", "publication")
    def save(platform, kind, identity, revision):
        key = re.sub(r"[^A-Za-z0-9._-]", "_", identity)[:100] + "_" + sha256(identity.encode())[:12]
        card = {"schema": "szl.scorecard.v2", "platform": platform, "kind": kind, "asset": identity,
                "revision": revision, "scores": {d: {"score": None, "state": "UNVERIFIED", "evidence": []} for d in dimensions}}
        write_json(root / ("repository_scorecards" if platform == "github" else "huggingface_scorecards") / kind / (key + ".json"), card)
    for repo in manifest.get("github", []):
        save("github", "repositories", f"{repo.get('owner')}/{repo.get('name')}", repo.get("revision"))
    for kind, assets in manifest.get("huggingface", {}).items():
        for asset in assets:
            save("huggingface", kind, str(asset.get("id")), asset.get("sha"))


def audit_markdown(manifest: dict, findings: list, plan: dict) -> str:
    hf = manifest["huggingface"]
    counts = Counter(f["severity"] for f in findings)
    lines = ["# SZL Frontier live observation", "", f"Observed: {manifest['generated_at']}", "",
             f"**Inventory status: {manifest['status']}**. Mode: READ_ONLY.", "",
             f"GitHub repositories: {len(manifest['github'])}. " + ", ".join(f"HF {kind}: {len(assets)}" for kind, assets in hf.items()) + ".", "",
             BOUNDARY, "", "## Evidence status", "", "| Layer | Result |", "|---|---|",
             "| Metadata inventory | " + manifest["status"] + " |",
             "| Source revision | Recorded per asset where provider access succeeded |",
             "| CI | Observed checks at recorded commit; not a complete protected release gate |",
             "| Provider runtime | Provider report only, where available |",
             "| Application readiness / model quality | UNVERIFIED |",
             "| Publication, merge, deployment | Not performed by this auditor |", "",
             "## Findings", "", ", ".join(f"{key}: {value}" for key, value in sorted(counts.items())) or "No configured metadata findings observed.", "",
             "Full records: findings.json. Path hints require content inspection; they are not confirmed secrets or vulnerabilities.", "",
             "## Coverage", "", "```json", json.dumps(manifest.get("coverage", {}), indent=2), "```", "",
             "## Collection gaps", ""]
    lines.extend(f"- {e.get('scope', 'unknown')}: {e.get('code', e.get('error', 'error'))} — {e.get('detail', e.get('message', ''))}" for e in manifest.get("errors", []))
    if not manifest.get("errors"):
        lines.append("No API collection errors recorded. Coverage is limited to the declared endpoints and credential visibility.")
    lines.extend(["", "## Next verification", "", str(plan.get("next_verification_candidate") or "No candidate observed"), "",
                  "All pilot eligibility remains unverified until repository-native baseline checks and canonical ownership are established.", "",
                  "Open dashboard.html to search the snapshot offline. Run the CLI verify command to check every sealed artifact and receipt.", ""])
    return "\n".join(lines)


def write_plan(root: pathlib.Path, manifest: dict, findings: list) -> dict:
    from frontier_dashboard import render_dashboard
    plan = build_plan(manifest, findings)
    write_json(root / "migration_plan.json", plan)
    write_json(root / "blocked_items.json", [f for f in findings if f["severity"] in {"HIGH", "BLOCKED"}])
    create_scorecards(root, manifest)
    (root / "FINAL_AUDIT.md").write_text(audit_markdown(manifest, findings, plan), encoding="utf-8")
    (root / "dashboard.html").write_text(render_dashboard(manifest, plan, findings), encoding="utf-8")
    names = list(PLAN_FILES) + [p.relative_to(root).as_posix() for folder in ("repository_scorecards", "huggingface_scorecards") for p in (root / folder).rglob("*.json")]
    append_receipt(root, "estate.plan", hash_files(root, ["estate_manifest.json", "findings.json"]), hash_files(root, names), "VERIFICATION_PLAN")
    return plan


def build_snapshot(root: pathlib.Path, observed: dict, preflight: dict, stage: str = "all") -> dict:
    root = pathlib.Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    if any(p.name != ".audit.lock" for p in root.iterdir()):
        raise EvidenceError("Snapshot directory must be empty; choose a new output directory")
    observed.setdefault("local", {"state": "NOT_REQUESTED", "repositories": []})
    manifest = {"schema": SCHEMA, "generated_at": utc_now(), "tool_version": VERSION,
                "collection_started_at": preflight.get("observed_at"),
                "evidence_class": "MEASURED", "evidence_scope": "Local collection and artifact construction only; provider claims remain separately classified",
                "mode": "READ_ONLY", "github_org": preflight.get("github_org", "szl-holdings"),
                "huggingface_org": preflight.get("huggingface_org", "SZLHOLDINGS"), **observed,
                "status": manifest_status(observed), "claim_boundary": BOUNDARY,
                "tool_sources": {p.name: file_hash(p) for p in ROOT.glob("*.py")}}
    findings = derive_findings(manifest)
    for name, value in (("preflight.json", preflight), ("github_inventory.json", manifest["github"]),
                        ("huggingface_inventory.json", manifest["huggingface"]), ("local_inventory.json", manifest["local"]),
                        ("findings.json", findings), ("estate_manifest.json", manifest)):
        write_json(root / name, value)
    (root / "estate_manifest.sha256").write_text(file_hash(root / "estate_manifest.json") + "  estate_manifest.json\n", encoding="utf-8")
    append_receipt(root, "estate.inventory", {}, hash_files(root, INVENTORY_FILES), manifest["status"])
    if stage == "all":
        write_plan(root, manifest, findings)
    seal = seal_bundle(root, stage)
    verification = verify_bundle(root, seal["bundle_sha256"])
    write_json(root / "verification.json", verification)
    if not verification["passed"]:
        raise EvidenceError("Generated bundle failed self-verification")
    return {"status": manifest["status"], "output": str(root), **seal, "verification": verification,
            "counts": {"github": len(manifest["github"]), **{k: len(v) for k, v in manifest["huggingface"].items()}}}


@contextlib.contextmanager
def snapshot_lock(root: pathlib.Path):
    root.mkdir(parents=True, exist_ok=True)
    path = root / ".audit.lock"
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as exc:
        raise EvidenceError("Snapshot is locked; use a fresh output directory") from exc
    try:
        with os.fdopen(descriptor, "w") as handle:
            handle.write(str(os.getpid()))
        yield
    finally:
        path.unlink(missing_ok=True)


def local_inventory(root: pathlib.Path | None) -> dict:
    from frontier_http import redact
    if root is None:
        return {"state": "NOT_REQUESTED", "repositories": []}
    root = root.resolve()
    if not root.is_dir():
        return {"state": "UNAVAILABLE", "repositories": [], "reason": "Local root missing"}
    candidates = [root] if (root / ".git").exists() else sorted(p for p in root.iterdir() if p.is_dir() and (p / ".git").exists())
    records = []
    for repo in candidates:
        record = {"name": repo.name, "path": str(repo), "state": "OBSERVED", "errors": []}
        for key, command in (("head", ["rev-parse", "HEAD"]), ("origin", ["remote", "get-url", "origin"]), ("status", ["status", "--porcelain=v1"])):
            try:
                process = subprocess.run(["git", *command], cwd=repo, capture_output=True, text=True, timeout=20, check=False)
                if process.returncode:
                    raise EvidenceError("Git command failed")
                record[key] = redact(process.stdout.strip())
            except (OSError, subprocess.SubprocessError, EvidenceError):
                record[key] = None
                record["state"] = "PARTIAL"
                record["errors"].append(key + " unavailable")
        status = record.pop("status", None)
        record["dirty"] = bool(status) if status is not None else None
        record["status_lines"] = status.splitlines() if status else []
        records.append(record)
    return {"state": "PARTIAL" if any(r["errors"] for r in records) else "OBSERVED", "repositories": records,
            "scope": "Root repository or immediate child repositories; metadata only"}


def redact_tree(value, secrets):
    from frontier_http import redact
    if isinstance(value, str):
        return redact(value, secrets)
    if isinstance(value, list):
        return [redact_tree(item, secrets) for item in value]
    if isinstance(value, dict):
        return {redact(str(key), secrets): redact_tree(item, secrets) for key, item in value.items()}
    return value


def diff_bundles(before: pathlib.Path, after: pathlib.Path, before_anchor=None, after_anchor=None) -> dict:
    for root, anchor in ((before, before_anchor), (after, after_anchor)):
        result = verify_bundle(root, anchor)
        if not result["passed"]:
            raise EvidenceError("Cannot compare an invalid snapshot: " + str(root))
    old, new = (read_json(root / "estate_manifest.json") for root in (before, after))
    def assets(manifest):
        output = {}
        for record in manifest["github"]:
            owner = record.get("owner") or manifest.get("github_org") or "UNKNOWN"
            value = {k: record.get(k) for k in ("revision", "ci", "audit_state", "archived", "license")}
            if isinstance(value["revision"], dict):
                value["revision"] = {k: v for k, v in value["revision"].items() if k != "observed_at"}
            output[f"github:{owner}/{record['name']}"] = value
        for kind, records in manifest["huggingface"].items():
            for record in records:
                value = {k: record.get(k) for k in ("sha", "artifact_type", "runtime_state", "license")}
                runtime = record.get("provider_runtime")
                stage = runtime.get("stage") if isinstance(runtime, dict) else None
                value["provider_stage"] = stage if stage is not None else record.get("provider_stage")
                output[f"huggingface:{kind}:{record['id']}"] = value
        return output
    left, right = assets(old), assets(new)
    return {"schema": "szl.estate.diff.v1", "before": old["generated_at"], "after": new["generated_at"],
            "newly_observed": sorted(right.keys() - left.keys()), "not_observed_in_new_snapshot": sorted(left.keys() - right.keys()),
            "changed": [{"asset": key, "before": left[key], "after": right[key]} for key in sorted(left.keys() & right.keys()) if left[key] != right[key]],
            "coverage_changed": old.get("coverage") != new.get("coverage"),
            "claim_boundary": "Absence in an observation is not proof of deletion. Provider fields and checks may change independently of source."}


def serve(root: pathlib.Path, port: int, expected_bundle_sha256=None) -> None:
    result = verify_bundle(root, expected_bundle_sha256)
    if not result["passed"] or not (root / "dashboard.html").is_file():
        raise EvidenceError("Refusing to serve invalid or incomplete dashboard bundle")
    allowed = set(read_json(root / "bundle_manifest.json")["files"]) | {"bundle_manifest.json", "bundle_manifest.sha256"}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)
        def do_GET(self):
            name = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).lstrip("/") or "dashboard.html"
            if name not in allowed:
                self.send_error(404)
                return
            self.path = "/" + name
            super().do_GET()
        def do_HEAD(self):
            name = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).lstrip("/") or "dashboard.html"
            if name not in allowed:
                self.send_error(404)
                return
            self.path = "/" + name
            super().do_HEAD()
        def list_directory(self, path):
            self.send_error(404)
            return None
        def end_headers(self):
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            super().end_headers()
        def log_message(self, fmt, *args):
            pass
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler) as server:
        print(json.dumps({"url": f"http://127.0.0.1:{server.server_port}", "scope": "LOCAL_SNAPSHOT_ONLY"}), flush=True)
        server.serve_forever(poll_interval=0.5)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("all", "inventory", "plan", "verify", "diff", "serve", "self-test"))
    parser.add_argument("--output", default="estate-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    parser.add_argument("--github-org", default="szl-holdings")
    parser.add_argument("--hf-org", default="SZLHOLDINGS")
    parser.add_argument("--include-private", action="store_true")
    parser.add_argument("--probe-spaces", action="store_true", help="HEAD probes may wake a sleeping Space; reachability only")
    parser.add_argument("--local-root", type=pathlib.Path)
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 9))
    parser.add_argument("--max-repos", type=int, default=0, help="0 = all visible repos; a limit marks the snapshot partial")
    parser.add_argument("--expected-bundle-sha256")
    parser.add_argument("--baseline-bundle-sha256", help="Retained baseline digest for diff")
    parser.add_argument("--baseline", type=pathlib.Path)
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args(argv)
    for anchor in (args.expected_bundle_sha256, args.baseline_bundle_sha256):
        if anchor is not None and not re.fullmatch(r"[0-9a-fA-F]{64}", anchor):
            parser.error("Bundle anchors must be 64 hexadecimal characters")
    if args.expected_bundle_sha256 and args.command not in {"verify", "plan", "serve", "diff"}:
        parser.error("A retained digest applies only to verify, plan, serve, or diff")
    if args.baseline_bundle_sha256 and args.command != "diff":
        parser.error("A baseline digest applies only to diff")
    if args.max_repos < 0 or not 0 <= args.port <= 65535:
        parser.error("max-repos must be non-negative; port must be 0..65535")
    for name in (args.github_org, args.hf_org):
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}", name):
            parser.error("Invalid organization name")
    return args


def main(argv=None) -> int:
    args = parse_args(argv)
    output = pathlib.Path(args.output).resolve()
    secrets = ()
    try:
        if args.command == "self-test":
            return subprocess.call([sys.executable, "-B", "-m", "unittest", "discover", "-s", str(ROOT / "tests"), "-v"], cwd=ROOT)
        if args.command == "verify":
            result = verify_bundle(output, args.expected_bundle_sha256)
            print(json.dumps(result, indent=2))
            return 0 if result["passed"] else 3
        if args.command == "serve":
            serve(output, args.port, args.expected_bundle_sha256)
            return 0
        if args.command == "diff":
            if args.baseline is None:
                raise EvidenceError("diff requires --baseline")
            print(json.dumps(diff_bundles(args.baseline.resolve(), output, args.baseline_bundle_sha256, args.expected_bundle_sha256), indent=2))
            return 0
        if args.command == "plan":
            with snapshot_lock(output):
                result = verify_bundle(output, args.expected_bundle_sha256)
                if not result["passed"]:
                    raise EvidenceError("Refusing to plan from an invalid bundle")
                if read_json(output / "bundle_manifest.json")["stage"] != "inventory":
                    raise EvidenceError("Plan already exists; choose a fresh audit for new observations")
                write_plan(output, read_json(output / "estate_manifest.json"), read_json(output / "findings.json"))
                seal_bundle(output)
                result = verify_bundle(output)
                write_json(output / "verification.json", result)
            print(json.dumps(result, indent=2))
            return 0 if result["passed"] else 3
        from frontier_http import resolve_credentials, redact
        from frontier_inventory import collect
        github_token, hf_token, sources = resolve_credentials()
        secrets = (github_token, hf_token)
        with snapshot_lock(output):
            if any(p.name != ".audit.lock" for p in output.iterdir()):
                raise EvidenceError("Output already contains files; choose a fresh snapshot directory")
            preflight = {"schema": "szl.preflight.v2", "observed_at": utc_now(), "python": sys.version.split()[0],
                         "github_org": args.github_org, "huggingface_org": args.hf_org, "credential_sources": sources,
                         "credential_availability": {"github": bool(github_token), "huggingface": bool(hf_token)},
                         "include_private": args.include_private, "probe_spaces": args.probe_spaces,
                         "remote_mutation": False, "scope": "Configured endpoints visible to current credentials"}
            def progress(message):
                print(redact(str(message), secrets), file=sys.stderr, flush=True)
            observed = collect(args.github_org, args.hf_org, github_token, hf_token,
                               include_private=args.include_private, probe_spaces=args.probe_spaces,
                               workers=args.workers, max_repos=args.max_repos, progress=progress)
            observed["local"] = local_inventory(args.local_root)
            if observed["local"]["state"] in {"PARTIAL", "UNAVAILABLE"}:
                observed.setdefault("errors", []).append({"scope": "local", "code": "local-inventory-incomplete"})
            # Redact before persistence AND before evidence hashes are computed.
            observed = redact_tree(observed, secrets)
            result = build_snapshot(output, observed, preflight, "inventory" if args.command == "inventory" else "all")
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "OBSERVED" else 2
    except KeyboardInterrupt:
        print("Interrupted. No remote mutation was performed.", file=sys.stderr)
        return 130
    except Exception as exc:
        try:
            from frontier_http import redact
            message = redact(str(exc), secrets)
        except ImportError:
            message = type(exc).__name__
        print(json.dumps({"status": "ERROR", "error": type(exc).__name__, "detail": message[:500]}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
