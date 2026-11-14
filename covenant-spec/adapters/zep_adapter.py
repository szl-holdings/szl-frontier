"""Zep adapter for the Memory Covenant (v0.4-draft, demo-grade mapping).

Requires: pip install zep-cloud

The adapter wraps a Zep client behind the put/get/search protocol; the
Covenant Gateway in front of it enforces policy, lifecycle and receipts.
Benchmarks stay with the platform - auditability becomes the Covenant's.

Honesty notes:
- zep-cloud memory.add() does not return a stable id in all SDK versions;
  this adapter keeps a digest-handle map per session and treats that map
  as part of the adapter state. Pin your SDK version and extend the tests
  here before production use.
- remove() raises NotImplementedError: this demo mapping cannot delete
  session memory, so the gateway reports ROLLBACK_UNAVAILABLE honestly
  if a receipt seal ever fails after a put. Extend this adapter with a
  real deletion path before production use.
"""
from __future__ import annotations

from typing import Any, Dict, List

from adapters.in_memory import InMemoryPlane


class ZepPlane:
    def __init__(self, client: Any = None, api_key: str = ""):
        try:
            from zep_cloud import Zep  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError("pip install zep-cloud to use the Zep adapter") from exc
        self.client = client or Zep(api_key=api_key)
        self._handles = InMemoryPlane()

    def put(self, tenant: str, content: str) -> str:
        self.client.memory.add(session_id=tenant, text=content)
        return self._handles.put(tenant, content)

    def get(self, tenant: str, handle: str) -> str:
        return self._handles.get(tenant, handle)

    def search(self, tenant: str, query: str) -> List[str]:
        results = self.client.memory.search(session_id=tenant, text=query) or []
        texts = [r.get("message", "") if isinstance(r, dict) else "" for r in results]
        handles: List[str] = []
        for text in texts:
            if text:
                handles.extend(self._handles.search(tenant, text))
        return handles

    def remove(self, tenant: str, handle: str) -> None:
        """Rollback hook for staged commits. This demo mapping cannot delete
        session memory; the gateway records ROLLBACK_UNAVAILABLE honestly.
        Implement a real deletion path before production use."""
        raise NotImplementedError("zep-cloud demo adapter cannot remove session memory; pin the SDK and extend this adapter before production use")
