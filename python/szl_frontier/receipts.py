"""Deterministic evidence receipts for frontier evaluations.

Receipts are intentionally boring cryptography: canonical JSON, SHA-256 content
addresses, and optional HMAC-SHA256 authentication supplied by the caller.  The
module never reads keys from disk or environment variables; secret ownership is
left to the execution boundary (GitHub Actions, A11oy, or an operator session).
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

from .domain import FrontierError

RECEIPT_SCHEMA = "szl.frontier.evidence-receipt.v1"


class ReceiptError(FrontierError):
    """Raised when a receipt is malformed or fails verification."""


def canonical_json(value: object) -> bytes:
    """Return one stable UTF-8 representation suitable for hashing/signing."""

    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def sha256_hex(value: bytes | str | object) -> str:
    """Hash text, bytes, or a JSON-serializable object with SHA-256."""

    if isinstance(value, bytes):
        payload = value
    elif isinstance(value, str):
        payload = value.encode("utf-8")
    else:
        payload = canonical_json(value)
    return hashlib.sha256(payload).hexdigest()


@dataclass(frozen=True, slots=True)
class ReceiptSignature:
    algorithm: str
    key_id: str
    value: str

    def as_mapping(self) -> dict[str, str]:
        return {
            "algorithm": self.algorithm,
            "keyId": self.key_id,
            "value": self.value,
        }


@dataclass(frozen=True, slots=True)
class EvidenceReceipt:
    """Content-addressed record of one frontier observation or assessment."""

    receipt_id: str
    release_id: str
    created_at: str
    subject: str
    payload_digest: str
    payload: Mapping[str, Any]
    previous_receipt_digest: str | None = None
    signature: ReceiptSignature | None = None
    schema: str = RECEIPT_SCHEMA

    def unsigned_mapping(self) -> dict[str, Any]:
        """Canonical fields covered by the optional signature."""

        return {
            "schema": self.schema,
            "receiptId": self.receipt_id,
            "releaseId": self.release_id,
            "createdAt": self.created_at,
            "subject": self.subject,
            "payloadDigest": self.payload_digest,
            "payload": dict(self.payload),
            "previousReceiptDigest": self.previous_receipt_digest,
        }

    def as_mapping(self) -> dict[str, Any]:
        value = self.unsigned_mapping()
        value["signature"] = self.signature.as_mapping() if self.signature else None
        value["receiptDigest"] = self.digest
        return value

    @property
    def digest(self) -> str:
        """Digest the receipt including signature, excluding derived digest field."""

        value = self.unsigned_mapping()
        value["signature"] = self.signature.as_mapping() if self.signature else None
        return sha256_hex(value)

    def verify(self, *, hmac_key: bytes | None = None) -> None:
        """Fail closed on payload drift and, when present, signature mismatch."""

        if self.schema != RECEIPT_SCHEMA:
            raise ReceiptError(f"unsupported receipt schema: {self.schema}")
        expected_payload = sha256_hex(self.payload)
        if not hmac.compare_digest(expected_payload, self.payload_digest):
            raise ReceiptError("receipt payload digest mismatch")
        if self.signature is None:
            return
        if self.signature.algorithm != "HMAC-SHA256":
            raise ReceiptError(
                f"unsupported signature algorithm: {self.signature.algorithm}"
            )
        if hmac_key is None:
            raise ReceiptError("receipt is signed but no verification key was supplied")
        expected = hmac.new(
            hmac_key,
            canonical_json(self.unsigned_mapping()),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, self.signature.value):
            raise ReceiptError("receipt signature verification failed")


class ReceiptFactory:
    """Construct hash-linked receipts without owning signing secrets."""

    def __init__(
        self,
        *,
        hmac_key: bytes | None = None,
        key_id: str = "runtime",
    ) -> None:
        if hmac_key is not None and not hmac_key:
            raise ValueError("hmac_key must not be empty")
        self._hmac_key = hmac_key
        self._key_id = key_id

    def create(
        self,
        *,
        release_id: str,
        subject: str,
        payload: Mapping[str, Any],
        previous_receipt_digest: str | None = None,
        created_at: datetime | None = None,
    ) -> EvidenceReceipt:
        if not release_id or not subject:
            raise ReceiptError("release_id and subject are required")
        timestamp = (created_at or datetime.now(timezone.utc)).astimezone(timezone.utc)
        normalized_payload = dict(payload)
        payload_digest = sha256_hex(normalized_payload)

        # Receipt IDs are deterministic for a given release, subject, payload, and
        # predecessor.  The timestamp stays in the signed body for audit chronology.
        receipt_id = "fr_" + sha256_hex(
            {
                "releaseId": release_id,
                "subject": subject,
                "payloadDigest": payload_digest,
                "previousReceiptDigest": previous_receipt_digest,
            }
        )[:24]
        unsigned = EvidenceReceipt(
            receipt_id=receipt_id,
            release_id=release_id,
            created_at=timestamp.isoformat().replace("+00:00", "Z"),
            subject=subject,
            payload_digest=payload_digest,
            payload=normalized_payload,
            previous_receipt_digest=previous_receipt_digest,
        )
        if self._hmac_key is None:
            return unsigned
        signature = ReceiptSignature(
            algorithm="HMAC-SHA256",
            key_id=self._key_id,
            value=hmac.new(
                self._hmac_key,
                canonical_json(unsigned.unsigned_mapping()),
                hashlib.sha256,
            ).hexdigest(),
        )
        return EvidenceReceipt(
            receipt_id=unsigned.receipt_id,
            release_id=unsigned.release_id,
            created_at=unsigned.created_at,
            subject=unsigned.subject,
            payload_digest=unsigned.payload_digest,
            payload=unsigned.payload,
            previous_receipt_digest=unsigned.previous_receipt_digest,
            signature=signature,
        )
