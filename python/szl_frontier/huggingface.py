"""Bounded Hugging Face transport and source snapshotting.

Security properties:
* HTTPS only, exact ``huggingface.co`` origin allow-list.
* Bounded response bodies.
* Explicit timeouts and user-agent.
* No authentication headers, shell execution, or arbitrary URLs.
* Redirect targets are revalidated before data is admitted.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

from .domain import FrontierError, FrontierRelease, HF_ORIGIN, SourceSnapshot

DEFAULT_TIMEOUT_SECONDS = 20.0
MAX_RESPONSE_BYTES = 8 * 1024 * 1024
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
    def get(self, url: str, *, accept: str) -> HttpResponse: ...


def _require_hf_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "huggingface.co":
        raise TransportError(f"URL left Hugging Face allow-list: {url}")


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
            with urlopen(request, timeout=self.timeout_seconds) as response:  # noqa: S310 - allow-listed URL
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
                headers = {key.lower(): value for key, value in response.headers.items()}
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
        fingerprint = _sha256_bytes(response.body)
        return SourceSnapshot(
            kind="blog",
            source=response.url,
            revision=fingerprint,
            last_modified=response.headers.get("last-modified"),
            private=False,
            gated=False,
            disabled=False,
            artifact_fingerprint=fingerprint,
            content_bytes=len(response.body),
        )

    def _snapshot_model_inventory(self, author: str) -> SourceSnapshot:
        query = urlencode(
            {
                "author": author,
                "limit": "1000",
                "full": "false",
                "config": "false",
            }
        )
        url = f"{HF_ORIGIN}/api/models?{query}"
        response = self.transport.get(url, accept="application/json")
        _require_hf_url(response.url)
        if response.status != 200:
            raise TransportError(f"unexpected status {response.status} for {url}")
        try:
            payload = json.loads(response.body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise TransportError(f"invalid JSON from {url}") from exc
        if not isinstance(payload, list):
            raise TransportError("model inventory response is not a list")
        rows = sorted(
            (
                {
                    "id": item.get("id", item.get("modelId")),
                    "sha": item.get("sha"),
                    "lastModified": item.get("lastModified"),
                }
                for item in payload
                if isinstance(item, dict) and (item.get("id") or item.get("modelId"))
            ),
            key=lambda row: str(row["id"]),
        )
        last_modified = max(
            (str(row["lastModified"]) for row in rows if row.get("lastModified")),
            default=None,
        )
        fingerprint = _stable_sha256(rows)
        return SourceSnapshot(
            kind="model-inventory",
            source=response.url,
            revision=fingerprint,
            last_modified=last_modified,
            private=False,
            gated=False,
            disabled=False,
            artifact_fingerprint=fingerprint,
            inventory_count=len(rows),
            content_bytes=len(response.body),
        )
