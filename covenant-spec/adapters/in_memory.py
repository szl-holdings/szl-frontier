"""InMemoryPlane — reference MemoryPlane for tests and demos.

The plane is capability only; the Covenant is the gateway in front of it.
Implements the put/get/search protocol the gateway expects from any
adapter. Stdlib only; contents are never returned unaudited by the
gateway (only handles and digests leave it).
"""
from __future__ import annotations

import hashlib
from typing import Dict, List


class InMemoryPlane:
    def __init__(self) -> None:
        self._by_tenant: Dict[str, Dict[str, str]] = {}

    @staticmethod
    def _handle(content: str) -> str:
        return hashlib.sha3_256(content.encode("utf-8")).hexdigest()[:16]

    def put(self, tenant: str, content: str) -> str:
        handle = self._handle(content)
        self._by_tenant.setdefault(tenant, {})[handle] = content
        return handle

    def get(self, tenant: str, handle: str) -> str:
        return self._by_tenant.get(tenant, {}).get(handle, "")

    def search(self, tenant: str, query: str) -> List[str]:
        q = query.lower()
        bucket = self._by_tenant.get(tenant, {})
        return [h for h, c in bucket.items() if q in c.lower()]

    def count(self, tenant: str = "") -> int:
        if tenant:
            return len(self._by_tenant.get(tenant, {}))
        return sum(len(b) for b in self._by_tenant.values())
