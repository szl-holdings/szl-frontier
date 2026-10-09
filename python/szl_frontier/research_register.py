# SPDX-License-Identifier: Apache-2.0
"""Competitive research register. Evaluation authority only.

A register row is not admission, not a license grant, and not permission to
clone vendor source or UI. Production promotion stays false.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Sequence

ROOT = Path(__file__).resolve().parents[2]
REGISTER_PATH = ROOT / "public" / "frontier" / "competitive-research-register.v1.json"
SCHEMA = "szl.frontier.competitive-research-register.v1"
SOURCE = "szl-holdings/szl-frontier"
LOCKED_8 = ("F1", "F4", "F7", "F11", "F12", "F18", "F19", "F22")
REQUIRED_ENTRY = (
    "id",
    "sourceUrl",
    "authorMaintainer",
    "pin",
    "publicationType",
    "publicationDate",
    "license",
    "inspectedSections",
    "claim",
    "limitation",
    "adaptation",
    "rejectedAlternatives",
    "validationExperiment",
    "status",
)
ALLOWED_STATUS = {
    "HOLD",
    "ADAPTED_PATTERN",
    "REJECTED",
    "ABSTRACT_ONLY",
    "PREPRINT",
    "HOST_QUALIFICATION_PENDING",
    "TEST_FIXTURE",
}
ALLOWED_PUBLICATION = {
    "official-docs",
    "github-repository",
    "arxiv-preprint",
    "peer-reviewed",
    "hub-card",
    "hub-api",
    "doi-unresolved",
}
FORBIDDEN_ADAPTATION = (
    "clone palantir",
    "clone anduril",
    "clone nvidia",
    "clone foundry",
    "clone blueprint",
    "clone lattice ui",
    "trust_remote_code=true",
    "install every framework",
)
FORBIDDEN_STATUS_FOR_FIXTURE = "ADMITTED"


class RegisterError(ValueError):
    """Unknown, overclaimed, or malformed research evidence cannot admit reuse."""


def _pairs(rows):
    result = {}
    for key, value in rows:
        if key in result:
            raise RegisterError("duplicate JSON key")
        result[key] = value
    return result


def _constant(_):
    raise RegisterError("nonfinite JSON constant")


def _finite_float(value: str) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise RegisterError("nonfinite JSON number")
    return result


def loads(raw: bytes) -> Any:
    if len(raw) > 512 * 1024:
        raise RegisterError("JSON byte budget")
    try:
        value = json.loads(raw, object_pairs_hook=_pairs, parse_constant=_constant,
                           parse_float=_finite_float)
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise RegisterError("invalid JSON evidence") from exc
    return value


def _require_str(row: dict[str, Any], key: str) -> str:
    value = row.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RegisterError(f"{key} required")
    return value


def _require_list(row: dict[str, Any], key: str) -> list[Any]:
    value = row.get(key)
    if not isinstance(value, list) or not value:
        raise RegisterError(f"{key} required")
    return value


def validate_register(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or payload.get("schema") != SCHEMA:
        raise RegisterError("register schema")
    if payload.get("sourceOfTruth") != SOURCE:
        raise RegisterError("register source identity")
    if payload.get("productionPromotion") is not False:
        raise RegisterError("production authority refused")
    if payload.get("authority") != "evaluation-only":
        raise RegisterError("authority must stay evaluation-only")
    if payload.get("lambdaUniqueness") != "Conjecture 1":
        raise RegisterError("Lambda uniqueness is Conjecture 1")
    locked = payload.get("lockedFormulaIds")
    if tuple(locked or ()) != LOCKED_8:
        raise RegisterError("locked-8 identifiers must stay stable")
    entries = payload.get("entries")
    if not isinstance(entries, list) or len(entries) < 8:
        raise RegisterError("register entries incomplete")
    seen: set[str] = set()
    for row in entries:
        if not isinstance(row, dict):
            raise RegisterError("entry must be an object")
        missing = [key for key in REQUIRED_ENTRY if key not in row]
        if missing:
            raise RegisterError("entry missing " + ",".join(missing))
        identity = _require_str(row, "id")
        if identity in seen:
            raise RegisterError("duplicate entry id")
        seen.add(identity)
        status = _require_str(row, "status")
        if status not in ALLOWED_STATUS:
            raise RegisterError(f"status {status} refused")
        pub = _require_str(row, "publicationType")
        if pub not in ALLOWED_PUBLICATION:
            raise RegisterError(f"publicationType {pub} refused")
        _require_str(row, "sourceUrl")
        _require_str(row, "authorMaintainer")
        _require_str(row, "pin")
        _require_str(row, "publicationDate")
        _require_str(row, "license")
        _require_str(row, "claim")
        _require_str(row, "limitation")
        adaptation = _require_str(row, "adaptation").lower()
        _require_list(row, "inspectedSections")
        _require_list(row, "rejectedAlternatives")
        _require_str(row, "validationExperiment")
        blob = " ".join(
            [
                adaptation,
                _require_str(row, "claim").lower(),
                " ".join(str(item).lower() for item in row["rejectedAlternatives"]),
            ]
        )
        for phrase in FORBIDDEN_ADAPTATION:
            if phrase in adaptation:
                raise RegisterError("clone or unrestricted trust is refused")
        if row.get("productionPromotion") is True:
            raise RegisterError("entry cannot authorize production")
        if status == FORBIDDEN_STATUS_FOR_FIXTURE:
            raise RegisterError("ADMITTED is not a research-register status")
        if identity == "miniembed-nano" and status != "TEST_FIXTURE":
            raise RegisterError("MiniEmbed-Nano is a test fixture")
        if identity.startswith("hf-native-kernel-") and status != "HOLD":
            raise RegisterError("native kernel qualification remains HOLD")
        if "theorem" in blob and "conjecture 1" not in blob and identity == "lambda-uniqueness":
            raise RegisterError("Lambda uniqueness cannot be a theorem")
    capabilities = payload.get("capabilities")
    if not isinstance(capabilities, list) or not capabilities:
        raise RegisterError("capability matrix required")
    cap_ids: set[str] = set()
    for row in capabilities:
        if not isinstance(row, dict):
            raise RegisterError("capability must be an object")
        identity = _require_str(row, "id")
        if identity in cap_ids:
            raise RegisterError("duplicate capability id")
        cap_ids.add(identity)
        _require_str(row, "task")
        _require_str(row, "identity")
        _require_str(row, "license")
        _require_str(row, "promotionStatus")
        if row.get("promotionStatus") in {"LIVE", "READY", "ADMITTED"}:
            raise RegisterError("capability promotion refused")
        if row.get("gpuQualified") is True:
            raise RegisterError("GPU qualification cannot be inferred")


def load_register(path: Path | None = None) -> dict[str, Any]:
    target = path or REGISTER_PATH
    payload = loads(target.read_bytes())
    if not isinstance(payload, dict):
        raise RegisterError("register must be an object")
    validate_register(payload)
    return payload


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the competitive research register")
    parser.add_argument("--path", type=Path, default=REGISTER_PATH)
    parser.add_argument("--check", action="store_true", help="exit 0 when the register is valid")
    args = parser.parse_args(argv)
    try:
        payload = load_register(args.path)
    except RegisterError as exc:
        print(json.dumps({"ok": False, "error": str(exc), "productionPromotion": False}))
        return 2
    if args.check:
        print(
            json.dumps(
                {
                    "ok": True,
                    "schema": payload["schema"],
                    "entries": len(payload["entries"]),
                    "capabilities": len(payload["capabilities"]),
                    "productionPromotion": False,
                    "authority": "evaluation-only",
                },
                sort_keys=True,
            )
        )
        return 0
    json.dump(payload, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
