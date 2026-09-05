"""Command-line surface for the SZL Hugging Face frontier control plane."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .catalog import CatalogLoader, DEFAULT_MANIFEST
from .domain import FrontierError
from .engine import FrontierEngine
from .state import NotificationLedger


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
        selected = [
            release
            for release in catalog.releases
            if args.origin == "all" or release.origin == args.origin
        ]
        emitted: list[dict[str, Any]] = []
        errors: list[dict[str, str]] = []
        successful = 0
        for release in selected:
            try:
                assessment = engine.assess(release.id, live=True)
                successful += 1
            except FrontierError as exc:
                errors.append(
                    {
                        "id": release.id,
                        "source": release.artifact_source,
                        "error": str(exc),
                    }
                )
                continue
            if assessment.materiality_score < engine.policy.threshold:
                continue
            # A private/gated/disabled source is an explicit HOLD, not a candidate.
            if not engine.is_new_observation(assessment):
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
        report = {
            "schema": "szl.frontier.python-watch-output.v1",
            "live": True,
            "catalogEvaluatedAt": catalog.evaluated_at,
            "evaluatedThrough": datetime.now(timezone.utc).isoformat(),
            "originFilter": args.origin,
            "sourceCount": len(selected),
            "successfulSources": successful,
            "errors": errors,
            "materialCandidates": emitted,
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

    raise AssertionError(f"unhandled command: {args.command}")


def main() -> None:
    try:
        raise SystemExit(run())
    except FrontierError as exc:
        print(f"szl-frontier: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":  # pragma: no cover - exercised through `python -m`
    main()
