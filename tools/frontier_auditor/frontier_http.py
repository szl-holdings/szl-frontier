"""Bounded, read-only provider HTTP transport. Credentials never enter diagnostics."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import importlib
import os
import re
import shutil
import subprocess
import threading
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = "szl-frontier-auditor/3.0.0"
MAX_RESPONSE_BYTES = 24 * 1024 * 1024
MAX_PAGES = 1000
PROVIDER_HOSTS = {"github": "api.github.com", "huggingface": "huggingface.co"}


class AuditError(RuntimeError):
    """A sanitized failure, optionally retaining successfully enumerated pages."""

    def __init__(self, message: str, *, code: str = "REQUEST_FAILED", partial: list | None = None):
        super().__init__(message)
        self.code = code
        self.partial = partial or []


def redact(text: str, secrets=()) -> str:
    result = str(text)
    for secret in secrets:
        if secret:
            result = result.replace(str(secret), "[REDACTED]")
    result = re.sub(r"\b(?:gh[pousr]_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]{15,}|hf_[A-Za-z0-9]{15,})\b", "[REDACTED]", result)
    result = re.sub(r"(?i)(authorization\s*[:=]\s*)(?:(?:bearer|basic)\s+)?[^\s,;\"']+", r"\1[REDACTED]", result)
    result = re.sub(r"(?i)([?&](?:access_token|token|api_key|key|secret)=)[^&#\s]+", r"\1[REDACTED]", result)
    result = re.sub(r"(?i)(https?://)[^/@\s]+@", r"\1[REDACTED]@", result)
    return result


def resolve_credentials() -> tuple[str, str, dict]:
    sources = {"github": "unavailable", "huggingface": "unavailable"}
    github = ""
    hf = ""
    for key in ("GITHUB_TOKEN", "GH_TOKEN"):
        if os.environ.get(key, "").strip():
            github = os.environ[key].strip()
            sources["github"] = "environment:" + key
            break
    if not github and shutil.which("gh"):
        try:
            result = subprocess.run(["gh", "auth", "token", "--hostname", "github.com"], capture_output=True,
                                    text=True, timeout=8, check=False,
                                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            candidate = result.stdout.strip()
            if result.returncode == 0 and candidate and not any(x.isspace() for x in candidate):
                github = candidate
                sources["github"] = "github-cli"
        except (OSError, subprocess.SubprocessError):
            pass
    for key in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACE_TOKEN"):
        if os.environ.get(key, "").strip():
            hf = os.environ[key].strip()
            sources["huggingface"] = "environment:" + key
            break
    if not hf:
        try:
            sdk = importlib.import_module("huggingface_hub")
            candidate = sdk.get_token()
            if isinstance(candidate, str):
                candidate = candidate.strip()
                if candidate and not any(x.isspace() for x in candidate):
                    hf = candidate
                    sources["huggingface"] = "huggingface-sdk"
        except (ImportError, AttributeError, OSError, UnicodeError):
            pass
    return github, hf, sources


def validate_url(url: str, host: str) -> str:
    try:
        parsed = urllib.parse.urlsplit(url)
        accepted = (parsed.scheme == "https" and parsed.hostname == host and parsed.port in (None, 443)
                    and parsed.username is None and parsed.password is None and not parsed.fragment)
    except (ValueError, TypeError):
        accepted = False
    if not accepted:
        raise AuditError("Rejected URL outside the approved HTTPS provider origin", code="UNSAFE_URL")
    return url


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, host: str):
        super().__init__()
        self.host = host

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl, self.host)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def next_link(headers: Any) -> str | None:
    value = next((v for k, v in headers.items() if k.lower() == "link"), "")
    for part in re.split(r",(?=\s*<)", value):
        target = re.match(r"\s*<([^>]+)>", part)
        rel = re.search(r";\s*rel\s*=\s*(?:\"([^\"]+)\"|([^;\s]+))", part, re.I)
        if target and rel and "next" in (rel.group(1) or rel.group(2)).lower().split():
            return target.group(1)
    return None


class Client:
    def __init__(self, token: str = "", provider: str = "github", timeout: float = 20,
                 max_requests: int = 2000):
        if provider not in PROVIDER_HOSTS:
            raise ValueError("Unknown provider")
        if not 0 < timeout <= 120 or not 1 <= max_requests <= 100000:
            raise ValueError("Invalid timeout or request budget")
        self.token = token
        self.provider = provider
        self.host = PROVIDER_HOSTS[provider]
        self.timeout = timeout
        self.max_requests = max_requests
        self.errors: list[dict] = []
        self._stats = {"requests": 0, "retries": 0, "bytes": 0, "errors": 0}
        self._rate_limit: dict = {}
        self._quota_blocked_until = 0.0
        self._lock = threading.Lock()
        self._local = threading.local()

    @property
    def stats(self) -> dict:
        with self._lock:
            return {**self._stats, "max_requests": self.max_requests, "rate_limit": dict(self._rate_limit)}

    @property
    def requests(self) -> int:
        return self.stats["requests"]

    def _fail(self, message: str, code: str, rate_limit: dict | None = None) -> AuditError:
        error = AuditError(redact(message, (self.token,)), code=code)
        if rate_limit:
            error.rate_limit = dict(rate_limit)
        with self._lock:
            self._stats["errors"] += 1
            self.errors.append({"code": code, "detail": str(error), **({"rate_limit": dict(rate_limit)} if rate_limit else {})})
        return error

    def _observe_rate_limit(self, headers: Any, status: int) -> dict:
        values = {str(k).lower(): str(v) for k, v in headers.items()}
        remaining = values.get("x-ratelimit-remaining", "")
        if not remaining.isdigit():
            return {}
        reset = values.get("x-ratelimit-reset", "")
        reset_epoch = None
        reset_at = None
        if reset.isdigit():
            try:
                reset_epoch = int(reset)
                reset_at = datetime.fromtimestamp(reset_epoch, timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
            except (ValueError, OverflowError, OSError):
                reset_epoch = None
        observation = {"remaining": int(remaining), "reset_at": reset_at,
                       "reset_epoch": reset_epoch, "resource": values.get("x-ratelimit-resource"),
                       "limit": int(values["x-ratelimit-limit"]) if values.get("x-ratelimit-limit", "").isdigit() else None}
        now = time.time()
        with self._lock:
            # A slower in-flight success must not overwrite a newer exhaustion latch.
            if self._quota_blocked_until <= now or observation["remaining"] == 0:
                self._rate_limit = observation
            if status in {403, 429} and observation["remaining"] == 0:
                # Missing or stale provider reset times cannot justify immediate retries.
                self._quota_blocked_until = reset_epoch if reset_epoch and reset_epoch > now else float("inf")
        return observation

    def _request(self, url: str) -> tuple[Any, dict]:
        validate_url(url, self.host)
        # Diagnostics intentionally exclude query strings and all response bodies.
        target = urllib.parse.urlsplit(url).path
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json", "Accept-Encoding": "identity"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        if self.provider == "github":
            headers.update({"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
        if not hasattr(self._local, "opener"):
            self._local.opener = urllib.request.build_opener(SameOriginRedirect(self.host))
        for attempt in range(3):
            with self._lock:
                blocked = self._quota_blocked_until > time.time()
                rate_limit = dict(self._rate_limit)
                exhausted = self._stats["requests"] >= self.max_requests
                if not exhausted and not blocked:
                    self._stats["requests"] += 1
                    self._stats["retries"] += int(attempt > 0)
            if blocked:
                raise self._fail("Provider quota exhausted; subsequent requests deferred", "QUOTA_EXHAUSTED", rate_limit)
            if exhausted:
                raise self._fail("Provider request budget exhausted", "REQUEST_BUDGET")
            try:
                req = urllib.request.Request(url, headers=headers, method="GET")
                with self._local.opener.open(req, timeout=self.timeout) as response:
                    validate_url(response.geturl(), self.host)
                    self._observe_rate_limit(response.headers, response.status)
                    raw = response.read(MAX_RESPONSE_BYTES + 1)
                    with self._lock:
                        self._stats["bytes"] += len(raw)
                    if len(raw) > MAX_RESPONSE_BYTES:
                        raise self._fail("Response exceeds bounded size for " + target, "RESPONSE_LIMIT")
                    if response.status == 204:
                        return [], dict(response.headers.items())
                    try:
                        data = json.loads(raw.decode("utf-8"))
                    except (UnicodeError, ValueError) as exc:
                        raise self._fail("Invalid JSON response for " + target, "INVALID_JSON") from None
                    if not isinstance(data, (dict, list)):
                        raise self._fail("Unexpected JSON schema for " + target, "INVALID_SCHEMA")
                    return data, dict(response.headers.items())
            except urllib.error.HTTPError as exc:
                status = exc.code
                retry = exc.headers.get("Retry-After", "") if exc.headers else ""
                rate_limit = self._observe_rate_limit(exc.headers or {}, status)
                exc.close()
                if status in {403, 429} and rate_limit.get("remaining") == 0:
                    raise self._fail("Provider quota exhausted; subsequent requests deferred", "QUOTA_EXHAUSTED", rate_limit) from None
                if status not in {429, 500, 502, 503, 504} or attempt == 2:
                    raise self._fail(f"HTTP {status} for {target}", "HTTP_" + str(status)) from None
                delay = min(2 ** attempt, 5)
                if retry:
                    try:
                        delay = float(retry) if re.fullmatch(r"\d+(?:\.\d+)?", retry) else max(0, parsedate_to_datetime(retry).timestamp() - time.time())
                    except (TypeError, ValueError, OverflowError):
                        raise self._fail("Provider requested an unparseable retry delay; request deferred", "RATE_LIMITED") from None
                    if delay > 5:
                        error = self._fail("Provider retry delay exceeds the bounded wait; request deferred", "RATE_LIMITED")
                        error.wait_seconds = round(delay, 3)
                        raise error from None
                time.sleep(delay)
            except AuditError:
                raise
            except (urllib.error.URLError, TimeoutError, OSError):
                if attempt == 2:
                    raise self._fail("Network request failed for " + target, "NETWORK_ERROR") from None
                time.sleep(2 ** attempt)
        raise self._fail("Request failed for " + target, "REQUEST_FAILED")

    def request(self, url: str) -> Any:
        return self._request(url)[0]

    def pages(self, url: str, key: str | None = None) -> list:
        result: list = []
        seen: set[str] = set()
        while url:
            try:
                validate_url(url, self.host)
                if url in seen or len(seen) >= MAX_PAGES:
                    raise AuditError("Pagination cycle or page limit encountered", code="PAGINATION_LIMIT")
                seen.add(url)
                data, headers = self._request(url)
                items = data.get(key) if isinstance(data, dict) and key else data
                if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
                    raise AuditError("Unexpected paginated response schema", code="INVALID_SCHEMA")
                result.extend(items)
                next_url = next_link(headers)
                url = urllib.parse.urljoin(url, next_url) if next_url else ""
            except AuditError as exc:
                exc.partial = result
                raise
        return result
