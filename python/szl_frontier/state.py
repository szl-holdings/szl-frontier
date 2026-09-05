"""Tiny atomic notification ledger for material Hugging Face changes.

The watcher needs memory only for deduplication.  It therefore persists a
release-id -> fingerprint map rather than remote payloads, prompts, or model
outputs.  Corrupt state fails closed instead of silently re-alerting everything.
"""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from .domain import FrontierError

LEDGER_SCHEMA = "szl.frontier.notification-ledger.v1"


class LedgerError(FrontierError):
    pass


@dataclass(slots=True)
class NotificationLedger:
    fingerprints: dict[str, str] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path) -> "NotificationLedger":
        if not path.exists():
            return cls()
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise LedgerError(f"unable to read notification ledger {path}: {exc}") from exc
        if not isinstance(payload, dict) or payload.get("schema") != LEDGER_SCHEMA:
            raise LedgerError(f"invalid notification ledger schema in {path}")
        fingerprints = payload.get("fingerprints")
        if not isinstance(fingerprints, dict) or not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in fingerprints.items()
        ):
            raise LedgerError("notification ledger fingerprints must be string pairs")
        return cls(dict(fingerprints))

    def changed(self, release_id: str, fingerprint: str) -> bool:
        return self.fingerprints.get(release_id) != fingerprint

    def record(self, release_id: str, fingerprint: str) -> None:
        self.fingerprints[release_id] = fingerprint

    def as_mapping(self) -> Mapping[str, object]:
        return {
            "schema": LEDGER_SCHEMA,
            "fingerprints": dict(sorted(self.fingerprints.items())),
        }

    def save(self, path: Path) -> None:
        """Atomically replace state so an interrupted write cannot corrupt it."""

        path.parent.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(
            self.as_mapping(), sort_keys=True, indent=2, ensure_ascii=False
        ) + "\n"
        fd, temporary = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(serialized)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        except Exception:
            try:
                os.unlink(temporary)
            except OSError:
                pass
            raise
