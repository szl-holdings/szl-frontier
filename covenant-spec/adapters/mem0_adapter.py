"""Mem0 adapter for the Memory Covenant (v0.4-draft, demo-grade mapping).

Requires: pip install mem0ai

The adapter wraps a Mem0 client behind the put/get/search protocol; the
Covenant Gateway in front of it enforces policy, lifecycle and receipts.
Benchmarks stay with the platform - auditability becomes the Covenant's.

Honesty notes:
- Mem0 issues provider-side ids; the gateway binds its own content digests
  to the returned handles. Verify the mapping in your deployment.
- This mapping is demo-grade and unversioned against the mem0ai SDK;
  pin your SDK version and extend the tests here before production use.
- remove() exists so the gateway can roll back a plane mutation when
  receipt sealing fails (staged commit). Confirm your SDK's delete
  semantics before relying on it.
"""
from __future__ import annotations

from typing import Any, Dict, List


class Mem0Plane:
    def __init__(self, client: Any = None):
        try:
            from mem0 import MemoryClient  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError("pip install mem0ai to use the Mem0 adapter") from exc
        self.client = client or MemoryClient()

    def put(self, tenant: str, content: str) -> str:
        result = self.client.add(content, user_id=tenant, metadata={"covenant": "v0.4-draft"})
        if isinstance(result, dict) and result.get("id"):
            return str(result["id"])
        return str(result)

    def get(self, tenant: str, handle: str) -> str:
        item = self.client.get(handle) or {}
        return item.get("memory", "") if isinstance(item, dict) else str(item)

    def search(self, tenant: str, query: str) -> List[str]:
        results = self.client.search(query=query, user_id=tenant) or []
        return [str(r.get("id")) for r in results if isinstance(r, dict) and r.get("id")]

    def remove(self, tenant: str, handle: str) -> None:
        """Rollback hook for staged commits. Demo-grade: verify delete semantics
        against your pinned mem0ai SDK version before production use."""
        self.client.delete(handle)
