#!/usr/bin/env python3
"""Anonymous, bounded Hugging Face evidence collection; production always HOLD.

Stdlib only. Run with --receipt out/receipt.json --evidence-dir out/evidence.
Exit 0 means the configured observation checks passed, 2 means findings or
incomplete observations, and 3 means configuration/evidence-storage failure.
It is neither a production readiness verdict nor an external attestation.
Transport and clock injection permit deterministic tests without network access.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WAVE = ROOT / "frontier/waves/2026-09-07.json"
DEFAULT_PINS = ROOT / "frontier/evidence/2026-09-07-upstream-model-pins.json"
ORG = "SZLHOLDINGS"
ORG_SPACES = [
    "a11oy", "ayllu", "counsel", "david-leads", "finance", "immune",
    "immune-lattice", "killinchu", "lyte", "sentra", "szl-command-lab",
    "szl-constellation", "szl-frontier", "szl-model-inference-lab", "terra",
    "vertical-services", "yarqa",
]
ORG_PROFILE_SPACE = "SZLHOLDINGS/README"
CREATOR_SPACES = ["betterwithage/anatomy"]
CARD_TRUTH_WATCH = [("space", "SZLHOLDINGS/szl-frontier"),
                    ("space", "SZLHOLDINGS/a11oy"),
                    ("space", "betterwithage/anatomy"),
                    ("model", "SZLHOLDINGS/chaski")]
ORIGIN = "https://huggingface.co"
SCHEMA = "szl.outside-seat.receipt.v2"
STALE_HOURS_DEFAULT = 30
MAX_BYTES = 4 * 1024 * 1024
MAX_PAGES = 20
SHA = re.compile(r"(?:[0-9a-f]{40}|[0-9a-f]{64})\Z")
REPO = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*\Z")


class ConfigError(ValueError):
    """A local input cannot safely define a complete observation run."""


def sha256_bytes(body):
    return hashlib.sha256(body).hexdigest()


def canonical_digest(obj):
    return sha256_bytes(json.dumps(obj, sort_keys=True, separators=(",", ":"),
                                   allow_nan=False).encode("utf-8"))


def strict_json(body):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result
    def invalid(value):
        raise ValueError(f"non-finite JSON value: {value}")
    return json.loads(body.decode("utf-8"), object_pairs_hook=pairs,
                      parse_constant=invalid)


def atomic_write(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(body)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def _now(clock=None):
    value = (clock or (lambda: datetime.now(timezone.utc)))()
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ConfigError("clock must return a timezone-aware datetime")
    return value.astimezone(timezone.utc)


def timestamp(value):
    return value.isoformat().replace("+00:00", "Z")


def parse_date(value, now):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("lastModified missing or not a string")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("lastModified has no timezone")
    if parsed > now:
        raise ValueError("lastModified is in the future")
    return parsed


def validate_threshold(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ConfigError("stale-hours must be finite and greater than zero")


def validate_url(url):
    if not isinstance(url, str) or any(ord(c) < 33 for c in url) or "\\" in url:
        raise ValueError("invalid public URL")
    p = urllib.parse.urlsplit(url)
    if (p.scheme != "https" or p.netloc not in ("huggingface.co", "huggingface.co:443")
            or p.fragment or p.username or p.password):
        raise ValueError("only the anonymous Hugging Face HTTPS origin is permitted")
    if any(segment in (".", "..") for segment in urllib.parse.unquote(p.path).split("/")):
        raise ValueError("URL contains a relative path segment")
    return url


def repo_id_from_url(url):
    try:
        validate_url(url)
        p = urllib.parse.urlsplit(url)
        repo = p.path.strip("/")
        return repo if REPO.fullmatch(repo) and not p.query else None
    except (ValueError, TypeError):
        return None


@dataclass
class HttpResponse:
    status: int
    body: bytes
    headers: dict = field(default_factory=dict)
    url: str = ""
    error: str | None = None
    truncated: bool = False


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http_get(url, max_bytes=MAX_BYTES):
    """One anonymous GET, no ambient credentials/proxy auth or auto redirects."""
    validate_url(url)
    request = urllib.request.Request(url, method="GET", headers={
        "User-Agent": "szl-estate-outside-seat/2.0 (anonymous; read-only)",
        "Accept-Encoding": "identity",
    })
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
    response = None
    try:
        try:
            response = opener.open(request, timeout=20)
        except urllib.error.HTTPError as exc:
            response = exc  # Error and redirect bodies are evidence too.
        body = response.read(max_bytes + 1)
        return HttpResponse(response.code, body, dict(response.headers), response.geturl(),
                            truncated=len(body) > max_bytes)
    except http.client.IncompleteRead as exc:
        return HttpResponse(response.code, exc.partial, dict(response.headers), response.geturl(),
                            error="response ended before declared body length", truncated=True)
    except (OSError, urllib.error.URLError, ValueError, http.client.HTTPException) as exc:
        return HttpResponse(response.code if response is not None else 0, b"",
                            dict(response.headers) if response is not None else {}, url=url,
                            error=f"{type(exc).__name__}: {exc}", truncated=response is not None)
    finally:
        if response is not None:
            response.close()


class EvidenceClient:
    def __init__(self, evidence_dir, transport=None, clock=None,
                 max_pages=MAX_PAGES, max_bytes=MAX_BYTES):
        if type(max_pages) is not int or max_pages < 1 or type(max_bytes) is not int or max_bytes < 1:
            raise ConfigError("transport bounds must be positive integers")
        self.evidence_dir = Path(evidence_dir)
        self.transport = transport or (lambda url: http_get(url, max_bytes))
        self.clock = clock
        self.max_pages, self.max_bytes = max_pages, max_bytes
        self.observations, self.errors = [], []

    def store(self, body):
        digest = sha256_bytes(body)
        relative = Path("sha256") / f"{digest}.bin"
        path = self.evidence_dir / relative
        try:
            if path.exists():
                if sha256_bytes(path.read_bytes()) != digest:
                    raise ConfigError(f"corrupt evidence object: {relative.as_posix()}")
            else:
                atomic_write(path, body)
        except OSError as exc:
            raise ConfigError(f"cannot persist evidence: {exc}") from exc
        return {"sha256": digest, "bytesRead": len(body), "evidencePath": relative.as_posix()}

    def get(self, url, pagination_scope=None):
        initial, visited = url, set()
        for _ in range(6):
            error = None
            try:
                validate_url(url)
                if pagination_scope is not None:
                    parsed = urllib.parse.urlsplit(url)
                    if (parsed.path, urllib.parse.parse_qs(parsed.query).get("author")) != pagination_scope:
                        raise ValueError("pagination redirect changed endpoint or author scope")
                if url in visited:
                    raise ValueError("redirect cycle")
                if len(self.observations) >= 2000:
                    raise ValueError("total observation bound exceeded")
                visited.add(url)
                response = self.transport(url)
                if not isinstance(response, HttpResponse) or not isinstance(response.body, bytes):
                    raise ValueError("transport must return HttpResponse with bytes")
            except Exception as exc:
                response = HttpResponse(0, b"", url=url, error=f"{type(exc).__name__}: {exc}")
            body = response.body
            final_url = response.url or url
            if type(response.status) is not int or not 0 <= response.status <= 599:
                error = "invalid HTTP status"
            try:
                validate_url(final_url)
            except ValueError as exc:
                error = str(exc)
            if final_url != url:
                error = "transport followed a redirect without recording its response"
            if response.truncated or len(body) > self.max_bytes:
                error = "response byte bound exceeded; stored bytes are incomplete"
            if not isinstance(response.headers, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in response.headers.items()):
                error = "malformed HTTP response headers"
                headers = {}
            else:
                headers = {k.lower(): v for k, v in response.headers.items()}
            obs = {"requestedUrl": initial, "url": final_url, "status": response.status,
                   "retrievedAt": timestamp(_now(self.clock)), "headers": headers,
                   "responseReceived": response.status != 0,
                   "bodyComplete": not response.truncated and len(body) <= self.max_bytes,
                   **self.store(body)}
            error = error or response.error
            if error:
                obs["error"] = error
                self.errors.append(f"{url}: {error}")
            self.observations.append(obs)
            if error or response.status not in (301, 302, 303, 307, 308):
                return obs, body
            location = headers.get("location")
            if not location:
                obs["error"] = "redirect lacks Location"
                self.errors.append(f"{url}: redirect lacks Location")
                return obs, body
            url = urllib.parse.urljoin(url, location)
        obs["error"] = "redirect bound exceeded"
        self.errors.append(f"{initial}: redirect bound exceeded")
        return obs, body

    def json(self, url, pagination_scope=None):
        obs, body = self.get(url, pagination_scope=pagination_scope)
        if obs["status"] != 200 or obs.get("error"):
            return obs, None
        try:
            return obs, strict_json(body)
        except (ValueError, UnicodeError) as exc:
            obs["error"] = f"invalid JSON: {exc}"
            self.errors.append(f"{url}: invalid JSON")
            return obs, None

    def pages(self, url):
        items, visited, errors = [], set(), []
        original = urllib.parse.urlsplit(url)
        scope = urllib.parse.parse_qs(original.query).get("author")
        for _ in range(self.max_pages):
            try:
                validate_url(url)
                p = urllib.parse.urlsplit(url)
                if p.path != original.path or urllib.parse.parse_qs(p.query).get("author") != scope:
                    raise ValueError("pagination changed endpoint or author scope")
                if url in visited:
                    raise ValueError("pagination cycle")
            except ValueError as exc:
                return items, [str(exc)]
            visited.add(url)
            obs, data = self.json(url, pagination_scope=(original.path, scope))
            if not isinstance(data, list):
                return items, [f"page unreadable or not an array (http {obs['status']})"]
            items.extend(data)
            if len(items) > 20000:
                return items, ["pagination item bound exceeded"]
            link = obs["headers"].get("link", "")
            if not link:
                return items, errors
            next_urls = []
            for entry in re.split(r",(?=\s*<)", link):
                match = re.fullmatch(r'\s*<([^>]+)>\s*((?:;[^;]+)*)\s*', entry)
                if not match:
                    return items, ["malformed pagination Link header"]
                relations = re.search(r';\s*rel\s*=\s*(?:"([^"]+)"|([^;\s]+))', match[2])
                if relations is None:
                    return items, ["pagination Link entry lacks a relation"]
                if relations and "next" in (relations[1] or relations[2]).split():
                    next_urls.append(urllib.parse.urljoin(url, match[1]))
            if not next_urls:
                return items, errors
            if len(next_urls) != 1:
                return items, ["ambiguous pagination next link"]
            url = next_urls[0]
        return items, ["pagination page bound exceeded"]


def validate_wave(wave):
    if not isinstance(wave, dict) or wave.get("schema") != "szl.frontier.integration-wave.v1":
        raise ConfigError("unsupported wave schema")
    if not isinstance(wave.get("wave"), str) or not wave["wave"].strip():
        raise ConfigError("wave id must be a nonempty string")
    if not isinstance(wave.get("policy"), dict):
        raise ConfigError("wave policy must be an object")
    policy = wave["policy"]
    if not isinstance(policy.get("defaultEffect"), str) or type(policy.get("automaticProductionPromotion")) is not bool:
        raise ConfigError("policy defaultEffect and automaticProductionPromotion have invalid types")
    if "automaticDiscovery" in policy and type(policy["automaticDiscovery"]) is not bool:
        raise ConfigError("policy automaticDiscovery must be boolean")
    releases = wave.get("releases")
    if not isinstance(releases, list) or not 1 <= len(releases) <= 200:
        raise ConfigError("wave releases must be a nonempty bounded array")
    admitted = wave.get("alreadyAdmitted", [])
    if not isinstance(admitted, list) or any(not isinstance(x, str) or not x for x in admitted):
        raise ConfigError("alreadyAdmitted must be an array of nonempty strings")
    findings, seen = [], set()
    if policy["defaultEffect"] != "hold":
        findings.append("policy.defaultEffect is not 'hold'")
    if policy["automaticProductionPromotion"] is not False:
        findings.append("automaticProductionPromotion is not false")
    for release in releases:
        if not isinstance(release, dict) or not isinstance(release.get("id"), str) or not release["id"].strip():
            raise ConfigError("each release needs a nonempty id")
        rid = release["id"]
        if rid in seen:
            findings.append(f"duplicate candidate id: {rid}")
        if rid in admitted:
            findings.append(f"candidate re-enters admitted id: {rid}")
        seen.add(rid)
        if repo_id_from_url(release.get("primaryArtifact")) is None:
            raise ConfigError(f"{rid}: invalid primaryArtifact URL")
        artifacts = release.get("artifacts")
        if not isinstance(artifacts, list) or not 1 <= len(artifacts) <= 100:
            raise ConfigError(f"{rid}: artifacts must be a nonempty bounded array")
        refs = release.get("referenceArtifacts", [])
        if not isinstance(refs, list) or len(refs) > 100:
            raise ConfigError(f"{rid}: referenceArtifacts must be an array")
        if any(repo_id_from_url(x) is None for x in artifacts + refs):
            raise ConfigError(f"{rid}: invalid artifact URL")
        if release["primaryArtifact"] not in artifacts:
            raise ConfigError(f"{rid}: primaryArtifact absent from artifacts")
        if len(artifacts) != len(set(artifacts)) or len(refs) != len(set(refs)):
            findings.append(f"{rid}: duplicate artifact URL")
        if release.get("licensePosture") not in ("clear-mit", "review-required", "mixed-review-required"):
            raise ConfigError(f"{rid}: unsupported licensePosture")
    return findings


def validate_pins(pins, wave):
    if not isinstance(pins, dict) or pins.get("schema") != "szl.frontier.upstream-model-pin-set.v1":
        raise ConfigError("unsupported upstream pin set schema")
    models = pins.get("models")
    if not isinstance(models, list) or not 1 <= len(models) <= 2000:
        raise ConfigError("pin models must be a nonempty bounded array")
    releases = {r["id"]: r for r in wave["releases"]}
    seen = set()
    for pin in models:
        if not isinstance(pin, dict) or not isinstance(pin.get("releaseId"), str) or pin["releaseId"] not in releases:
            raise ConfigError("pin has an unknown releaseId")
        if not isinstance(pin.get("repoId"), str) or not REPO.fullmatch(pin["repoId"]):
            raise ConfigError("pin has an invalid repoId")
        if not isinstance(pin.get("revision"), str) or not SHA.fullmatch(pin["revision"]):
            raise ConfigError("pin revision must be an immutable hexadecimal SHA")
        if pin.get("role") not in ("primary", "primary-quantized", "reference", "base-model"):
            raise ConfigError("pin has an unsupported role")
        key = (pin["releaseId"], pin["repoId"])
        if key in seen:
            raise ConfigError("duplicate upstream pin")
        seen.add(key)
    for release in wave["releases"]:
        urls = release["artifacts"] + release.get("referenceArtifacts", [])
        if any((release["id"], repo_id_from_url(url)) not in seen for url in urls):
            raise ConfigError(f"{release['id']}: artifact missing immutable pin")
    if "receipt" in pins:
        receipt = pins["receipt"]
        core = {k: v for k, v in pins.items() if k != "receipt"}
        if (not isinstance(receipt, dict) or receipt.get("algorithm") != "sha256"
                or receipt.get("scope") != "canonical-json(body-without-receipt)"
                or receipt.get("digest") != canonical_digest(core)):
            raise ConfigError("upstream pin set receipt digest mismatch")


def license_posture_check(tags, posture):
    if not tags:
        return False, "license tags unavailable; legal review remains unresolved"
    if posture == "clear-mit":
        return "mit" in tags, "MIT tag check only; this is not a legal license verdict"
    if posture in ("review-required", "mixed-review-required"):
        return True, "license tags observed; legal review remains required"
    return False, f"unsupported licensePosture: {posture}"


def metadata_fields(meta, repo, now, license_required=False):
    notes, tags = [], []
    if not isinstance(meta, dict):
        return ["metadata unreadable or malformed"], tags
    if meta.get("id", meta.get("modelId")) != repo:
        notes.append("metadata repository identity mismatch or absent")
    if not isinstance(meta.get("sha"), str) or not SHA.fullmatch(meta["sha"]):
        notes.append("immutable revision unavailable or malformed")
    try:
        parse_date(meta.get("lastModified"), now)
    except (ValueError, TypeError, OverflowError) as exc:
        notes.append(f"invalid lastModified: {exc}")
    if meta.get("private") is True or meta.get("disabled") is True:
        notes.append("repository is private or disabled")
    if any(key in meta and type(meta[key]) is not bool for key in ("private", "disabled")):
        notes.append("repository visibility or disabled flag is malformed")
    if license_required:
        card, raw_tags = meta.get("cardData", {}), meta.get("tags", [])
        if not isinstance(card, dict) or not isinstance(raw_tags, list) or any(not isinstance(t, str) for t in raw_tags):
            notes.append("malformed license evidence fields")
            return notes, tags
        license_value = card.get("license")
        if license_value is not None:
            values = [license_value] if isinstance(license_value, str) else license_value
            if not isinstance(values, list) or any(not isinstance(t, str) or not t.strip() for t in values):
                notes.append("malformed cardData.license")
            else:
                tags.extend(t.strip().lower() for t in values)
        tags.extend(t[8:].lower() for t in raw_tags if t.startswith("license:") and t[8:].strip())
    return notes, sorted(set(tags))


def verify_wave(wave, client, now=None, pins=None):
    now = now or _now(client.clock)
    try:
        findings = validate_wave(wave)
        if pins is not None:
            validate_pins(pins, wave)
    except ConfigError as exc:
        return [], [f"invalid wave configuration: {exc}"]
    evidences = []
    for release in wave["releases"]:
        if pins is None:
            urls = dict.fromkeys([release["primaryArtifact"]] + release["artifacts"] + release.get("referenceArtifacts", []))
            selected = [{"repoId": repo_id_from_url(url), "revision": None, "role": "observed"} for url in urls]
        else:
            selected = [p for p in pins["models"] if p["releaseId"] == release["id"]]
        for pin in selected:
            repo, expected = pin["repoId"], pin["revision"]
            url = f"{ORIGIN}/api/models/{repo}" + (f"/revision/{expected}" if expected else "")
            obs, meta = client.json(url)
            notes, tags = metadata_fields(meta, repo, now, license_required=True)
            if obs["status"] != 200:
                notes.append(f"metadata unreadable (http {obs['status']})")
            if expected and isinstance(meta, dict) and meta.get("sha") != expected:
                notes.append("observed revision does not match canonical immutable pin")
            ok, license_note = license_posture_check(tags, release["licensePosture"])
            if not ok:
                notes.append(license_note)
            if pin.get("license") is not None:
                wanted = pin["license"] if isinstance(pin["license"], list) else [pin["license"]]
                if any(not isinstance(tag, str) or tag.lower() not in tags for tag in wanted):
                    notes.append("license tags do not match canonical pin evidence")
            ev = {"candidate": release["id"], "repo": repo, "role": pin["role"],
                  "exists": isinstance(meta, dict) and obs["status"] == 200,
                  "expectedRevision": expected, "revision": meta.get("sha") if isinstance(meta, dict) else None,
                  "lastModified": meta.get("lastModified") if isinstance(meta, dict) else None,
                  "licenseTags": tags, "posture": release["licensePosture"],
                  "licenseReview": license_note, "observationSha256": obs["sha256"],
                  "status": "INCOMPLETE" if notes else "VERIFIED", "notes": notes}
            evidences.append(ev)
    return evidences, findings


def check_card_truth(kind, repo, client):
    result = {"repo": repo, "kind": kind, "status": "INCOMPLETE", "findings": [], "bytesRead": 0}
    if kind not in ("space", "model") or not isinstance(repo, str) or not REPO.fullmatch(repo):
        result["findings"].append("invalid card watch target")
        return result
    plural = "spaces" if kind == "space" else "models"
    obs, meta = client.json(f"{ORIGIN}/api/{plural}/{repo}")
    issues, _ = metadata_fields(meta, repo, _now(client.clock))
    if issues:
        result["findings"].extend(issues)
        return result
    sha = meta["sha"]
    result["revision"] = sha
    result["observationScope"] = "Root README.md and root server.py only; not a recursive backend audit"
    raw_base = f"{ORIGIN}/spaces/{repo}" if kind == "space" else f"{ORIGIN}/{repo}"
    read_obs, body = client.get(f"{raw_base}/raw/{sha}/README.md")
    tree, problems = client.pages(f"{ORIGIN}/api/{plural}/{repo}/tree/{sha}?recursive=false&limit=100")
    result.update(bytesRead=len(body), readmeSha256=read_obs["sha256"])
    if read_obs["status"] != 200 or read_obs.get("error"):
        result["findings"].append(f"README unreadable (http {read_obs['status']})")
    try:
        card_text = body.decode("utf-8")
    except UnicodeError:
        card_text = ""
        result["findings"].append("README is not valid UTF-8")
    files, paths = set(), set()
    for item in tree:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str) or not item["path"] or item.get("type") not in ("file", "directory"):
            problems.append("malformed file tree entry")
        elif item["path"] in paths:
            problems.append("duplicate file tree entry")
        else:
            paths.add(item["path"])
            if item["type"] == "file":
                files.add(item["path"])
    result["findings"].extend(problems)
    if not tree or "README.md" not in files:
        result["findings"].append("file tree lacks the observed README.md")
    if result["findings"]:
        return result
    if "no application backend" in card_text.lower() and "server.py" in files:
        result["findings"].append("doc drift: card claims 'no application backend' but tree ships server.py")
    result["status"] = "FINDING" if result["findings"] else "VERIFIED"
    return result


def check_spaces_freshness(org, stale_hours, client, expected=None, creators=None, now=None,
                           profile_space=None):
    validate_threshold(stale_hours)
    now = now or _now(client.clock)
    if expected is None and profile_space is None:
        profile_space = f"{org}/README"
    expected = [f"{org}/{name}" for name in ORG_SPACES] if expected is None else [x if "/" in x else f"{org}/{x}" for x in expected]
    if f"{org}/README" in expected:
        profile_space = f"{org}/README"
        expected = [sid for sid in expected if sid != profile_space]
    creators = CREATOR_SPACES if creators is None else creators
    spaces, findings = client.pages(f"{ORIGIN}/api/spaces?" + urllib.parse.urlencode({"author": org, "limit": "100"}))
    discovered = set()
    for item in spaces:
        sid = item.get("id") if isinstance(item, dict) else None
        if not isinstance(sid, str) or not REPO.fullmatch(sid) or sid.split("/")[0].lower() != org.lower():
            findings.append("org listing contains an invalid or foreign Space id")
        elif sid in discovered:
            findings.append(f"duplicate Space in listing: {sid}")
        else:
            discovered.add(sid)
    if not spaces:
        findings.append("org Space inventory is empty or unreadable")
    for sid in sorted(set(expected) - discovered):
        findings.append(f"expected Space missing from public org inventory: {sid}")
    rows = []
    profiles = {profile_space} if profile_space else set()
    for sid in sorted(discovered | set(expected) | set(creators) | profiles):
        raw_age = None
        obs, meta = client.json(f"{ORIGIN}/api/spaces/{sid}")
        notes, _ = metadata_fields(meta, sid, now)
        row = {"space": sid, "lastModified": None, "ageHours": None, "runtimeStage": None,
               "inventory": "organization-profile" if sid in profiles else "creator" if sid in creators else "expected" if sid in expected else "discovered-extra",
               "listed": sid in discovered, "findings": notes, "status": "INCOMPLETE"}
        if isinstance(meta, dict):
            row["lastModified"] = meta.get("lastModified")
            try:
                raw_age = (now - parse_date(meta.get("lastModified"), now)).total_seconds() / 3600
                row["ageHours"] = round(raw_age, 3)
            except (ValueError, TypeError, OverflowError):
                pass
            runtime = meta.get("runtime")
            if not isinstance(runtime, dict) or not isinstance(runtime.get("stage"), str) or not runtime["stage"].strip():
                notes.append("runtime stage unavailable or malformed")
            else:
                row["runtimeStage"] = runtime["stage"]
        if not notes:
            if raw_age > stale_hours:
                notes.append(f"source metadata age {row['ageHours']}h exceeds {stale_hours}h; this is not an uptime measurement")
            if row["runtimeStage"] not in ("RUNNING", "RUNNING_BUILDING"):
                notes.append(f"provider runtime stage is {row['runtimeStage']}; application availability not verified")
            row["status"] = "FINDING" if notes else "VERIFIED"
        rows.append(row)
        findings.extend(f"{sid}: {note}" for note in notes)
    return rows, findings


def load_input(path, client):
    try:
        body = Path(path).read_bytes()
        if len(body) > MAX_BYTES:
            raise ConfigError(f"input exceeds size bound: {path}")
        provenance = {"path": str(Path(path).resolve()), **client.store(body)}
        return strict_json(body), provenance
    except (OSError, ValueError, UnicodeError) as exc:
        raise ConfigError(f"cannot load input {path}: {exc}") from exc


def load_previous(path, client):
    previous, provenance = load_input(path, client)
    if not isinstance(previous, dict) or previous.get("schema") != SCHEMA:
        raise ConfigError("incompatible prior receipt schema")
    digest = previous.get("receiptDigest")
    core = {k: v for k, v in previous.items() if k != "receiptDigest"}
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest) or canonical_digest(core) != digest:
        raise ConfigError("prior receipt digest mismatch")
    if previous.get("overallStatus") == "CONFIG_ERROR":
        raise ConfigError("prior CONFIG_ERROR receipt cannot establish or repair a chain")
    if type(previous.get("exitCode")) is not int or (previous.get("overallStatus"), previous.get("exitCode")) not in (("VERIFIED", 0), ("INCOMPLETE", 2), ("FINDING", 2)):
        raise ConfigError("invalid prior receipt verdict")
    if not isinstance(previous.get("provenance"), dict) or not isinstance(previous.get("observations"), list):
        raise ConfigError("prior receipt missing required evidence fields")
    try:
        parse_date(previous.get("generatedAt"), _now(client.clock))
    except (ValueError, TypeError, OverflowError) as exc:
        raise ConfigError(f"invalid prior generatedAt: {exc}") from exc
    link = previous.get("prevReceipt")
    if link != "GENESIS" and (not isinstance(link, str) or not re.fullmatch(r"[a-f0-9]{64}", link)):
        raise ConfigError("prior receipt has an unresolved chain link")
    return digest, provenance


def run(wave_path, evidence_dir, *, pins_path=DEFAULT_PINS, prev_receipt=None,
        stale_hours=STALE_HOURS_DEFAULT, transport=None, clock=None,
        expected_spaces=None, creator_spaces=None, card_watch=None, profile_space=None):
    client = EvidenceClient(evidence_dir, transport=transport, clock=clock)
    receipt = {"schema": SCHEMA, "generatedAt": timestamp(_now(clock)),
               "overallStatus": "CONFIG_ERROR", "exitCode": 3,
               "prevReceipt": "UNRESOLVED" if prev_receipt is not None else "GENESIS",
               "provenance": {}, "configurationErrors": [],
               "doctrine": {"lambda": "Conjecture 1; advisory, never a theorem",
                            "evidenceCeiling": 0.97, "lockedProven": "exactly 8 @ c7c0ba17",
                            "productionDisposition": "HOLD", "promotionEffect": "NONE"},
               "boundary": "Anonymous public metadata and card observations only. No model weights, training, serving, quality, security, application contract, uptime, or production-readiness verdict. No remote mutations. Receipt hashes establish local integrity, not independent cryptographic attestation."}
    try:
        validate_threshold(stale_hours)
        receipt["provenance"]["script"] = {"path": str(Path(__file__).resolve()), **client.store(Path(__file__).read_bytes())}
        wave, wave_input = load_input(wave_path, client)
        receipt["provenance"]["wave"] = wave_input
        validate_wave(wave)
        pins, pins_input = load_input(pins_path, client)
        receipt["provenance"]["pins"] = pins_input
        validate_pins(pins, wave)
        if prev_receipt is not None:
            receipt["prevReceipt"], receipt["provenance"]["previousReceipt"] = load_previous(prev_receipt, client)
        commit = os.environ.get("GITHUB_SHA", "")
        if SHA.fullmatch(commit):
            receipt["provenance"]["environmentCommit"] = {"value": commit, "verification": "ENVIRONMENT_CLAIM_ONLY"}
        expected = ORG_SPACES if expected_spaces is None else expected_spaces
        profile_space = ORG_PROFILE_SPACE if expected_spaces is None and profile_space is None else profile_space
        creators = CREATOR_SPACES if creator_spaces is None else creator_spaces
        watches = CARD_TRUTH_WATCH if card_watch is None else card_watch
        for value in list(expected) + list(creators):
            if not isinstance(value, str) or not REPO.fullmatch(value if "/" in value else f"{ORG}/{value}"):
                raise ConfigError("invalid configured Space identity")
        if any(not isinstance(w, (tuple, list)) or len(w) != 2 or w[0] not in ("space", "model") or not isinstance(w[1], str) or not REPO.fullmatch(w[1]) for w in watches):
            raise ConfigError("invalid configured card watch")
        receipt["configuration"] = {"org": ORG, "expectedSpaces": list(expected), "creatorSpaces": list(creators),
                                    "organizationProfileSpace": profile_space,
                                    "cardWatch": list(watches), "staleHours": stale_hours,
                                    "maxPages": client.max_pages, "maxResponseBytes": client.max_bytes,
                                    "transport": "injected" if transport else "anonymous-public-https"}
        rows, findings = verify_wave(wave, client, pins=pins)
        receipt["wave"] = {"id": wave["wave"], "evidences": rows, "findings": findings}
        cards = [check_card_truth(kind, repo, client) for kind, repo in watches]
        receipt["cardTruth"] = cards
        spaces, space_findings = check_spaces_freshness(ORG, stale_hours, client, expected=expected,
                                                      creators=creators, profile_space=profile_space)
        receipt["spaces"] = {"org": ORG, "staleHours": stale_hours, "rows": spaces, "findings": space_findings,
                             "measurement": "Source lastModified age and provider-reported runtime stage; no uptime or application contract probe."}
        all_rows = rows + cards + spaces
        incomplete = bool(client.errors) or any(r["status"] == "INCOMPLETE" for r in all_rows)
        has_findings = bool(findings or space_findings) or any(r["status"] == "FINDING" for r in all_rows)
        receipt["overallStatus"] = "INCOMPLETE" if incomplete else "FINDING" if has_findings else "VERIFIED"
        receipt["exitCode"] = 2 if incomplete or has_findings else 0
    except (ConfigError, OSError, TypeError, ValueError) as exc:
        receipt["configurationErrors"].append(str(exc))
    receipt["observations"] = client.observations
    receipt["transportErrors"] = client.errors
    receipt["receiptDigest"] = canonical_digest(receipt)
    return receipt


class _ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(3, f"CONFIG_ERROR: {message}\n")


def main(argv=None):
    parser = _ArgumentParser(description=__doc__)
    parser.add_argument("--wave", type=Path, default=DEFAULT_WAVE)
    parser.add_argument("--pins", type=Path, default=DEFAULT_PINS)
    parser.add_argument("--receipt", type=Path, default=Path("out/receipt.json"))
    parser.add_argument("--evidence-dir", type=Path, default=Path("out/evidence"))
    parser.add_argument("--prev-receipt", type=Path)
    parser.add_argument("--stale-hours", type=float, default=STALE_HOURS_DEFAULT)
    args = parser.parse_args(argv)
    try:
        receipt = run(args.wave, args.evidence_dir, pins_path=args.pins,
                      prev_receipt=args.prev_receipt, stale_hours=args.stale_hours)
        atomic_write(args.receipt, (json.dumps(receipt, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8"))
    except (OSError, ValueError) as exc:
        print(f"CONFIG_ERROR: {exc}", file=sys.stderr)
        return 3
    print(f"{receipt['overallStatus']}: receipt={args.receipt} digest={receipt['receiptDigest']}; production=HOLD")
    for error in receipt["configurationErrors"]:
        print(f"CONFIG_ERROR: {error}", file=sys.stderr)
    return receipt["exitCode"]


if __name__ == "__main__":
    sys.exit(main())
