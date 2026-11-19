"""Append-only, SHA3-256 hash-chained receipt lake (UNSIGNED_HONEST).

Chain discipline is byte-compatible with szl-evidence-core: canonical JSON,
algorithm-declared digests, prev <-> digest chaining. No signature is
fabricated: every record carries signature=null and the label
UNSIGNED_HONEST until sealed with szl-receipt (DSSE/ECDSA-P256 per
governed-receipt-spec). Verification is offline and dependency-free.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Dict, List, Optional, Tuple


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def sha3_256_hex(text: str) -> str:
    return hashlib.sha3_256(text.encode("utf-8")).hexdigest()


class ReceiptLake:
    """NDJSON append-only receipt lake with a SHA3-256 hash chain.

    One receipt per line. Each record carries seq, prev (the previous
    digest, None for the genesis record) and digest (SHA3-256 over the
    canonical record without the digest member).
    """

    def __init__(self, path: str):
        self.path = path
        directory = os.path.dirname(os.path.abspath(path))
        os.makedirs(directory, exist_ok=True)
        self._tail: Optional[Tuple[int, str]] = None
        if os.path.exists(path):
            entries = self._read_all()
            if entries:
                last = entries[-1]
                self._tail = (int(last["seq"]), last["digest"])

    def _read_all(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.path):
            return []
        entries: List[Dict[str, Any]] = []
        with open(self.path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    if not isinstance(entry, dict):
                        # Valid JSON that is not a receipt object is as corrupt as a
                        # truncated record: every reader must see it the same way.
                        raise ValueError("line %d: record is not a JSON object" % lineno)
                    entries.append(entry)
        return entries

    def append(self, record: Dict[str, Any]) -> Dict[str, Any]:
        seq = self._tail[0] + 1 if self._tail else 0
        prev = self._tail[1] if self._tail else None
        entry = dict(record)
        entry["seq"] = seq
        entry["prev"] = prev
        entry["digest"] = sha3_256_hex(canonical(entry))
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(canonical(entry) + "\n")
        self._tail = (seq, entry["digest"])
        return entry

    def count(self) -> Optional[int]:
        """Number of receipts, or None when the lake cannot be parsed.

        None is the honest UNAVAILABLE answer for a truncated or corrupt
        lake: a count is never fabricated and the caller never gets a raw
        decode error. healthcheck() and verify_file() name what is broken.
        """
        try:
            return len(self._read_all())
        except ValueError:
            return None

    def healthcheck(self) -> Tuple[bool, str]:
        """Cheap tail integrity check, used before staged commits.

        Re-reads the file so post-init tampering is detected: the last
        record must still carry its recomputed digest and link to the
        prior record. A missing or empty file is healthy (fresh lake).
        Full verification stays in verify_file(); healthcheck is the
        pre-flight, not a substitute.
        """
        if not os.path.exists(self.path):
            return True, "lake empty (healthy)"
        try:
            entries = self._read_all()
        except ValueError as exc:
            # A truncated or corrupt record must read as UNHEALTHY, never as a
            # crash: staged commits refuse honestly instead of raising.
            return False, "lake unparseable (truncated or corrupt record): %s" % exc
        if not entries:
            return True, "lake empty (healthy)"
        last = entries[-1]
        body = {k: v for k, v in last.items() if k != "digest"}
        if sha3_256_hex(canonical(body)) != last.get("digest"):
            return False, "tail digest mismatch (last receipt tampered or corrupt)"
        prev_expected = entries[-2].get("digest") if len(entries) > 1 else None
        if last.get("prev") != prev_expected:
            return False, "tail chain break (prev does not match prior digest)"
        return True, "tail intact (%d receipts)" % len(entries)

    @staticmethod
    def verify_file(path: str) -> Tuple[bool, str]:
        """Offline verification of a receipt file. Returns (ok, reason).

        Checks, for every record: the recomputed digest matches, and prev
        equals the previous record's digest. Names the exact broken link.
        A truncated, corrupt or non-object record is reported as a broken
        line (ok=False), never raised: a third-party verifier must always
        get an answer.
        """
        prev: Optional[str] = None
        n = 0
        with open(path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                stripped = line.strip()
                if not stripped:
                    continue
                n += 1
                try:
                    entry = json.loads(stripped)
                except ValueError as exc:
                    return False, "line %d: unparseable record (truncated or corrupt): %s" % (lineno, exc)
                if not isinstance(entry, dict):
                    return False, "line %d: unparseable record (not a JSON object)" % lineno
                body = {k: v for k, v in entry.items() if k != "digest"}
                expected = sha3_256_hex(canonical(body))
                if expected != entry.get("digest"):
                    return False, "seq %s: digest mismatch (content tampered)" % entry.get("seq")
                if entry.get("prev") != prev:
                    return False, "seq %s: chain break (prev does not match prior digest)" % entry.get("seq")
                prev = entry["digest"]
        return True, "%d receipts verified end-to-end" % n

    def verify(self) -> Tuple[bool, str]:
        return ReceiptLake.verify_file(self.path)
