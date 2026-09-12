"""Seeded watch ledger for already-surfaced frontier assets (T28).

First observation of these identities is backlog, not a September launch.
This file is a catalog import, not a second notification source.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from .watch_materiality import (
    FIRST_OBSERVATION,
    UNKNOWN_IDENTITIES,
    alert_key,
    material_delta,
    should_alert,
)

SEEDED_ASSETS: tuple[dict[str, Any], ...] = (
    {
        "id": "granite-patchtst-fm-r2",
        "family": "IBM Granite time-series",
        "title": "Granite PatchTST-FM-r2",
        "hub_id": "ibm-granite/granite-timeseries-patchtst-fm-r2",
        "kind": "model",
        "category": "models",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Pinned Granite adapter is the optional Lyte challenger.",
    },
    {
        "id": "qwen38-flash-next",
        "family": "Qwen3.8-Flash-Next",
        "title": "Qwen3.8-Flash-Next reference",
        "hub_id": "Qwen/Qwen3.8-Flash-Next",
        "kind": "model",
        "category": "multimodal",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Existing wave. Custom license. Memory is not 6B activated.",
    },
    {
        "id": "qwen38-flash-next-fp8",
        "family": "Qwen3.8-Flash-Next",
        "title": "Qwen3.8-Flash-Next FP8",
        "hub_id": "Qwen/Qwen3.8-Flash-Next-FP8",
        "kind": "model",
        "category": "quantizations",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Derivative identity is separate from the parent.",
    },
    {
        "id": "qwen38-flash-next-nvfp4",
        "family": "Qwen3.8-Flash-Next",
        "title": "Qwen3.8-Flash-Next NVFP4",
        "hub_id": "nvidia/Qwen3.8-Flash-Next-NVFP4",
        "kind": "model",
        "category": "quantizations",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Device/runtime qualification is its own experiment.",
    },
    {
        "id": "solar-nvfp4-pruned",
        "family": "Nota Solar Open2",
        "title": "Solar Open2 250B NVFP4 global-pruned",
        "hub_id": "nota-ai/Solar-Open2-250B-Nota-NVFP4-GlobalPruned",
        "kind": "model",
        "category": "quantizations",
        "priority": "P1",
        "first_observed": "2026-08-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Backlog candidate. Last-updated 2026-08-07 is not a September release.",
    },
    {
        "id": "solar-int4-pruned",
        "family": "Nota Solar Open2",
        "title": "Solar Open2 250B INT4 global-pruned",
        "hub_id": "nota-ai/Solar-Open2-250B-Nota-INT4-GlobalPruned",
        "kind": "model",
        "category": "quantizations",
        "priority": "P1",
        "first_observed": "2026-07-31T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "INT4 is a separate runtime from NVFP4.",
    },
    {
        "id": "kimi-k3",
        "family": "Kimi K3",
        "title": "Kimi K3 original",
        "hub_id": "moonshotai/Kimi-K3",
        "kind": "model",
        "category": "models",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Parent identity must survive derivative evaluation.",
    },
    {
        "id": "kimi-k3-pruned-25",
        "family": "Kimi K3",
        "title": "Kimi K3 Nota 25% global-pruned",
        "hub_id": "nota-ai/Kimi-K3-Nota-Global-Pruned-25",
        "kind": "model",
        "category": "quantizations",
        "priority": "P1",
        "first_observed": "2026-08-02T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Private cubin is not a licensed runtime.",
    },
    {
        "id": "kimi-k3-pruned-50",
        "family": "Kimi K3",
        "title": "Kimi K3 Nota 50% global-pruned",
        "hub_id": "nota-ai/Kimi-K3-Nota-Global-Pruned-50",
        "kind": "model",
        "category": "quantizations",
        "priority": "P2",
        "first_observed": "2026-08-02T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Different trade-off from 25%. Upstream scores are not SZL measurements.",
    },
    {
        "id": "minicpm5",
        "family": "MiniCPM5",
        "title": "MiniCPM5 edge / GGUF lane",
        "hub_id": None,
        "kind": "model",
        "category": "models",
        "priority": "P2",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Previously tracked dependency, not a new discovery.",
    },
    {
        "id": "native-hf-kernels",
        "family": "Hugging Face Kernels",
        "title": "Native kernel repository migration",
        "hub_id": None,
        "kind": "docs",
        "category": "kernels",
        "priority": "P0",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": "2026-09-13",
        "why_it_matters": "P0 compatibility cutoff for actual compiled-kernel consumers.",
    },
    {
        "id": "trl-1-13-core-stack",
        "family": "TRL / core stack",
        "title": "TRL 1.13 + Transformers 5.17 + Accelerate 1.15",
        "hub_id": None,
        "kind": "release",
        "category": "training",
        "priority": "P1",
        "first_observed": "2026-09-07T00:00:00.000Z",
        "seeded": True,
        "deadline": None,
        "why_it_matters": "Forge #216 is installed-runtime source, not a million-token run.",
    },
)


def empty_record(asset: dict[str, Any]) -> dict[str, Any]:
    row = deepcopy(asset)
    row.update(
        {
            "disposition": "DEADLINE_TRACKED" if asset.get("deadline") else "SEEDED_BACKLOG",
            "last_delta": None,
            "snapshot": None,
            "previous_snapshot": None,
            "alerted_keys": [],
            "last_alert_at": None,
            "collector_error": None,
            "channel": None,
        }
    )
    return row


def seed_ledger() -> list[dict[str, Any]]:
    ids = [asset["id"] for asset in SEEDED_ASSETS]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate seeded asset ids")
    return [empty_record(asset) for asset in SEEDED_ASSETS]


def apply_observation(
    record: dict[str, Any],
    snapshot: dict[str, Any] | None,
    *,
    collector_error: str | None = None,
    observed_at: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Compare one seeded row to a new snapshot. Never re-alerts an identical key."""

    updated = deepcopy(record)
    delivery = {
        "asset_id": record["id"],
        "channel": "QUIET",
        "emit_user_alert": False,
        "delta": None,
        "reason": "no observation",
        "priority": record["priority"],
        "why_it_matters": record["why_it_matters"],
        "observed_at": observed_at,
    }
    if collector_error:
        updated["collector_error"] = collector_error
        updated["channel"] = "OPERATIONAL"
        updated["disposition"] = "UNKNOWN" if collector_error == "NO_PINNED_HUB_ID" else "COLLECTOR_FAILURE"
        delivery.update(
            channel="OPERATIONAL",
            reason=f"Collector failure is operational, not a release: {collector_error}",
        )
        return updated, delivery
    if snapshot is None:
        updated["channel"] = "OPERATIONAL"
        updated["disposition"] = "UNKNOWN"
        delivery.update(channel="OPERATIONAL", reason="Missing snapshot is UNKNOWN, not quiet-all-clear.")
        return updated, delivery

    delta = material_delta(record.get("snapshot"), snapshot)
    fingerprint = (snapshot.get("fingerprints") or {}).get("substantive")
    key = alert_key(record["id"], delta, fingerprint)
    emit = should_alert(
        delta=delta,
        seeded=bool(record.get("seeded")),
        already_alerted_key=(record.get("alerted_keys") or [None])[-1] if record.get("alerted_keys") else None,
        last_alert_key=key,
    )
    updated["previous_snapshot"] = record.get("snapshot")
    updated["snapshot"] = snapshot
    updated["last_delta"] = delta
    updated["collector_error"] = None
    if emit:
        updated["alerted_keys"] = [*(record.get("alerted_keys") or []), key]
        updated["last_alert_at"] = observed_at
        updated["disposition"] = "MATERIAL_ALERT"
        updated["channel"] = "MATERIAL"
        delivery.update(
            channel="MATERIAL",
            emit_user_alert=True,
            delta=delta,
            reason=f"{record['why_it_matters']} ({delta})",
        )
        return updated, delivery
    if delta == FIRST_OBSERVATION:
        updated["disposition"] = "SEEDED_BACKLOG"
        updated["channel"] = "SEEDED"
        delivery.update(channel="SEEDED", delta=delta, reason="Seeded first observation is not a new release.")
    elif delta == UNKNOWN_IDENTITIES:
        updated["disposition"] = "UNKNOWN"
        updated["channel"] = "OPERATIONAL"
        delivery.update(channel="OPERATIONAL", delta=delta, reason="Incomplete identities: UNKNOWN, not unchanged.")
    elif record.get("deadline"):
        updated["disposition"] = "DEADLINE_TRACKED"
        updated["channel"] = "DEADLINE"
        delivery.update(channel="DEADLINE", delta=delta, reason="Deadline tracked; remainder change is the only re-emit.")
    else:
        updated["disposition"] = "QUIET"
        updated["channel"] = "QUIET"
        delivery.update(channel="QUIET", delta=delta, reason="No material artifact change.")
    return updated, delivery
