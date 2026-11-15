#!/usr/bin/env python3
# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Wake public Hugging Face Spaces before the outside-seat verifier reads them.

Stdlib only. For each Space, one anonymous metadata read selects its
hf.space host, one anonymous GET wakes it, then
https://huggingface.co/api/spaces/<id> is polled until runtime.stage is
RUNNING. No token, proxy credential, cookie jar, or Hub write is sent.
A Space that is still not RUNNING after about five minutes, or that answers
401 or 404, is left for the verifier. Hub metadata polls are paced so a
fully sleeping estate stays inside a fraction of the anonymous request
window, and an HTTP 429 stops further Hub polls. The verifier keeps its
own verdict and the production HOLD.

The Space list is the verifier's configured organization Spaces, creator
Spaces and profile Space, plus public Spaces from the same organization
listing. Names are not copied here.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import http.client
import importlib.util
import json
import math
import re
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

USER_AGENT = "szl-estate-space-wake/1.0 (anonymous; read-only)"
TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 10
REQUEST_TIMEOUT_SECONDS = 20
DEFAULT_WORKERS = 64
API_MAX_BYTES = 4 * 1024 * 1024
WAKE_MAX_BYTES = 64 * 1024
MAX_POLLS = 1000
API_ORIGIN = "https://huggingface.co"
TOKEN_QUERY_KEYS = frozenset({"token", "access_token", "authorization", "hf_token"})
DNS_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
WAKE_HOST = re.compile(
    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.static)?\.hf\.space\Z"
)
TERMINAL_HTTP = frozenset({401, 404})
# Unauthenticated Hub requests are limited to a few hundred per five minutes
# per address. This caps the wake step's detail reads so the verifier that
# runs next still has room in that window. Org listing pages are separate
# and are already bounded by the verifier's page limit.
HUB_DETAIL_BUDGET = 180


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@dataclass
class WakeResult:
    space: str
    stage: str | None = None
    http_status: int | None = None
    wake_url: str | None = None
    wake_status: int | None = None
    reached_running: bool = False
    timed_out: bool = False
    polls: int = 0
    error: str | None = None


@dataclass
class WakeReport:
    results: list[WakeResult]
    discovery_errors: list[str]


def load_verifier():
    """Load the outside-seat verifier module without running it."""
    name = "estate_outside_seat"
    module = sys.modules.get(name)
    if module is not None and hasattr(module, "ORG_SPACES") and hasattr(module, "HttpResponse"):
        return module
    path = Path(__file__).resolve().parent / "estate_outside_seat.py"
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load verifier module from {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def expected_subdomain(space_id: str) -> str:
    """Hugging Face Space host label: lowercase, with / . and _ turned into hyphens."""
    label = space_id.lower().replace("/", "-").replace(".", "-").replace("_", "-")
    if not DNS_LABEL.fullmatch(label):
        raise ValueError(f"space id does not form an hf.space host: {space_id}")
    return label


def normalize_origin(url: str) -> str | None:
    if not isinstance(url, str) or any(ord(char) < 33 for char in url) or "\\" in url:
        return None
    parts = urllib.parse.urlsplit(url)
    if (
        parts.scheme != "https"
        or parts.username
        or parts.password
        or parts.fragment
        or parts.query
        or parts.port not in (None, 443)
        or parts.path not in ("", "/")
        or not parts.hostname
    ):
        return None
    return f"https://{parts.hostname}/"


def select_wake_url(space_id: str, metadata: dict | None) -> str:
    """Pick this Space's own hf.space origin, never a host supplied for another id."""
    subdomain = expected_subdomain(space_id)
    fallback = f"https://{subdomain}.hf.space/"
    if not isinstance(metadata, dict) or metadata.get("id") != space_id:
        return fallback
    if metadata.get("subdomain") != subdomain:
        return fallback
    host = metadata.get("host")
    if not isinstance(host, str):
        return fallback
    normalized = normalize_origin(host)
    if normalized in {fallback, f"https://{subdomain}.static.hf.space/"}:
        return normalized
    return fallback


def validate_request_url(url: str) -> str:
    if not isinstance(url, str) or any(ord(char) < 33 for char in url) or "\\" in url:
        raise ValueError("invalid public URL")
    parts = urllib.parse.urlsplit(url)
    if (
        parts.scheme != "https"
        or parts.username
        or parts.password
        or parts.fragment
        or parts.port not in (None, 443)
    ):
        raise ValueError("invalid public URL")
    if any(segment in (".", "..") for segment in parts.path.split("/")):
        raise ValueError("URL contains a relative path segment")
    host = parts.hostname or ""
    if host == "huggingface.co":
        if parts.path != "/api/spaces" and not parts.path.startswith("/api/spaces/"):
            raise ValueError("only the public Spaces API is permitted")
        query = urllib.parse.parse_qs(parts.query, keep_blank_values=True)
        if any(key.lower() in TOKEN_QUERY_KEYS for key in query):
            raise ValueError("token query is not permitted")
        return url
    if WAKE_HOST.fullmatch(host) and parts.path in ("", "/") and not parts.query:
        return url
    raise ValueError("only anonymous Hugging Face Space hosts are permitted")


def api_url(space_id: str) -> str:
    return f"{API_ORIGIN}/api/spaces/{urllib.parse.quote(space_id, safe='/')}"


def http_get(url, max_bytes=None):
    """Anonymous GET. No proxy, no redirects, no ambient token or cookie jar."""
    estate = load_verifier()
    validate_request_url(url)
    parts = urllib.parse.urlsplit(url)
    limit = API_MAX_BYTES if parts.hostname == "huggingface.co" else WAKE_MAX_BYTES
    if max_bytes is not None:
        limit = max_bytes
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json" if parts.hostname == "huggingface.co" else "*/*",
            "Accept-Encoding": "identity",
        },
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
    response = None
    try:
        try:
            response = opener.open(request, timeout=REQUEST_TIMEOUT_SECONDS)
        except urllib.error.HTTPError as exc:
            response = exc
        body = response.read(limit + 1)
        truncated = len(body) > limit
        if truncated:
            body = body[:limit]
        try:
            headers = {str(key): str(value) for key, value in dict(response.headers).items()}
        except (TypeError, ValueError):
            headers = {}
        error = "response byte bound exceeded" if truncated and parts.hostname == "huggingface.co" else None
        status = response.status if isinstance(getattr(response, "status", None), int) else response.code
        return estate.HttpResponse(status, body, headers, url, error=error, truncated=truncated)
    except (OSError, urllib.error.URLError, http.client.HTTPException, TimeoutError) as exc:
        status = 0
        if response is not None and isinstance(getattr(response, "status", None), int):
            status = response.status
        return estate.HttpResponse(
            status, b"", {}, url, error=f"{type(exc).__name__}: {exc}", truncated=response is not None
        )
    finally:
        if response is not None:
            response.close()


def runtime_stage(metadata: dict | None) -> str | None:
    if not isinstance(metadata, dict):
        return None
    runtime = metadata.get("runtime")
    if not isinstance(runtime, dict):
        return None
    stage = runtime.get("stage")
    if isinstance(stage, str) and stage.strip() and stage == stage.strip():
        return stage
    return None


def read_space(get, space_id: str) -> tuple[int, dict | None]:
    response = get(api_url(space_id))
    status = response.status if type(response.status) is int else 0
    # A non-200 body is not metadata, even when it is a JSON object.
    if status != 200 or getattr(response, "error", None):
        return status, None
    try:
        data = json.loads(response.body.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError, AttributeError, TypeError):
        return status, None
    if not isinstance(data, dict):
        return status, None
    return status, data


def validate_timing(timeout_seconds, poll_interval_seconds) -> None:
    for name, value in (("timeout", timeout_seconds), ("poll interval", poll_interval_seconds)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
            raise ValueError(f"{name} must be finite and greater than zero")


def polls_until_timeout(timeout_seconds, poll_interval_seconds) -> int:
    """How many stage polls one sleeping Space performs before its deadline."""
    now = 0.0
    polls = 0
    while polls < MAX_POLLS:
        polls += 1
        if now >= timeout_seconds:
            return polls
        now += min(poll_interval_seconds, timeout_seconds - now)
    return polls


def paced_poll_interval(space_count, timeout_seconds, poll_interval_seconds, budget=HUB_DETAIL_BUDGET):
    """Slow the poll when many Spaces would otherwise exhaust the Hub window.

    One sleeping Space keeps the requested interval. A full estate is stretched
    toward the per-Space timeout so lookup plus stage polls stay within budget.
    """
    if space_count <= 1:
        return poll_interval_seconds

    def calls(interval):
        return space_count * (1 + polls_until_timeout(timeout_seconds, interval))

    if calls(poll_interval_seconds) <= budget:
        return poll_interval_seconds
    if calls(timeout_seconds) > budget:
        return timeout_seconds
    lo, hi = poll_interval_seconds, timeout_seconds
    for _ in range(40):
        mid = (lo + hi) / 2
        if calls(mid) <= budget:
            hi = mid
        else:
            lo = mid
    if calls(hi) > budget:
        return timeout_seconds
    return hi


def _mark_rate_limit(stop) -> None:
    if stop is not None:
        stop.set()


def _record_wake(result, get, space_id, metadata) -> None:
    result.wake_url = select_wake_url(space_id, metadata)
    woken = get(result.wake_url)
    result.wake_status = woken.status if type(getattr(woken, "status", None)) is int else 0


def wake_one(space_id, *, get, sleep, monotonic, timeout_seconds, poll_interval_seconds, stop=None) -> WakeResult:
    result = WakeResult(space=space_id)
    try:
        if stop is not None and stop.is_set():
            _record_wake(result, get, space_id, None)
            result.error = "hub rate limit"
            return result
        status, metadata = read_space(get, space_id)
        _record_wake(result, get, space_id, metadata)
        if status == 429:
            _mark_rate_limit(stop)
            result.http_status = 429
            result.error = "hub rate limit"
            return result
        deadline = monotonic() + timeout_seconds
        while result.polls < MAX_POLLS:
            if stop is not None and stop.is_set():
                result.error = "hub rate limit"
                return result
            status, metadata = read_space(get, space_id)
            result.polls += 1
            result.http_status = status
            result.stage = runtime_stage(metadata)
            if result.stage == "RUNNING":
                result.reached_running = True
                return result
            if status == 429:
                _mark_rate_limit(stop)
                result.error = "hub rate limit"
                return result
            # Private or absent metadata will not grow a runtime stage from a wake.
            if status in TERMINAL_HTTP:
                return result
            now = monotonic()
            if now >= deadline:
                result.timed_out = True
                return result
            sleep(min(poll_interval_seconds, deadline - now))
        result.error = "poll bound exceeded"
        return result
    except Exception as exc:
        result.error = f"{type(exc).__name__}: {exc}"
        return result


def configured_space_ids(verifier=None) -> list[str]:
    """Ids the verifier is configured to check, read from that module."""
    verifier = verifier or load_verifier()
    values = [f"{verifier.ORG}/{name}" for name in verifier.ORG_SPACES]
    values.extend(verifier.CREATOR_SPACES)
    if verifier.ORG_PROFILE_SPACE:
        values.append(verifier.ORG_PROFILE_SPACE)
    return _accept_ids(verifier, values, restrict_to_org=False)


def _accept_ids(verifier, values, *, restrict_to_org: bool) -> list[str]:
    seen = set()
    accepted = []
    org = str(verifier.ORG).lower()
    for space_id in values:
        if not isinstance(space_id, str) or space_id in seen or not verifier.REPO.fullmatch(space_id):
            continue
        if restrict_to_org and space_id.split("/", 1)[0].lower() != org:
            continue
        try:
            expected_subdomain(space_id)
        except ValueError:
            continue
        seen.add(space_id)
        accepted.append(space_id)
    return sorted(accepted)


def discover_public_space_ids(verifier, get) -> tuple[list[str], list[str]]:
    """Public org Spaces, using the verifier's own bounded listing client."""
    url = f"{verifier.ORIGIN}/api/spaces?" + urllib.parse.urlencode({"author": verifier.ORG, "limit": "100"})
    with tempfile.TemporaryDirectory() as tmp:
        client = verifier.EvidenceClient(tmp, transport=get)
        items, errors = client.pages(url)
    found = []
    for item in items:
        space_id = item.get("id") if isinstance(item, dict) else None
        if isinstance(space_id, str):
            found.append(space_id)
    return found, [str(error) for error in errors]


def merge_space_ids(verifier, discovered) -> list[str]:
    configured = configured_space_ids(verifier)
    extra = _accept_ids(verifier, discovered, restrict_to_org=True)
    return sorted(set(configured) | set(extra))


def wake_all(space_ids, *, get, sleep, monotonic, timeout_seconds, poll_interval_seconds,
             max_workers, verifier=None) -> list[WakeResult]:
    verifier = verifier or load_verifier()
    space_ids = list(space_ids)
    accepted = set(_accept_ids(verifier, space_ids, restrict_to_org=False))
    ordered = []
    seen = set()
    for space_id in space_ids:
        if not isinstance(space_id, str) or space_id in seen:
            continue
        seen.add(space_id)
        ordered.append(space_id)
    ordered.sort()
    results = []
    pending = []
    for space_id in ordered:
        if space_id not in accepted:
            results.append(WakeResult(space=space_id, error="invalid space id"))
            continue
        pending.append(space_id)

    interval = paced_poll_interval(len(pending), timeout_seconds, poll_interval_seconds)
    stop = threading.Event()

    def start(space_id):
        return wake_one(
            space_id,
            get=get,
            sleep=sleep,
            monotonic=monotonic,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=interval,
            stop=stop,
        )

    if max_workers <= 1 or len(pending) <= 1:
        results.extend(start(space_id) for space_id in pending)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(max_workers, len(pending))) as pool:
            futures = [pool.submit(start, space_id) for space_id in pending]
            results.extend(future.result() for future in futures)
    return sorted(results, key=lambda item: item.space)


def run(get, *, sleep, monotonic, timeout_seconds=TIMEOUT_SECONDS,
        poll_interval_seconds=POLL_INTERVAL_SECONDS, max_workers=DEFAULT_WORKERS,
        discover=True) -> WakeReport:
    validate_timing(timeout_seconds, poll_interval_seconds)
    if type(max_workers) is not int or max_workers < 1:
        raise ValueError("workers must be a positive integer")
    verifier = load_verifier()
    discovered: list[str] = []
    discovery_errors: list[str] = []
    if discover:
        try:
            discovered, discovery_errors = discover_public_space_ids(verifier, get)
        except Exception as exc:
            discovery_errors = [f"{type(exc).__name__}: {exc}"]
    space_ids = merge_space_ids(verifier, discovered)
    results = wake_all(
        space_ids,
        get=get,
        sleep=sleep,
        monotonic=monotonic,
        timeout_seconds=timeout_seconds,
        poll_interval_seconds=poll_interval_seconds,
        max_workers=min(max_workers, 64),
        verifier=verifier,
    )
    return WakeReport(results=results, discovery_errors=discovery_errors)


def format_result(result: WakeResult) -> str:
    if result.reached_running:
        state = "RUNNING"
    elif result.timed_out:
        state = f"timeout stage={result.stage or 'unavailable'}"
    elif result.http_status in TERMINAL_HTTP:
        state = f"http {result.http_status}"
    elif result.error:
        state = "error"
    else:
        state = f"stage={result.stage or 'unavailable'}"
    return (
        f"wake {result.space}: {state} polls={result.polls} "
        f"wake={result.wake_url or '-'} http={result.wake_status}"
    )


def main(argv=None, *, get=None, sleep=None, monotonic=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout-seconds", type=float, default=TIMEOUT_SECONDS)
    parser.add_argument("--poll-interval-seconds", type=float, default=POLL_INTERVAL_SECONDS)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    args = parser.parse_args(argv)
    try:
        report = run(
            get or http_get,
            sleep=sleep or time.sleep,
            monotonic=monotonic or time.monotonic,
            timeout_seconds=args.timeout_seconds,
            poll_interval_seconds=args.poll_interval_seconds,
            max_workers=args.workers,
        )
    except ValueError as exc:
        print(f"wake: {exc}", file=sys.stderr)
        return 1
    for result in report.results:
        print(format_result(result))
        if result.error:
            print(f"wake {result.space}: {result.error}", file=sys.stderr)
    for error in report.discovery_errors:
        print(f"wake listing: {error}", file=sys.stderr)
    running = sum(1 for result in report.results if result.reached_running)
    print(f"wake: {running}/{len(report.results)} RUNNING; the verifier decides the receipt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
