"""Live metadata inventory with immutable GitHub revision binding and explicit gaps.

This module only reads provider APIs. A complete metadata query is not evidence of
organization-wide authorization, successful builds, model training, or app readiness.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import re
from typing import Any
import urllib.error
import urllib.parse
import urllib.request

from frontier_http import AuditError, Client, SameOriginRedirect, USER_AGENT, redact

GITHUB_API = "https://api.github.com"
HF_API = "https://huggingface.co/api"
TREE_ENTRY_LIMIT = 250000


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def classify_path(path: str, size: int | None = None) -> list[str]:
    """Path heuristics identify review candidates; never assert secret contents."""
    p = str(path).lower().replace("\\", "/")
    name = p.rsplit("/", 1)[-1]
    parts = set(p.split("/"))
    tags = set()
    env_candidate = name == ".env" or (name.startswith(".env.") and
                    not any(x in name for x in ("example", "sample", "template", "defaults", "schema")))
    secret_candidate = (env_candidate or name in {"id_rsa", "id_ed25519", "id_ecdsa", ".npmrc", ".pypirc"}
                        or name.endswith((".p12", ".pfx", ".key"))
                        or name in {"credentials.json", "credentials.yaml", "credentials.yml", "service-account.json"}
                        or p.endswith(".aws/credentials"))
    if secret_candidate:
        tags.add("secret-risk-path")
    if parts & {"__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "node_modules"}:
        tags.add("cache")
    if parts & {".venv", "venv", "site-packages"}:
        tags.add("virtualenv")
    if any(part.startswith("checkpoint-") for part in parts) or name in {"trainer_state.json", "optimizer.pt", "scheduler.pt"}:
        tags.add("checkpoint")
    if name.endswith((".safetensors", ".gguf", ".pth", ".ckpt")) or name == "pytorch_model.bin":
        tags.add("model-weight")
    if name.endswith((".bak", ".before", ".preexisting", "~")):
        tags.add("backup")
    if name.endswith((".pyc", ".pyo", ".class")):
        tags.add("compiled")
    if name in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "uv.lock", "requirements.lock"}:
        tags.add("lockfile")
    if p.startswith(".github/workflows/") and name.endswith((".yaml", ".yml")):
        tags.add("workflow")
    if name == "package.json" or name.startswith(("next.config.", "vite.config.")) or p.startswith(("src/app/", "src/pages/")):
        tags.add("frontend")
    if name in {"pyproject.toml", "requirements.txt", "setup.py"} or name.endswith(".py"):
        tags.add("python")
    if name in {"dockerfile", "compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml"}:
        tags.add("container")
    if isinstance(size, int) and size > 50 * 1024 * 1024:
        tags.add("oversized-50mb")
    return sorted(tags)


def infer_repo_archetype(paths: list[str], topics: list[str]) -> str:
    names = {p.lower().rsplit("/", 1)[-1] for p in paths}
    topics_set = {str(x).lower() for x in topics}
    if "lean-toolchain" in names or any(p.endswith(".lean") for p in names):
        return "proof"
    if any(p.startswith("next.config.") for p in names):
        return "nextjs-frontend"
    if any(p.startswith("vite.config.") for p in names):
        return "vite-frontend"
    if "package.json" in names and any(p.startswith(("src/app/", "src/pages/")) for p in paths):
        return "web-frontend"
    if "pyproject.toml" in names or "setup.py" in names:
        return "python-package"
    if "model" in topics_set or "adapter_config.json" in names or any(p.endswith(".safetensors") for p in names):
        return "model-tooling"
    if "docs" in topics_set or "mkdocs.yml" in names:
        return "documentation"
    if "requirements.txt" in names or any(p.endswith(".py") for p in names):
        return "python-source"
    return "unknown"


def _error(scope: str, exc: Exception) -> dict:
    result = {"scope": scope, "error": type(exc).__name__,
            "code": getattr(exc, "code", "UNEXPECTED_SCHEMA"),
            "detail": str(exc)[:500] if isinstance(exc, AuditError) else "Unexpected provider response schema"}
    if hasattr(exc, "wait_seconds"):
        result["wait_seconds"] = exc.wait_seconds
    if hasattr(exc, "rate_limit"):
        result["rate_limit"] = dict(exc.rate_limit)
    return result


def _sanitize(value: Any, secrets: tuple[str, ...]) -> Any:
    if isinstance(value, str):
        return redact(value, secrets)
    if isinstance(value, list):
        return [_sanitize(item, secrets) for item in value]
    if isinstance(value, dict):
        return {redact(str(key), secrets): _sanitize(item, secrets) for key, item in value.items()}
    return value


def _dict(value: Any, label: str) -> dict:
    if not isinstance(value, dict):
        raise AuditError("Unexpected object schema for " + label, code="INVALID_SCHEMA")
    return value


def _list(value: Any, label: str) -> list:
    if not isinstance(value, list):
        raise AuditError("Unexpected list schema for " + label, code="INVALID_SCHEMA")
    return value


def _sha(value: Any, label: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[a-fA-F0-9]{40,64}", value):
        raise AuditError("Invalid immutable revision for " + label, code="INVALID_SCHEMA")
    return value


def _repo(client: Client, org: str, repo: dict) -> tuple[dict, list]:
    name = repo.get("name")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        raise AuditError("Invalid GitHub repository identifier", code="INVALID_SCHEMA")
    base = GITHUB_API + "/repos/" + urllib.parse.quote(org, safe="") + "/" + urllib.parse.quote(name, safe="")
    errors: list[dict] = []
    endpoints: dict[str, str] = {}

    def fetch(label, path, *, pages=False, key=None, fallback=None):
        try:
            value = client.pages(base + path, key=key) if pages else client.request(base + path)
            if not pages:
                _dict(value, label)
            endpoints[label] = "COMPLETE"
            return value
        except AuditError as exc:
            endpoints[label] = "PARTIAL" if exc.partial else "UNAVAILABLE"
            errors.append(_error("github:" + name + ":" + label, exc))
            return exc.partial if pages and exc.partial else (fallback if fallback is not None else ([] if pages else {}))

    branches = fetch("branches", "/branches?per_page=100", pages=True)
    tags = fetch("tags", "/tags?per_page=100", pages=True)
    releases = fetch("releases", "/releases?per_page=100", pages=True)
    contributors = fetch("contributors", "/contributors?per_page=100&anon=false", pages=True)
    languages = fetch("languages", "/languages")
    workflows = fetch("workflows", "/actions/workflows?per_page=100", pages=True, key="workflows")
    default = repo.get("default_branch")
    selected = next((b for b in branches if b.get("name") == default), None)
    if default and selected is None:
        selected = fetch("default_branch", "/branches/" + urllib.parse.quote(str(default), safe=""))
    revision = {"default_branch": default, "commit_sha": None, "tree_sha": None,
                "binding": "UNAVAILABLE", "observed_at": utc_now()}
    entries = []
    truncated = False
    checks = []
    runs = []
    statuses = []
    verification = {}
    try:
        commit_sha = _sha(_dict((selected or {}).get("commit", {}), "branch commit").get("sha"), "default branch")
        revision["commit_sha"] = commit_sha
        commit = fetch("commit", "/git/commits/" + commit_sha)
        if commit:
            if _sha(commit.get("sha"), "commit") != commit_sha:
                raise AuditError("Commit response does not match pinned revision", code="REVISION_MISMATCH")
            tree_sha = _sha(_dict(commit.get("tree"), "commit tree").get("sha"), "tree")
            revision["tree_sha"] = tree_sha
            verification = {k: (commit.get("verification") or {}).get(k) for k in ("verified", "reason", "verified_at")}
            tree = fetch("tree", "/git/trees/" + tree_sha + "?recursive=1")
            if tree:
                if _sha(tree.get("sha"), "tree") != tree_sha:
                    raise AuditError("Tree response does not match pinned revision", code="REVISION_MISMATCH")
                all_entries = _list(tree.get("tree"), "tree")
                if not all(isinstance(x, dict) and isinstance(x.get("path"), str) for x in all_entries):
                    raise AuditError("Invalid tree entry schema", code="INVALID_SCHEMA")
                entries = all_entries[:TREE_ENTRY_LIMIT]
                truncated = bool(tree.get("truncated")) or len(all_entries) > TREE_ENTRY_LIMIT
                if truncated:
                    endpoints["tree"] = "PARTIAL"
                    errors.append({"scope": "github:" + name + ":tree", "error": "IncompleteTree", "code": "TREE_TRUNCATED",
                                   "detail": "Provider tree is truncated or exceeded the local entry limit"})
                revision["binding"] = "IMMUTABLE_COMMIT_AND_TREE"
        checks = fetch("check_runs", "/commits/" + commit_sha + "/check-runs?per_page=100&filter=all", pages=True, key="check_runs")
        runs = fetch("workflow_runs", "/actions/runs?head_sha=" + commit_sha + "&per_page=100", pages=True, key="workflow_runs")
        statuses = fetch("commit_statuses", "/commits/" + commit_sha + "/statuses?per_page=100", pages=True)
        if any(check.get("head_sha") != commit_sha for check in checks) or any(run.get("head_sha") != commit_sha for run in runs):
            raise AuditError("CI response includes a different commit revision", code="REVISION_MISMATCH")
    except AuditError as exc:
        errors.append(_error("github:" + name + ":revision", exc))
        endpoints["revision"] = "UNAVAILABLE"
        # Never retain CI records as exact-revision evidence after a binding mismatch.
        if exc.code == "REVISION_MISMATCH":
            checks, runs, statuses = [], [], []
            revision["binding"] = "UNAVAILABLE"
    paths = [entry["path"] for entry in entries]
    path_findings = [{"path": x["path"], "type": x.get("type"), "size": x.get("size"),
                      "sha": x.get("sha"), "tags": classify_path(x["path"], x.get("size"))}
                     for x in entries if classify_path(x["path"], x.get("size"))]
    record = {k: repo.get(k) for k in ("name", "node_id", "visibility", "private", "archived", "disabled", "fork",
              "default_branch", "description", "homepage", "created_at", "updated_at", "pushed_at")}
    record.update({"platform": "github", "owner": org, "url": repo.get("html_url"), "size_kb": repo.get("size"),
                   "license": (repo.get("license") or {}).get("spdx_id"), "topics": repo.get("topics") or [],
                   "languages": languages, "archetype": infer_repo_archetype(paths, repo.get("topics") or []),
                   "branches": [{"name": b.get("name"), "protected": b.get("protected"), "sha": (b.get("commit") or {}).get("sha")} for b in branches],
                   "tags": [{"name": t.get("name"), "sha": (t.get("commit") or {}).get("sha")} for t in tags],
                   "releases": [{"tag": r.get("tag_name"), "draft": r.get("draft"), "prerelease": r.get("prerelease"), "published_at": r.get("published_at")} for r in releases],
                   "workflows": [{k: w.get(k) for k in ("id", "name", "path", "state")} for w in workflows],
                   "contributors_observed": len(contributors), "tree_entry_count": len(entries), "tree_truncated": truncated,
                   "path_findings": path_findings, "revision": revision, "commit_signature": verification,
                   "ci": {"commit_sha": revision["commit_sha"], "evidence_class": "DECLARED",
                          "check_runs": [{k: c.get(k) for k in ("id", "name", "head_sha", "status", "conclusion", "started_at", "completed_at", "html_url")} for c in checks],
                          "workflow_runs": [{k: r.get(k) for k in ("id", "name", "head_sha", "status", "conclusion", "event", "created_at", "updated_at", "html_url")} for r in runs],
                          "statuses": [{k: s.get(k) for k in ("id", "context", "state", "created_at", "updated_at", "target_url")} for s in statuses],
                          "release_eligibility": "UNKNOWN"},
                   "application_readiness": "UNKNOWN", "endpoint_coverage": endpoints,
                   "audit_state": "PARTIAL" if errors else "OBSERVED", "errors": errors})
    return record, errors


def infer_hf_artifact(kind: str, item: dict) -> str:
    if kind != "models":
        return {"datasets": "dataset", "spaces": "space", "collections": "collection"}.get(kind, "unknown")
    tags = {str(t).lower() for t in (item.get("tags") or [])}
    names = {str(f.get("rfilename", "")).lower() for f in (item.get("siblings") or []) if isinstance(f, dict)}
    if any(n.endswith((".safetensors", ".gguf", ".pth", ".ckpt")) or n == "pytorch_model.bin" for n in names):
        return "weight-files-unverified"
    if "source-bound-kernel" in tags or "kernel" in tags:
        return "kernel-tagged-unverified"
    if "software" in tags:
        return "software"
    if names and all(n.endswith((".md", ".txt", ".gitattributes", ".json", ".yaml", ".yml")) for n in names):
        return "documentation"
    return "unknown"


def probe_space_runtime(item: dict) -> dict:
    result = {"state": "UNKNOWN", "application_readiness": "UNKNOWN", "checked_at": utc_now(),
              "method": "HEAD", "credentials_sent": False}
    host = item.get("host")
    if not isinstance(host, str) or not host:
        return {**result, "reason": "No provider host available"}
    try:
        url = host if "://" in host else "https://" + host
        parsed = urllib.parse.urlsplit(url)
        if not (parsed.scheme == "https" and re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.hf\.space", parsed.hostname or "")
                and parsed.port in (None, 443) and parsed.username is None and parsed.password is None
                and not parsed.query and not parsed.fragment and parsed.path in ("", "/")):
            return {**result, "reason": "Provider host outside permitted hf.space origins"}
        url = "https://" + parsed.hostname + "/"
        result["url"] = url
        opener = urllib.request.build_opener(SameOriginRedirect(parsed.hostname))
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
        with opener.open(req, timeout=10) as response:
            return {**result, "state": "REACHABLE", "http_status": response.status,
                    "evidence_scope": "HTTP response only; application routes and inference not assessed"}
    except urllib.error.HTTPError as exc:
        status = exc.code
        exc.close()
        return {**result, "state": "DEGRADED", "http_status": status, "reason": "Host returned an HTTP error"}
    except (AuditError, OSError, ValueError, urllib.error.URLError):
        return {**result, "state": "UNAVAILABLE", "reason": "Bounded HEAD probe failed"}


def _hf_asset(client: Client, org: str, kind: str, item: dict, probe: bool) -> tuple[dict, list]:
    asset_id = item.get("id") or item.get("modelId") or item.get("slug")
    if not isinstance(asset_id, str) or not asset_id.lower().startswith(org.lower() + "/") or ".." in asset_id.split("/"):
        raise AuditError("Invalid or out-of-owner Hugging Face asset identifier", code="INVALID_SCHEMA")
    errors = []
    endpoints = {"list_metadata": "COMPLETE"}
    observed = dict(item)
    try:
        query = "?blobs=true" if kind != "collections" else ""
        detail = _dict(client.request(HF_API + "/" + kind + "/" + urllib.parse.quote(asset_id, safe="/") + query), "HF detail")
        detail_id = detail.get("id") or detail.get("modelId") or detail.get("slug")
        if detail_id != asset_id:
            raise AuditError("Asset detail identity does not match requested asset", code="IDENTITY_MISMATCH")
        observed.update(detail)
        endpoints["detail_metadata"] = "COMPLETE"
    except AuditError as exc:
        errors.append(_error("huggingface:" + kind + ":" + asset_id, exc))
        endpoints["detail_metadata"] = "UNAVAILABLE"
    siblings = observed.get("siblings")
    if kind != "collections":
        if not isinstance(siblings, list) or not all(isinstance(f, dict) and isinstance(f.get("rfilename"), str) for f in siblings):
            siblings = []
            endpoints["files"] = "UNAVAILABLE"
            errors.append({"scope": "huggingface:" + asset_id + ":files", "error": "InvalidSchema", "code": "INVALID_SCHEMA", "detail": "File metadata absent or invalid"})
        else:
            endpoints["files"] = "COMPLETE" if endpoints.get("detail_metadata") == "COMPLETE" else "PARTIAL"
    else:
        siblings = []
    card = observed.get("cardData") or {}
    if not isinstance(card, dict):
        card = {}
    tags = observed.get("tags") or []
    license_id = card.get("license") or next((t.split(":", 1)[1] for t in tags if isinstance(t, str) and t.startswith("license:")), None)
    revision_sha = observed.get("sha")
    if kind != "collections" and (not isinstance(revision_sha, str) or not re.fullmatch(r"[a-fA-F0-9]{40,64}", revision_sha)):
        errors.append({"scope": "huggingface:" + asset_id + ":revision", "error": "InvalidRevision", "code": "REVISION_UNAVAILABLE", "detail": "Immutable Hub revision absent or invalid"})
        endpoints["revision"] = "UNAVAILABLE"
    record = {k: observed.get(k) for k in ("private", "gated", "disabled", "pipeline_tag", "library_name", "sdk", "title", "owner", "sha", "downloads", "likes")}
    record.update({"platform": "huggingface", "kind": {"models": "model", "datasets": "dataset", "spaces": "space", "collections": "collection"}[kind],
                   "id": asset_id, "url": "https://huggingface.co/" + ((kind + "/") if kind != "models" else "") + asset_id,
                   "last_modified": observed.get("lastModified") or observed.get("last_modified"), "created_at": observed.get("createdAt"),
                   "license": license_id, "license_evidence": "DECLARED" if license_id else "UNKNOWN",
                   "collection_items": observed.get("items", []) if kind == "collections" else [], "tags": tags,
                   "artifact_type": infer_hf_artifact(kind, {**observed, "siblings": siblings}),
                   "evidence_class": "DECLARED", "runtime_state": "UNKNOWN", "application_readiness": "UNKNOWN",
                   "training_verified": False, "publication_eligibility": "UNKNOWN", "lineage_verification": "UNKNOWN",
                   "files": [{"name": f["rfilename"], "size": f.get("size"), "blob_id": f.get("blobId"),
                              "lfs": f.get("lfs"), "tags": classify_path(f["rfilename"], f.get("size"))} for f in siblings],
                   "endpoint_coverage": endpoints, "audit_state": "PARTIAL" if errors else "OBSERVED", "errors": errors})
    if kind == "spaces":
        runtime = observed.get("runtime") or {}
        record["provider_runtime"] = {"stage": runtime.get("stage") if isinstance(runtime, dict) else None,
                                      "evidence_class": "DECLARED", "application_readiness": "UNKNOWN"}
        if probe:
            record["runtime_probe"] = probe_space_runtime(observed)
            record["runtime_state"] = record["runtime_probe"]["state"]
    return record, errors


def collect(github_org: str, hf_org: str, github_token: str, hf_token: str,
            include_private: bool = False, probe_spaces: bool = False, workers: int = 4,
            max_repos: int = 0, progress=None) -> dict:
    for org in (github_org, hf_org):
        if not isinstance(org, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}", org):
            raise ValueError("Invalid organization name")
    if not 1 <= workers <= 16 or max_repos < 0:
        raise ValueError("workers must be 1..16 and max_repos nonnegative")
    gh = Client(github_token, "github", max_requests=4500)
    hf = Client(hf_token, "huggingface")
    result = {"github": [], "huggingface": {"models": [], "datasets": [], "spaces": [], "collections": []},
              "errors": [], "coverage": {}, "request_stats": {}}

    def enumerate_items(client, url, scope):
        try:
            return client.pages(url), True
        except AuditError as exc:
            result["errors"].append(_error(scope, exc))
            return exc.partial, False

    kind = "all" if include_private else "public"
    repos, gh_complete = enumerate_items(gh, GITHUB_API + "/orgs/" + github_org + "/repos?type=" + kind + "&per_page=100", "github:repository_list")
    # The provider-side filter is reinforced locally before persisting any record.
    visible_repos = [r for r in repos if include_private or r.get("private") is False]
    visible_repos.sort(key=lambda r: str(r.get("name", "")).lower())
    selected = visible_repos[:max_repos] if max_repos else visible_repos
    gh_scope = {"enumeration_complete": gh_complete, "enumerated": len(repos), "eligible": len(visible_repos),
                "selected": len(selected), "observed": 0,
                "excluded_private": sum(r.get("private") is True for r in repos) if not include_private else 0,
                "excluded_unknown_privacy": sum(r.get("private") is not True and r.get("private") is not False for r in repos) if not include_private else 0,
                "limited_by_max_repos": len(selected) < len(visible_repos), "inventory_complete": False,
                "visibility_requested": kind, "authenticated": bool(github_token),
                "scope": "Metadata visible to supplied identity; hidden or inaccessible repositories cannot be counted",
                "not_assessed": ["effective organization permissions", "branch protection rules", "merge eligibility", "deployments", "application readiness", "secret contents"]}
    result["coverage"]["github"] = gh_scope
    hf_selected = {}
    for asset_kind in result["huggingface"]:
        params = {"owner" if asset_kind == "collections" else "author": hf_org, "limit": 100}
        if asset_kind != "collections":
            params["full"] = "true"
        items, complete = enumerate_items(hf, HF_API + "/" + asset_kind + "?" + urllib.parse.urlencode(params), "huggingface:" + asset_kind + ":list")
        items = sorted(items, key=lambda x: str(x.get("id") or x.get("modelId") or x.get("slug") or "").lower())
        visible = [i for i in items if include_private or i.get("private") is False]
        hf_selected[asset_kind] = visible
        result["coverage"].setdefault("huggingface", {})[asset_kind] = {
            "enumeration_complete": complete, "enumerated": len(items), "selected": len(visible),
            "excluded_private": sum(i.get("private") is True for i in items) if not include_private else 0,
            "excluded_unknown_privacy": sum(i.get("private") is not True and i.get("private") is not False for i in items) if not include_private else 0,
            "observed": 0, "inventory_complete": False,
            "authenticated": bool(hf_token), "include_private": include_private,
            "scope": "Visible inventory metadata only; training, publication authorization, and application readiness not assessed"}

    tasks = [("github", r) for r in selected]
    tasks.extend((k, item) for k, items in hf_selected.items() for item in items)
    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="frontier") as pool:
        pending = {pool.submit(_repo, gh, github_org, item) if k == "github" else
                   pool.submit(_hf_asset, hf, hf_org, k, item, probe_spaces): (k, item)
                   for k, item in tasks}
        finished = 0
        for future in as_completed(pending):
            asset_kind, item = pending[future]
            identifier = str(item.get("name") or item.get("id") or item.get("modelId") or item.get("slug") or "unknown")
            try:
                record, errors = future.result()
                # A detail request may reveal privacy that a list endpoint omitted.
                if not include_private and record.get("private") is not False:
                    scope = gh_scope if asset_kind == "github" else result["coverage"]["huggingface"][asset_kind]
                    scope["excluded_private" if record.get("private") is True else "excluded_unknown_privacy"] += 1
                    continue
                result["errors"].extend(errors)
                (result["github"] if asset_kind == "github" else result["huggingface"][asset_kind]).append(record)
            except Exception as exc:
                error = _error(asset_kind + ":" + identifier, exc)
                result["errors"].append(error)
                record = {"platform": "github" if asset_kind == "github" else "huggingface",
                          "name" if asset_kind == "github" else "id": identifier,
                          "private": item.get("private"), "audit_state": "PARTIAL", "errors": [error], "application_readiness": "UNKNOWN"}
                (result["github"] if asset_kind == "github" else result["huggingface"][asset_kind]).append(record)
            finally:
                finished += 1
                if progress:
                    progress(f"Observed {finished}/{len(tasks)}: {asset_kind}/{redact(identifier, (github_token, hf_token))}")
    result["github"].sort(key=lambda r: str(r.get("name", "")).lower())
    gh_scope["observed"] = len(result["github"])
    gh_scope["details_complete"] = all(r.get("audit_state") == "OBSERVED" for r in result["github"])
    gh_scope["inventory_complete"] = gh_complete and not gh_scope["limited_by_max_repos"] and gh_scope["details_complete"] and not gh_scope["excluded_unknown_privacy"]
    gh_scope["complete"] = gh_scope["inventory_complete"]
    for asset_kind, items in result["huggingface"].items():
        items.sort(key=lambda r: str(r.get("id", "")).lower())
        scope = result["coverage"]["huggingface"][asset_kind]
        scope["observed"] = len(items)
        scope["details_complete"] = all(r.get("audit_state") == "OBSERVED" for r in items)
        scope["inventory_complete"] = scope["enumeration_complete"] and scope["details_complete"] and not scope["excluded_unknown_privacy"]
        scope["complete"] = scope["inventory_complete"]
    result["errors"].sort(key=lambda e: (e["scope"], e.get("code", ""), e.get("detail", "")))
    result["request_stats"] = {"github": gh.stats, "huggingface": hf.stats}
    return _sanitize(result, (github_token, hf_token))
