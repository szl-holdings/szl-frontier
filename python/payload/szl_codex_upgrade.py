#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Offline second-reader for the Codex upgrade program. Not an authorizer."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROGRAM_SCHEMA = "szl.frontier.codex-upgrade-program/v1"
FALSE_FIELDS = (
    "production_authorization",
    "training_admission",
    "semantic_review_complete",
    "runtime_verified",
    "file_audit_complete",
)
THIS_ORGAN = (
    "FE-03",
    "FE-06",
    "DR-01",
    "DR-03",
    "DR-05",
    "DR-06",
    "DR-07",
    "DR-08",
    "DR-10",
)


class ContractError(ValueError):
    pass


def need(condition: bool, code: str) -> None:
    if not condition:
        raise ContractError(code)


def strict_json(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    need(isinstance(data, dict), "PROGRAM_NOT_OBJECT")
    return data


def verify_program(program: dict) -> dict:
    need(program.get("schema") == PROGRAM_SCHEMA, "PROGRAM_SCHEMA")
    for field in FALSE_FIELDS:
        need(program.get(field) is False, f"SCOPE_AMPLIFIED:{field}")
    need(program.get("source_content_files_read") == 0, "FILE_AUDIT_OVERCLAIM")
    need(program.get("file_audit_complete") is False, "FILE_AUDIT_OVERCLAIM")
    need(program.get("paid_workload_budget_usd") == 0, "PAID_BUDGET")
    need(program.get("lambda") == "CONJECTURE_1", "LAMBDA")
    need(program.get("promotion_effect") == "NONE", "PROMOTION_EFFECT")
    execution = program.get("execution")
    need(isinstance(execution, dict), "EXECUTION")
    need(execution.get("merge_protected_main") is False, "MERGE_MAIN")
    need(execution.get("recreate_flagship") is False, "RECREATE_FLAGSHIP")
    need(execution.get("draft_prs_only") is True, "DRAFT_PRS")
    need(execution.get("force_push") is False, "FORCE_PUSH")
    need(execution.get("reset_owner_dirs") is False, "RESET_OWNER_DIRS")
    lanes = program.get("this_organ_lanes")
    need(isinstance(lanes, list), "THIS_ORGAN_LANES")
    need(tuple(lanes) == THIS_ORGAN, "THIS_ORGAN_DRIFT")
    for key, value in program.items():
        if key.endswith("_unknown"):
            need(value != 0, "UNKNOWN_AS_ZERO")
    return {
        "schema": PROGRAM_SCHEMA,
        "production_authorization": False,
        "this_organ_lanes": list(lanes),
        "status": "PROGRAM_OBSERVED_NOT_AUTHORIZED",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--program", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        program = strict_json(args.program)
        report = verify_program(program)
        print(json.dumps(report, sort_keys=True))
        return 0
    except ContractError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except json.JSONDecodeError:
        print("PROGRAM_NOT_JSON", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
