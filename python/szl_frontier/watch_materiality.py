"""Classified Hub materiality for frontier watch (T28).

This module does not download weights, execute remote code, or authorize
production. It classifies Hub sibling metadata into rights / presentation /
substantive identities and compares fingerprints.

A first observation of a seeded asset is backlog, not a new-release alert.
Card-only churn is quiet. Incomplete identities are UNKNOWN, never "unchanged".
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

LICENSE_NAMES = {"license", "license.txt", "license.md", "notice", "notice.txt", "copying"}
SHA40 = re.compile(r"[0-9a-f]{40}\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
FILE_CLASSES = ("rights", "presentation", "substantive")

FIRST_OBSERVATION = "FIRST_OBSERVATION_NOT_PROOF_OF_NEW_RELEASE"
UNKNOWN_IDENTITIES = "UNKNOWN_INCOMPLETE_ARTIFACT_IDENTITIES"
ACCESS_CHANGE = "ACCESS_CHANGE_REVIEW"
RIGHTS_CHANGE = "RIGHTS_CHANGE_REVIEW"
SUBSTANTIVE_CHANGE = "SUBSTANTIVE_ARTIFACT_CHANGE_REVIEW"
NO_MATERIAL = "NO_MATERIAL_ARTIFACT_CHANGE"

ALERTABLE = frozenset({ACCESS_CHANGE, RIGHTS_CHANGE, SUBSTANTIVE_CHANGE})


class WatchError(RuntimeError):
    """Fail-closed watch comparison error."""


def canonical(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False
    ).encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def classify_file(name: str) -> str:
    base = name.rsplit("/", 1)[-1].lower()
    if base in LICENSE_NAMES or base.startswith("license-"):
        return "rights"
    if base in {"readme.md", ".gitattributes"} or base.endswith(
        (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")
    ):
        return "presentation"
    return "substantive"


def hub_snapshot(payload: Any, expected_id: str, kind: str = "model") -> dict[str, Any]:
    if not isinstance(payload, dict) or payload.get("id", payload.get("modelId")) != expected_id:
        raise WatchError("HUB_IDENTITY_MISMATCH")
    revision = payload.get("sha")
    if not isinstance(revision, str) or not SHA40.fullmatch(revision):
        raise WatchError("HUB_REVISION_UNAVAILABLE")
    rows = payload.get("siblings")
    groups: dict[str, list[dict[str, Any]]] = {key: [] for key in FILE_CLASSES}
    complete = isinstance(rows, list) and len(rows) > 0
    names: set[str] = set()
    for item in rows if isinstance(rows, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("rfilename"), str):
            complete = False
            continue
        name = item["rfilename"]
        if name in names or not name or name.startswith("/") or ".." in name.split("/"):
            raise WatchError("INVALID_OR_DUPLICATE_HUB_FILE")
        names.add(name)
        lfs = item.get("lfs") if isinstance(item.get("lfs"), dict) else {}
        identity = lfs.get("sha256") or lfs.get("oid") or item.get("blobId")
        if isinstance(identity, str) and identity.startswith("sha256:"):
            identity = identity[7:]
        valid_identity = isinstance(identity, str) and re.fullmatch(
            r"(?:[a-f0-9]{40}|[a-f0-9]{64})", identity
        )
        size = item.get("size", lfs.get("size"))
        if not valid_identity or type(size) is not int or size < 0:
            complete = False
        groups[classify_file(name)].append(
            {
                "name": name,
                "oid": identity if valid_identity else None,
                "size": size if type(size) is int and size >= 0 else None,
            }
        )
    fingerprints = {
        key: digest(canonical(sorted(value, key=lambda row: row["name"])))
        for key, value in groups.items()
    }
    flags = {key: payload.get(key) for key in ("private", "gated", "disabled")}
    card = payload.get("cardData") if isinstance(payload.get("cardData"), dict) else {}
    return {
        "id": expected_id,
        "kind": kind,
        "revision": revision,
        "created_at": payload.get("createdAt"),
        "last_modified": payload.get("lastModified"),
        "access_flags": flags,
        "visibility_confirmed_public": flags["private"] is False,
        "license_metadata": card.get("license"),
        "inventory_complete_for_change_detection": bool(complete),
        "file_count": len(names),
        "fingerprints": fingerprints,
        "files": groups,
        "weights_downloaded": False,
        "production_admitted": False,
        "qualification_state": "METADATA_OBSERVATION_ONLY",
    }


def material_delta(previous: dict[str, Any] | None, current: dict[str, Any]) -> str:
    if previous is None:
        return FIRST_OBSERVATION
    if previous.get("id") != current.get("id") or previous.get("kind") != current.get("kind"):
        raise WatchError("COMPARISON_IDENTITY_MISMATCH")
    if (
        previous.get("inventory_complete_for_change_detection") is not True
        or current.get("inventory_complete_for_change_detection") is not True
    ):
        return UNKNOWN_IDENTITIES
    for value in (previous, current):
        fingerprints = value.get("fingerprints")
        if not isinstance(fingerprints, dict) or set(fingerprints) != set(FILE_CLASSES):
            return UNKNOWN_IDENTITIES
        if any(not isinstance(item, str) or not SHA256.fullmatch(item) for item in fingerprints.values()):
            return UNKNOWN_IDENTITIES
    if previous.get("access_flags") != current.get("access_flags"):
        return ACCESS_CHANGE
    a, b = previous.get("fingerprints", {}), current.get("fingerprints", {})
    if previous.get("license_metadata") != current.get("license_metadata") or a.get("rights") != b.get("rights"):
        return RIGHTS_CHANGE
    if a.get("substantive") != b.get("substantive"):
        return SUBSTANTIVE_CHANGE
    return NO_MATERIAL


def alert_key(asset_id: str, delta: str, fingerprint: str | None) -> str:
    return f"{asset_id}|{delta}|{fingerprint or 'none'}"


def should_alert(
    *,
    delta: str,
    seeded: bool,
    already_alerted_key: str | None,
    last_alert_key: str | None,
) -> bool:
    if delta not in ALERTABLE:
        return False
    if seeded and delta == FIRST_OBSERVATION:
        return False
    if already_alerted_key and already_alerted_key == last_alert_key:
        return False
    return True
