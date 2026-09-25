"""Command-line surface for the SZL Hugging Face frontier control plane."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .catalog import CatalogLoader, DEFAULT_MANIFEST
from .domain import FrontierError
from .engine import FrontierEngine
from .ouroboros import (
    github_token_from_env,
    load_previous,
    run_cycle,
    save_cycle_ledger,
)
from .state import NotificationLedger
from .watch_materiality import ALERTABLE, WatchError, material_delta

CLASSIFIED_LEDGER_SCHEMA = "szl.frontier.watch-classified-ledger.v1"


def _empty_classified_ledger() -> dict[str, Any]:
    return {
        "schema": CLASSIFIED_LEDGER_SCHEMA,
        "productionPromotion": False,
        "assets": {},
    }


def load_classified_ledger(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file():
        return _empty_classified_ledger()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise FrontierError("classified ledger must be an object")
    if payload.get("schema") != CLASSIFIED_LEDGER_SCHEMA:
        raise FrontierError("classified ledger schema mismatch")
    if payload.get("productionPromotion") is True:
        raise FrontierError("classified ledger cannot authorize production")
    assets = payload.get("assets")
    if not isinstance(assets, dict):
        assets = {}
    return {**_empty_classified_ledger(), "assets": assets}


def save_classified_ledger(path: Path, ledger: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(ledger, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _classified_current(release: Any, snapshot: Any) -> dict[str, Any] | None:
    if snapshot is None or not snapshot.classified_fingerprints:
        return None
    return {
        "id": release.watch.repo_id,
        "kind": snapshot.kind,
        "inventory_complete_for_change_detection": snapshot.inventory_complete is True,
        "fingerprints": snapshot.classified_fingerprints,
        "access_flags": {
            "private": snapshot.private,
            "gated": snapshot.gated,
            "disabled": snapshot.disabled,
        },
        "license_metadata": snapshot.license,
    }


def _classified_previous(row: dict[str, Any] | None, current: dict[str, Any]) -> dict[str, Any] | None:
    if not row or not isinstance(row.get("classifiedFingerprints"), dict):
        return None
    return {
        "id": row.get("repoId") or current["id"],
        "kind": row.get("kind") or current["kind"],
        "inventory_complete_for_change_detection": row.get("inventoryComplete") is True,
        "fingerprints": row["classifiedFingerprints"],
        "access_flags": row.get("accessFlags") or current["access_flags"],
        "license_metadata": row.get("licenseMetadata"),
    }


def _emit(value: Any, *, pretty: bool = True) -> None:
    json.dump(
        value,
        sys.stdout,
        sort_keys=True,
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
        ensure_ascii=False,
    )
    sys.stdout.write("\n")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="szl-frontier",
        description="Evidence-first Hugging Face frontier release control plane.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="path to the JS-generated frontier manifest",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    list_cmd = sub.add_parser("list", help="list admitted frontier releases")
    list_cmd.add_argument("--min-score", type=int, default=0)

    plan_cmd = sub.add_parser("plan", help="emit the deterministic evaluation plan")
    plan_cmd.add_argument("release_id")

    probe_cmd = sub.add_parser("probe", help="probe one primary Hugging Face source")
    probe_cmd.add_argument("release_id")

    receipt_cmd = sub.add_parser("receipt", help="emit a content-addressed evidence receipt")
    receipt_cmd.add_argument("release_id")
    receipt_cmd.add_argument("--live", action="store_true")

    watch_cmd = sub.add_parser(
        "watch",
        help="emit only new material source observations and optionally persist dedupe state",
    )
    watch_cmd.add_argument(
        "--state-file",
        type=Path,
        default=None,
        help="JSON ledger used to suppress duplicate observations",
    )
    watch_cmd.add_argument(
        "--record",
        action="store_true",
        help="persist emitted fingerprints to --state-file",
    )
    watch_cmd.add_argument(
        "--origin",
        choices=("all", "js-manifest", "python-admission"),
        default="all",
        help="restrict live probes to one admission source",
    )
    watch_cmd.add_argument(
        "--output",
        type=Path,
        default=None,
        help="write the machine-readable report to a file instead of stdout",
    )
    watch_cmd.add_argument(
        "--require-complete",
        action="store_true",
        help="exit non-zero when any selected primary source cannot be probed",
    )
    watch_cmd.add_argument(
        "--classified-ledger",
        type=Path,
        default=Path("frontier/watch-classified-ledger.v1.json"),
        help="persisted rights/presentation/substantive fingerprints from the prior watch",
    )
    watch_cmd.add_argument(
        "--record-classified",
        action="store_true",
        help="write updated classified fingerprints to --classified-ledger",
    )

    cycle_cmd = sub.add_parser(
        "cycle",
        help="run a bounded ouroboros invariant cycle (proposal-only, always terminates)",
    )
    cycle_cmd.add_argument(
        "--live",
        action="store_true",
        help="require a live GitHub observation of szl-holdings/szl-frontier",
    )
    cycle_cmd.add_argument(
        "--dashboard",
        action="store_true",
        help="also fetch the top-10 OSS agent dashboard (failures stay UNAVAILABLE)",
    )
    cycle_cmd.add_argument(
        "--action-class",
        choices=("READ_ONLY", "REVERSIBLE_WRITE", "IRREVERSIBLE_WRITE"),
        default="READ_ONLY",
        help="action class; writes fail closed without human approval",
    )
    cycle_cmd.add_argument(
        "--state-file",
        type=Path,
        default=None,
        help="JSON ledger holding the previous cycle receipt (receipts.in)",
    )
    cycle_cmd.add_argument(
        "--record",
        action="store_true",
        help="persist this cycle's head receipt to --state-file",
    )
    cycle_cmd.add_argument(
        "--output",
        type=Path,
        default=None,
        help="write the cycle report to a file instead of stdout",
    )
    return parser


def _release_summary(engine: FrontierEngine, release_id: str) -> dict[str, Any]:
    assessment = engine.assess(release_id, live=False)
    return {
        "id": assessment.release.id,
        "title": assessment.release.title,
        "category": assessment.release.category,
        "releasedAt": assessment.release.released_at.isoformat(),
        "materialityScore": assessment.materiality_score,
        "evaluationDecision": assessment.evaluation_decision.value,
        "productionDisposition": assessment.production_disposition.value,
        "primarySource": assessment.release.primary_source,
        "targetOrgans": list(assessment.release.target_organs),
        "origin": assessment.release.origin,
    }


def run(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    catalog = CatalogLoader(args.manifest).load()
    engine = FrontierEngine(catalog)

    if args.command == "list":
        rows = [
            _release_summary(engine, release.id)
            for release in catalog.releases
            if engine.policy.score(release) >= args.min_score
        ]
        _emit(rows)
        return 0

    if args.command == "plan":
        assessment = engine.assess(args.release_id)
        _emit(assessment.evaluation_plan.as_mapping())
        return 0

    if args.command == "probe":
        assessment = engine.assess(args.release_id, live=True)
        _emit(assessment.as_mapping())
        return 0

    if args.command == "receipt":
        assessment = engine.assess(args.release_id, live=args.live)
        _emit(engine.receipt(assessment).as_mapping())
        return 0

    if args.command == "watch":
        if args.record and args.state_file is None:
            raise FrontierError("--record requires --state-file")
        ledger = (
            NotificationLedger.load(args.state_file)
            if args.state_file is not None
            else NotificationLedger()
        )
        classified_ledger = load_classified_ledger(args.classified_ledger)
        next_classified = {
            **_empty_classified_ledger(),
            "assets": dict(classified_ledger.get("assets") or {}),
        }
        selected = [
            release
            for release in catalog.releases
            if args.origin == "all" or release.origin == args.origin
        ]
        emitted: list[dict[str, Any]] = []
        errors: list[dict[str, str]] = []
        source_results: list[dict[str, Any]] = []
        successful = 0
        for release in selected:
            try:
                assessment = engine.assess(release.id, live=True)
                successful += 1
            except FrontierError as exc:
                failure = {
                    "id": release.id,
                    "source": release.artifact_source,
                    "error": str(exc),
                }
                errors.append(failure)
                source_results.append({**failure, "status": "error"})
                continue
            source_results.append(
                {
                    "id": release.id,
                    "source": release.artifact_source,
                    "status": "ok",
                    "snapshot": (
                        assessment.snapshot.as_mapping()
                        if assessment.snapshot
                        else None
                    ),
                }
            )
            current = _classified_current(assessment.release, assessment.snapshot)
            previous_classified = (
                _classified_previous(
                    classified_ledger.get("assets", {}).get(assessment.release.id),
                    current,
                )
                if current is not None
                else None
            )
            if current is not None:
                next_classified["assets"][assessment.release.id] = {
                    "id": assessment.release.id,
                    "repoId": assessment.release.watch.repo_id,
                    "kind": current["kind"],
                    "classifiedFingerprints": current["fingerprints"],
                    "inventoryComplete": current["inventory_complete_for_change_detection"],
                    "accessFlags": current["access_flags"],
                    "licenseMetadata": current["license_metadata"],
                    "observedAt": datetime.now(timezone.utc).isoformat(),
                    "productionAdmitted": False,
                }
            if assessment.materiality_score < engine.policy.threshold:
                continue
            # A private/gated/disabled source is an explicit HOLD, not a candidate.
            if not engine.is_new_observation(assessment):
                continue
            current = _classified_current(assessment.release, assessment.snapshot)
            classified_delta = None
            if current is not None:
                try:
                    classified_delta = material_delta(previous_classified, current)
                except WatchError as exc:
                    errors.append(
                        {
                            "id": assessment.release.id,
                            "source": assessment.release.artifact_source,
                            "error": str(exc),
                        }
                    )
                    continue
                if classified_delta not in ALERTABLE:
                    continue
            fingerprint = engine.notification_fingerprint(assessment)
            if not ledger.changed(assessment.release.id, fingerprint):
                continue
            emitted.append(
                {
                    "id": assessment.release.id,
                    "title": assessment.release.title,
                    "category": assessment.release.category,
                    "material": True,
                    "materialityScore": assessment.materiality_score,
                    "evaluationDecision": assessment.evaluation_decision.value,
                    "productionDisposition": assessment.production_disposition.value,
                    "whyItMatters": assessment.release.why_it_matters,
                    "primarySource": assessment.release.primary_source,
                    "artifactSource": assessment.release.artifact_source,
                    "targetOrgans": list(assessment.release.target_organs),
                    "reasons": [
                        assessment.release.why_it_matters,
                        f"deterministic materiality score {assessment.materiality_score}/100",
                        f"admission source: {assessment.release.origin}",
                    ],
                    "fingerprint": fingerprint,
                    "snapshot": assessment.snapshot.as_mapping() if assessment.snapshot else None,
                }
            )
            if args.record:
                ledger.record(assessment.release.id, fingerprint)
        if args.record and args.state_file is not None:
            ledger.save(args.state_file)
        if args.record_classified:
            save_classified_ledger(args.classified_ledger, next_classified)
        report = {
            "schema": "szl.frontier.python-watch-output.v1",
            "live": True,
            "catalogEvaluatedAt": catalog.evaluated_at,
            "evaluatedThrough": datetime.now(timezone.utc).isoformat(),
            "originFilter": args.origin,
            "sourceCount": len(selected),
            "successfulSources": successful,
            "sourceResults": source_results,
            "errors": errors,
            "materialCandidates": emitted,
            "classifiedLedger": next_classified,
            "productionPromotion": False,
        }
        if args.output is not None:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(
                json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        else:
            _emit(report)
        return 3 if args.require_complete and errors else 0

    if args.command == "cycle":
        if args.record and args.state_file is None:
            raise FrontierError("--record requires --state-file")
        hmac_raw = os.environ.get("SZL_FRONTIER_HMAC_KEY")
        hmac_key = hmac_raw.encode("utf-8") if hmac_raw else None
        previous = (
            load_previous(args.state_file, hmac_key=hmac_key)
            if args.state_file is not None
            else None
        )
        report = run_cycle(
            catalog_ok=True,
            action_class=args.action_class,
            live=args.live,
            previous=previous,
            include_dashboard=args.dashboard,
            github_token=github_token_from_env() if args.live else None,
            hmac_key=hmac_key,
        )
        if args.record and args.state_file is not None:
            save_cycle_ledger(args.state_file, report)
        if args.output is not None:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(
                json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        else:
            _emit(report)
        if report["exit"] == "converged" and report["invariantsOk"]:
            return 0
        return 3

    raise AssertionError(f"unhandled command: {args.command}")


def main() -> None:
    try:
        raise SystemExit(run())
    except FrontierError as exc:
        print(f"szl-frontier: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":  # pragma: no cover - exercised through `python -m`
    main()
