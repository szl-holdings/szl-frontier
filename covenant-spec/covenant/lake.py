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
            for _ in open(path, "r", encoding="utf-8"):
                pass
            entries = self._read_all()
            if entries:
                last = entries[-1]
                self._tail = (int(last["seq"]), last["digest"])

    def _read_all(self) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
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

    def count(self) -> int:
        return len(self._read_all())

    @staticmethod
    def verify_file(path: str) -> Tuple[bool, str]:
        """Offline verification of a receipt file. Returns (ok, reason).

        Checks, for every record: the recomputed digest matches, and prev
        equals the previous record's digest. Names the exact broken link.
        """
        prev: Optional[str] = None
        n = 0
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if not stripped:
                    continue
                n += 1
                entry = json.loads(stripped)
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
