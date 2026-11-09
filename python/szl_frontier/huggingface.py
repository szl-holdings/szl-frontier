"""Bounded Hugging Face transport and source snapshotting.

Security properties:
* HTTPS only, exact ``huggingface.co`` origin allow-list.
* Bounded response bodies.
* Explicit timeouts and user-agent.
* No authentication headers, shell execution, or arbitrary URLs.
* Redirect targets are revalidated before the next request is sent.
* Public model inventories follow cursor pages within the original query,
  bounded to 20 pages and 8 MiB in aggregate; incomplete traversals raise.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import parse_qsl, quote, urlencode, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from .domain import FrontierError, FrontierRelease, HF_ORIGIN, SourceSnapshot
from .watch_materiality import WatchError, hub_snapshot

DEFAULT_TIMEOUT_SECONDS = 20.0
MAX_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_INVENTORY_BYTES = MAX_RESPONSE_BYTES
MAX_INVENTORY_PAGES = 20
MAX_LINK_HEADER_BYTES = 64 * 1024
USER_AGENT = "SZL-Frontier-Python/1.0 (+https://github.com/szl-holdings/szl-frontier)"


class TransportError(FrontierError):
    """Raised when a remote Hugging Face source cannot be safely collected."""


@dataclass(frozen=True, slots=True)
class HttpResponse:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes


class Transport(Protocol):
    def get(self, url: str, *, accept: str) -> HttpResponse:
        raise NotImplementedError


def _require_hf_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "huggingface.co":
        raise TransportError(f"URL left Hugging Face allow-list: {url}")


class _HuggingFaceRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # urllib resolves relative Location values before this hook. Check every
        # destination before the default handler constructs and sends that hop.
        _require_hf_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class StdlibTransport:
    """Small, dependency-free HTTP transport with response-size enforcement."""

    def __init__(
        self,
        *,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        max_response_bytes: int = MAX_RESPONSE_BYTES,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        if max_response_bytes <= 0:
            raise ValueError("max_response_bytes must be positive")
        self.timeout_seconds = timeout_seconds
        self.max_response_bytes = max_response_bytes

    def get(self, url: str, *, accept: str) -> HttpResponse:
        _require_hf_url(url)
        request = Request(
            url,
            headers={"Accept": accept, "User-Agent": USER_AGENT},
            method="GET",
        )
        try:
            opener = build_opener(_HuggingFaceRedirectHandler())
            with opener.open(request, timeout=self.timeout_seconds) as response:  # noqa: S310 - allow-listed URL
                final_url = response.geturl()
                _require_hf_url(final_url)
                length = response.headers.get("Content-Length")
                if length is not None and int(length) > self.max_response_bytes:
                    raise TransportError(
                        f"response exceeds {self.max_response_bytes} bytes"
                    )
                body = response.read(self.max_response_bytes + 1)
                if len(body) > self.max_response_bytes:
                    raise TransportError(
                        f"response exceeds {self.max_response_bytes} bytes"
                    )
                headers: dict[str, str] = {}
                for key, value in response.headers.items():
                    key = key.lower()
                    # Link can appear more than once. Keeping only the final
                    # field can erase rel=next and falsely finish an inventory.
                    headers[key] = f"{headers[key]}, {value}" if key == "link" and key in headers else value
                return HttpResponse(
                    url=final_url,
                    status=int(response.status),
                    headers=headers,
                    body=body,
                )
        except TransportError:
            raise
        except Exception as exc:  # urllib raises several implementation-specific errors
            raise TransportError(f"Hugging Face request failed for {url}: {exc}") from exc


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _split_link_parts(value: str, separator: str) -> list[str]:
    """Split Link grammar without treating quoted/URI commas as separators."""
    parts: list[str] = []
    start = 0
    quoted = bracketed = escaped = False
    for index, char in enumerate(value):
        if escaped:
            escaped = False
        elif quoted:
            if char == "\\":
                escaped = True
            elif char == '"':
                quoted = False
        elif bracketed:
            if char == ">":
                bracketed = False
            elif char == "<":
                raise TransportError("malformed inventory Link header")
        elif char == '"':
            quoted = True
        elif char == "<":
            bracketed = True
        elif char == ">":
            raise TransportError("malformed inventory Link header")
        elif char == separator:
            parts.append(value[start:index].strip())
            start = index + 1
    parts.append(value[start:].strip())
    if quoted or bracketed or escaped or any(not part for part in parts):
        raise TransportError("malformed inventory Link header")
    return parts


def _inventory_next_link(headers: dict[str, str], response_url: str) -> str | None:
    values = [value for name, value in headers.items() if name.lower() == "link"]
    if not values:
        return None
    value = ", ".join(values)
    if len(value.encode("utf-8")) > MAX_LINK_HEADER_BYTES or any(ord(c) < 32 and c != "\t" for c in value):
        raise TransportError("invalid or oversized inventory Link header")
    next_url = None
    token = r"[!#$%&'*+.^_`|~0-9A-Za-z-]+"
    for link in _split_link_parts(value, ","):
        target, *parameters = _split_link_parts(link, ";")
        if not re.fullmatch(r"<[^<>\s]+>", target):
            raise TransportError("malformed inventory Link target")
        attributes: dict[str, str] = {}
        for parameter in parameters:
            matched = re.fullmatch(rf'({token})\s*=\s*({token}|"(?:[^"\\]|\\.)*")', parameter)
            if not matched:
                raise TransportError("malformed inventory Link parameter")
            name, content = matched.groups()
            name = name.lower()
            if name in attributes:
                raise TransportError("duplicate inventory Link parameter")
            if content.startswith('"'):
                content = re.sub(r"\\(.)", r"\1", content[1:-1])
            attributes[name] = content
        if not attributes.get("rel"):
            raise TransportError("inventory Link is missing rel")
        if "next" in attributes["rel"].lower().split():
            if next_url is not None or "anchor" in attributes:
                raise TransportError("ambiguous inventory next Link")
            try:
                next_url = urljoin(response_url, target[1:-1])
            except ValueError as exc:
                raise TransportError("invalid inventory Link URL") from exc
    return next_url


def _inventory_url_key(url: str, author: str) -> tuple[tuple[str, str], ...]:
    """Keep cursor traversal within the exact original inventory query."""
    _require_hf_url(url)
    parsed = urlparse(url)
    if parsed.path != "/api/models" or parsed.params or parsed.fragment or any(ord(c) <= 32 or ord(c) == 127 for c in url):
        raise TransportError("model inventory pagination left its endpoint")
    try:
        pairs = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
    except ValueError as exc:
        raise TransportError("invalid inventory pagination query") from exc
    query = dict(pairs)
    expected = {"author": author, "limit": "1000", "full": "false", "config": "false"}
    if len(pairs) != len(query) or set(query) - (set(expected) | {"cursor"}):
        raise TransportError("ambiguous inventory pagination query")
    if any(query.get(key) != value for key, value in expected.items()) or ("cursor" in query and not query["cursor"]):
        raise TransportError("model inventory pagination changed its query scope")
    return tuple(sorted(pairs))


def _unique_inventory_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate inventory JSON key")
        result[key] = value
    return result


def _reject_inventory_constant(value: str) -> None:
    raise ValueError("non-finite inventory JSON number")


def _finite_inventory_float(value: str) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("non-finite inventory JSON number")
    return result


def _inventory_metadata_text(item: dict, key: str) -> str | None:
    value = item.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise TransportError(f"model inventory {key} must be nonempty text or null")
    try:
        value.encode("utf-8")
    except UnicodeError as exc:
        raise TransportError(f"model inventory {key} is not valid UTF-8 text") from exc
    return value


def _artifact_rows(payload: dict) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for item in payload.get("siblings", []) if isinstance(payload, dict) else []:
        if not isinstance(item, dict) or not isinstance(item.get("rfilename"), str):
            continue
        lfs = item.get("lfs") if isinstance(item.get("lfs"), dict) else {}
        rows.append(
            {
                "name": item["rfilename"],
                "size": item.get("size", lfs.get("size")),
                "oid": lfs.get("oid", item.get("blobId")),
            }
        )
    return sorted(rows, key=lambda row: str(row["name"]))


def _stable_sha256(value: object) -> str:
    payload = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return _sha256_bytes(payload)


class HuggingFaceClient:
    """Translate Hugging Face source metadata into normalized snapshots."""

    def __init__(self, transport: Transport | None = None) -> None:
        self.transport = transport or StdlibTransport()

    def snapshot(self, release: FrontierRelease) -> SourceSnapshot:
        kind = release.watch.kind
        if kind in {"model", "dataset"}:
            if not release.watch.repo_id:
                raise TransportError(f"{release.id} is missing watch.repo_id")
            return self._snapshot_repo(kind, release.watch.repo_id)
        if kind == "blog":
            return self._snapshot_blog(release.artifact_source)
        if kind == "model-inventory":
            if not release.watch.author:
                raise TransportError(f"{release.id} is missing watch.author")
            return self._snapshot_model_inventory(release.watch.author)
        raise TransportError(f"unsupported Hugging Face watch kind: {kind}")

    def _snapshot_repo(self, kind: str, repo_id: str) -> SourceSnapshot:
        plural = "models" if kind == "model" else "datasets"
        safe_repo_id = "/".join(quote(part, safe="") for part in repo_id.split("/"))
        url = f"{HF_ORIGIN}/api/{plural}/{safe_repo_id}"
        response = self.transport.get(url, accept="application/json")
        _require_hf_url(response.url)
        if response.status != 200:
            raise TransportError(f"unexpected status {response.status} for {url}")
        try:
            payload = json.loads(response.body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise TransportError(f"invalid JSON from {url}") from exc
        if not isinstance(payload, dict):
            raise TransportError(f"expected object response from {url}")
        card_data = payload.get("cardData") if isinstance(payload.get("cardData"), dict) else {}
        classified_fingerprints = None
        inventory_complete = None
        try:
            classified = hub_snapshot(payload, repo_id, kind)
            classified_fingerprints = classified.get("fingerprints")
            inventory_complete = classified.get("inventory_complete_for_change_detection")
        except WatchError:
            classified_fingerprints = None
            inventory_complete = None
        return SourceSnapshot(
            kind=kind,
            source=response.url,
            revision=payload.get("sha"),
            created_at=payload.get("createdAt"),
            last_modified=payload.get("lastModified"),
            private=bool(payload.get("private")),
            gated=bool(payload.get("gated")),
            disabled=bool(payload.get("disabled")),
            downloads=(int(payload["downloads"]) if isinstance(payload.get("downloads"), int) else None),
            likes=(int(payload["likes"]) if isinstance(payload.get("likes"), int) else None),
            pipeline_tag=payload.get("pipeline_tag"),
            library_name=payload.get("library_name"),
            license=card_data.get("license"),
            artifact_fingerprint=_stable_sha256(_artifact_rows(payload)),
            content_bytes=len(response.body),
            classified_fingerprints=classified_fingerprints,
            inventory_complete=inventory_complete,
        )

    def _snapshot_blog(self, source: str) -> SourceSnapshot:
        _require_hf_url(source)
        if not urlparse(source).path.startswith("/blog/"):
            raise TransportError("blog watch source must be a Hugging Face /blog/ URL")
        response = self.transport.get(
            source,
            accept="text/html,application/xhtml+xml",
        )
        _require_hf_url(response.url)
        if response.status != 200:
            raise TransportError(f"unexpected status {response.status} for {source}")
        lower = response.body[:4096].lower()
        if b"<html" not in lower and b"<!doctype html" not in lower:
            raise TransportError("blog response does not look like HTML")
        try:
            html = response.body.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise TransportError("blog response is not valid UTF-8") from exc
        main_matches = re.findall(
            r"<main\b[^>]*>[\s\S]*?</main>",
            html,
            flags=re.IGNORECASE,
        )
        if len(main_matches) != 1:
            raise TransportError(
                "blog response must contain exactly one canonical main element"
            )
        canonical_main = main_matches[0].encode("utf-8")
        fingerprint = _sha256_bytes(canonical_main)
        return SourceSnapshot(
            kind="blog",
            source=response.url,
            revision=fingerprint,
            last_modified=response.headers.get("last-modified"),
            private=False,
            gated=False,
            disabled=False,
            artifact_fingerprint=fingerprint,
            content_bytes=len(canonical_main),
        )

    def _snapshot_model_inventory(self, author: str) -> SourceSnapshot:
        # This is a bounded anonymous traversal, not an atomic Hub snapshot.
        # Any incomplete or ambiguous traversal raises before emitting a hash.
        query = urlencode(
            {
                "author": author,
                "limit": "1000",
                "full": "false",
                "config": "false",
            }
        )
        url = f"{HF_ORIGIN}/api/models?{query}"
        source = url
        rows: list[dict[str, object]] = []
        seen_ids: set[str] = set()
        seen_pages: set[tuple[tuple[str, str], ...]] = set()
        content_bytes = 0
        pages = 0
        while url is not None:
            page_key = _inventory_url_key(url, author)
            if page_key in seen_pages or pages >= MAX_INVENTORY_PAGES:
                raise TransportError("inventory pagination cycle or page limit")
            seen_pages.add(page_key)
            response = self.transport.get(url, accept="application/json")
            final_key = _inventory_url_key(response.url, author)
            if final_key != page_key:
                raise TransportError("inventory pagination redirected to a different page")
            pages += 1
            if response.status != 200:
                raise TransportError(f"unexpected status {response.status} for {url}")
            content_bytes += len(response.body)
            if content_bytes > MAX_INVENTORY_BYTES:
                raise TransportError("model inventory exceeds aggregate byte limit")
            try:
                payload = json.loads(
                    response.body.decode("utf-8"),
                    object_pairs_hook=_unique_inventory_object,
                    parse_constant=_reject_inventory_constant,
                    parse_float=_finite_inventory_float,
                )
            except (UnicodeError, ValueError, RecursionError) as exc:
                raise TransportError(f"invalid JSON from {url}") from exc
            if not isinstance(payload, list):
                raise TransportError("model inventory response is not a list")
            for item in payload:
                if not isinstance(item, dict):
                    raise TransportError("model inventory contains a malformed row")
                repo_id = item.get("id", item.get("modelId"))
                if (not isinstance(repo_id, str)
                        or not re.fullmatch(r"[\w.-]+/[\w.-]+", repo_id)
                        or repo_id.split("/")[0].casefold() != author.casefold()):
                    raise TransportError("model inventory contains an invalid or out-of-scope ID")
                if "id" in item and "modelId" in item and item["id"] != item["modelId"]:
                    raise TransportError("model inventory contains ambiguous IDs")
                if repo_id.casefold() in seen_ids:
                    raise TransportError("model inventory contains duplicate IDs")
                seen_ids.add(repo_id.casefold())
                rows.append({
                    "id": repo_id,
                    "sha": _inventory_metadata_text(item, "sha"),
                    "lastModified": _inventory_metadata_text(item, "lastModified"),
                })
            url = _inventory_next_link(response.headers, response.url)
        rows.sort(key=lambda row: str(row["id"]))
        last_modified = max(
            (str(row["lastModified"]) for row in rows if row.get("lastModified")),
            default=None,
        )
        fingerprint = _stable_sha256(rows)
        return SourceSnapshot(
            kind="model-inventory",
            source=source,
            revision=fingerprint,
            last_modified=last_modified,
            private=False,
            gated=False,
            disabled=False,
            artifact_fingerprint=fingerprint,
            inventory_count=len(rows),
            content_bytes=content_bytes,
        )
