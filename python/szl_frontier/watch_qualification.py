"""Offline, advisory coverage check for a retained frontier-watch bundle.

The expected-source file is accepted only with a separately supplied exact
repository/path/revision/content-hash binding. This checks retained JSON; it
does not fetch sources, authenticate a workflow run, or authorize deployment.
"""

from __future__ import annotations

import argparse
from collections import Counter
from collections.abc import Mapping
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from typing import Any


SOURCE_REPOSITORY = "szl-holdings/szl-frontier"
ROLES = {"js-manifest": "id", "python-admission": "id", "edge-lane": "repoId"}
WATCH_SCHEMA = "szl.frontier.watch-output.v1"
ROLE_SCHEMAS = {
    "js-manifest": WATCH_SCHEMA,
    "python-admission": "szl.frontier.python-watch-output.v1",
    "edge-lane": WATCH_SCHEMA,
}
COMBINED_SCHEMA = "szl.frontier.combined-watch-output.v1"
CONFIG_SCHEMA = "szl.frontier.watch-expected.v1"
MAX_CONFIG_BYTES = 1024 * 1024
MAX_JSON_DEPTH = 64
_SHA40 = re.compile(r"[0-9a-f]{40}\Z")
_SHA256 = re.compile(r"[0-9a-f]{64}\Z")


class QualificationError(ValueError):
    """An input is incomplete, inconsistent, or outside the admitted scope."""


class MissingBindingError(QualificationError):
    """Required retained metadata is absent; matching counts are insufficient."""


def _result(qualification: str, reason: str, *, integrity: bool = False,
            coverage: bool = False) -> dict[str, Any]:
    return {
        "schema": "szl.frontier.watch-qualification.v1",
        "qualification": qualification,
        "reason": reason,
        "evidenceClass": "DECLARED",
        "configIntegrity": integrity,
        "sourceCoverage": coverage,
        "provenanceAuthenticated": False,
        "runtimeVerified": False,
        "productionAuthorization": False,
        "productionPromotion": False,
        "productionDisposition": "HOLD",
    }


def _text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or value.strip() != value:
        raise QualificationError(f"invalid {field}")
    return value


def _sha(value: Any, field: str, pattern: re.Pattern[str]) -> str:
    value = _text(value, field)
    if pattern.fullmatch(value) is None:
        raise QualificationError(f"invalid {field}")
    return value


def _count(value: Any, field: str) -> int:
    if type(value) is not int or value < 0:
        raise QualificationError(f"invalid {field}")
    return value


def _unique_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise QualificationError("duplicate JSON member")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise QualificationError(f"invalid JSON constant {value}")


def _check_json_depth(value: Any) -> None:
    pending = [(value, 1)]
    while pending:
        item, depth = pending.pop()
        if depth > MAX_JSON_DEPTH:
            raise QualificationError("JSON exceeds depth limit")
        if isinstance(item, dict):
            pending.extend((child, depth + 1) for child in item.values())
        elif isinstance(item, (list, tuple)):
            pending.extend((child, depth + 1) for child in item)


def _file_identity(info: os.stat_result) -> tuple[int, int]:
    return info.st_dev, info.st_ino


def _read_config_bytes(root: Path, parts: PurePosixPath) -> bytes:
    """Read a bounded regular file, rejecting replaced or redirected paths.

    These checks do not authenticate the checkout or protect it from an
    adversarial concurrent writer. The independently supplied content hash
    remains mandatory, and the caller must retain a stable local checkout.
    """
    resolved_root = root.resolve(strict=True)
    admitted: list[tuple[Path, os.stat_result]] = []
    path = resolved_root
    for part in parts.parts:
        path = path / part
        info = path.lstat()
        if (stat.S_ISLNK(info.st_mode) or
                getattr(info, "st_file_attributes", 0) &
                getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)):
            raise QualificationError("config path cannot contain links or reparse points")
        admitted.append((path, info))
    path.resolve(strict=True).relative_to(resolved_root)
    before = admitted[-1][1]
    if not stat.S_ISREG(before.st_mode):
        raise QualificationError("config must be a regular file")
    if before.st_size > MAX_CONFIG_BYTES:
        raise QualificationError("config exceeds byte limit")
    flags = os.O_RDONLY | getattr(os, "O_BINARY", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    descriptor = os.open(path, flags)
    try:
        stream = os.fdopen(descriptor, "rb")
    except BaseException:
        os.close(descriptor)
        raise
    with stream:
        opened = os.fstat(stream.fileno())
        if (not stat.S_ISREG(opened.st_mode) or
                _file_identity(opened) != _file_identity(before)):
            raise QualificationError("config file changed during admission")
        raw = stream.read(MAX_CONFIG_BYTES + 1)
        after = os.fstat(stream.fileno())
        if (after.st_size != opened.st_size or
                after.st_mtime_ns != opened.st_mtime_ns):
            raise QualificationError("config file changed during read")
    for component, original in admitted:
        current = component.lstat()
        if (stat.S_ISLNK(current.st_mode) or
                getattr(current, "st_file_attributes", 0) &
                getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400) or
                _file_identity(current) != _file_identity(original)):
            raise QualificationError("config path changed during read")
    path.resolve(strict=True).relative_to(resolved_root)
    if len(raw) > MAX_CONFIG_BYTES:
        raise QualificationError("config exceeds byte limit")
    return raw


def _bound_config(root: Path, binding: Mapping[str, Any]) -> tuple[dict[str, Any], str, str]:
    if binding.get("repository") != SOURCE_REPOSITORY:
        raise QualificationError("config repository mismatch")
    revision = _sha(binding.get("revision"), "config revision", _SHA40)
    digest = _sha(binding.get("sha256"), "config sha256", _SHA256)
    relative = _text(binding.get("path"), "config path")
    parts = PurePosixPath(relative)
    if ("\\" in relative or ":" in relative or parts.is_absolute() or
            any(part in ("", ".", "..") for part in relative.split("/"))):
        raise QualificationError("config path must be a safe repository-relative path")
    try:
        raw = _read_config_bytes(root, parts)
    except QualificationError:
        raise
    except (OSError, ValueError) as exc:
        raise QualificationError("config path unavailable or outside checkout") from exc
    if len(raw) > MAX_CONFIG_BYTES or hashlib.sha256(raw).hexdigest() != digest:
        raise QualificationError("config content hash mismatch")
    try:
        config = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_pairs,
                            parse_constant=_reject_constant)
    except (UnicodeError, ValueError, RecursionError) as exc:
        raise QualificationError("config is not strict UTF-8 JSON") from exc
    _check_json_depth(config)
    if not isinstance(config, dict) or config.get("schema") != CONFIG_SCHEMA:
        raise QualificationError("config schema mismatch")
    if config.get("sourceRepository") != SOURCE_REPOSITORY:
        raise QualificationError("config source repository mismatch")
    return config, revision, digest


def _expected_roles(config: Mapping[str, Any]) -> dict[str, tuple[dict[str, str], set[str]]]:
    roles = config.get("roles")
    if not isinstance(roles, dict) or set(roles) != set(ROLES):
        raise QualificationError("expected roles must match all three watch producers")
    expected: dict[str, tuple[dict[str, str], set[str]]] = {}
    for role in ROLES:
        entries = roles[role]
        if not isinstance(entries, list) or not entries:
            raise QualificationError(f"missing expected sources for {role}")
        names: dict[str, str] = {}
        canonical: set[str] = set()
        for entry in entries:
            if not isinstance(entry, dict):
                raise QualificationError(f"invalid expected source for {role}")
            source_id = _text(entry.get("id"), f"expected id in {role}")
            aliases = entry.get("aliases", [])
            if not isinstance(aliases, list):
                raise QualificationError(f"invalid aliases in {role}")
            if source_id in canonical:
                raise QualificationError(f"duplicate expected id in {role}")
            canonical.add(source_id)
            for name in [source_id, *aliases]:
                name = _text(name, f"alias in {role}")
                if name in names:
                    raise QualificationError(f"ambiguous expected id or alias in {role}")
                names[name] = source_id
        expected[role] = names, canonical
    return expected


def _metadata(report: Mapping[str, Any], *, config_sha: str,
              run_revision: str | None) -> str:
    for field, wanted in (("sourceRepository", SOURCE_REPOSITORY),
                          ("configSha256", config_sha)):
        if field in report and report[field] != wanted:
            raise QualificationError(f"conflicting {field} metadata")
    if any(field not in report for field in
           ("sourceRepository", "configSha256", "sourceRevision")):
        raise MissingBindingError("component source binding absent")
    revision = _sha(report["sourceRevision"], "report sourceRevision", _SHA40)
    if run_revision is not None and revision != run_revision:
        raise QualificationError("conflicting sourceRevision metadata")
    return revision


def _role_rows(role: str, report: Mapping[str, Any], names: Mapping[str, str],
               canonical: set[str]) -> list[dict[str, Any]]:
    if report.get("schema") != ROLE_SCHEMAS[role] or report.get("live") is not True:
        raise QualificationError(f"{role} is not a live watch report")
    if report.get("productionPromotion") is not False:
        raise QualificationError(f"{role} production promotion is not false")
    if report.get("errors") != []:
        raise QualificationError(f"{role} has errors or missing error evidence")
    rows = report.get("sourceResults")
    if not isinstance(rows, list):
        raise QualificationError(f"{role} source results missing")
    count = len(canonical)
    if (_count(report.get("sourceCount"), f"{role} sourceCount") != count or
            _count(report.get("successfulSources"), f"{role} successfulSources") != count or
            len(rows) != count):
        raise QualificationError(f"{role} source count conflict")
    seen: set[str] = set()
    field = ROLES[role]
    for row in rows:
        if not isinstance(row, dict) or row.get("status") != "ok":
            raise QualificationError(f"{role} has an unsuccessful source result")
        source_id = _text(row.get(field), f"{role} source identity")
        if source_id not in names:
            raise QualificationError(f"{role} has unexpected source {source_id}")
        resolved = names[source_id]
        if resolved in seen:
            raise QualificationError(f"{role} has duplicate source {resolved}")
        seen.add(resolved)
    if seen != canonical:
        raise QualificationError(f"{role} is missing expected sources")
    return rows


def _row_key(row: Any) -> str:
    if not isinstance(row, dict):
        raise QualificationError("combined source result is not an object")
    _check_json_depth(row)
    try:
        return json.dumps(row, sort_keys=True, separators=(",", ":"),
                          ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError, RecursionError) as exc:
        raise QualificationError("source result is not finite JSON") from exc


def _combined(combined: Mapping[str, Any], role_rows: list[dict[str, Any]]) -> None:
    if combined.get("schema") != COMBINED_SCHEMA or combined.get("live") is not True:
        raise QualificationError("combined is not a live combined watch report")
    if combined.get("productionPromotion") is not False:
        raise QualificationError("combined production promotion is not false")
    if combined.get("errors") != []:
        raise QualificationError("combined errors are present or unknown")
    rows = combined.get("sourceResults")
    if not isinstance(rows, list):
        raise QualificationError("combined source results missing")
    count = len(role_rows)
    if (_count(combined.get("sourceCount"), "combined sourceCount") != count or
            _count(combined.get("successfulSources"), "combined successfulSources") != count or
            len(rows) != count):
        raise QualificationError("combined source count conflict")
    if Counter(map(_row_key, rows)) != Counter(map(_row_key, role_rows)):
        raise QualificationError("combined rows differ from role reports")


def qualify_watch_bundle(*, checkout_root: Path, trusted_config_binding: Mapping[str, Any] | None,
                         reports: Mapping[str, Any], run_binding: Mapping[str, Any] | None = None
                         ) -> dict[str, Any]:
    """Check source identities without network, mutation, or release authority.

    ``trusted_config_binding`` must come from outside the config file and bind
    its repository-relative path, repository, full Git SHA, and byte SHA-256.
    ``run_binding`` is separate retained provenance, not an authenticated proof.
    """
    if not isinstance(trusted_config_binding, Mapping):
        return _result("MISSING_BINDING", "trusted config binding absent")
    integrity = False
    coverage = False
    try:
        config, expected_revision, config_sha = _bound_config(
            Path(checkout_root), trusted_config_binding)
        integrity = True
        expected = _expected_roles(config)
        if not isinstance(reports, Mapping) or set(reports) != {*ROLES, "combined"}:
            raise QualificationError("watch bundle must include exactly three roles and combined")
        run_revision = None
        if run_binding is not None:
            if not isinstance(run_binding, Mapping):
                raise QualificationError("invalid run binding")
            if (run_binding.get("sourceRepository") != SOURCE_REPOSITORY or
                    run_binding.get("configSha256") != config_sha):
                raise QualificationError("run binding conflicts with config")
            run_revision = _sha(run_binding.get("sourceRevision"),
                                "run sourceRevision", _SHA40)
        all_rows: list[dict[str, Any]] = []
        component_revision = run_revision
        for role in ROLES:
            report = reports[role]
            if not isinstance(report, Mapping):
                raise QualificationError(f"{role} report is not an object")
            component_revision = _metadata(
                report, config_sha=config_sha, run_revision=component_revision)
            names, canonical = expected[role]
            all_rows.extend(_role_rows(role, report, names, canonical))
        combined = reports["combined"]
        if not isinstance(combined, Mapping):
            raise QualificationError("combined report is not an object")
        _metadata(combined, config_sha=config_sha, run_revision=component_revision)
        _combined(combined, all_rows)
        coverage = True
        if run_revision is None:
            return _result("MISSING_BINDING", "run revision binding absent",
                           integrity=integrity, coverage=coverage)
        if run_revision != expected_revision:
            return _result("HISTORICAL", "run revision differs from bound config revision",
                           integrity=integrity, coverage=coverage)
        return _result("SOURCE_COVERAGE_ADVISORY", "exact role-scoped identities and counts agree",
                       integrity=integrity, coverage=coverage)
    except MissingBindingError as exc:
        return _result("MISSING_BINDING", str(exc), integrity=integrity, coverage=coverage)
    except QualificationError as exc:
        return _result("BLOCKED", str(exc), integrity=integrity, coverage=coverage)


def _read_report_bundle(root: Path, relative: str) -> dict[str, Any]:
    """Read retained evidence only; never fetch or infer missing source metadata."""
    relative = _text(relative, "reports path")
    parts = PurePosixPath(relative)
    if ("\\" in relative or ":" in relative or parts.is_absolute() or
            any(part in ("", ".", "..") for part in relative.split("/"))):
        raise QualificationError("reports path must be a safe evidence-relative path")
    try:
        raw = _read_config_bytes(root, parts)
        reports = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_pairs,
                             parse_constant=_reject_constant)
    except QualificationError:
        raise
    except (OSError, UnicodeError, ValueError, RecursionError) as exc:
        raise QualificationError("reports unavailable or not strict UTF-8 JSON") from exc
    _check_json_depth(reports)
    if not isinstance(reports, dict):
        raise QualificationError("reports bundle must be a JSON object")
    return reports


def main(argv: list[str] | None = None) -> int:
    """Emit one advisory JSON result to stdout without modifying any input."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkout-root", type=Path, required=True)
    parser.add_argument("--config-path", required=True,
                        help="Reviewed repository-relative expected-source JSON path")
    parser.add_argument("--config-revision", required=True,
                        help="Independently retained full Git revision for the config")
    parser.add_argument("--config-sha256", required=True,
                        help="Independently retained SHA-256 of the exact config bytes")
    parser.add_argument("--reports-root", type=Path, required=True)
    parser.add_argument("--reports", required=True,
                        help="Evidence-relative JSON object with the four role reports")
    parser.add_argument("--run-revision",
                        help="Separately retained full run-source revision, not authentication")
    args = parser.parse_args(argv)
    binding = {"repository": SOURCE_REPOSITORY, "path": args.config_path,
               "revision": args.config_revision, "sha256": args.config_sha256}
    run_binding = None
    if args.run_revision is not None:
        run_binding = {"sourceRepository": SOURCE_REPOSITORY,
                       "sourceRevision": args.run_revision,
                       "configSha256": args.config_sha256}
    try:
        reports = _read_report_bundle(args.reports_root, args.reports)
        result = qualify_watch_bundle(checkout_root=args.checkout_root,
                                      trusted_config_binding=binding, reports=reports,
                                      run_binding=run_binding)
    except QualificationError as exc:
        result = _result("BLOCKED", str(exc))
    print(json.dumps(result, sort_keys=True, allow_nan=False))
    # Zero means the advisory consistency check passed, never a release gate.
    return 0 if result["qualification"] == "SOURCE_COVERAGE_ADVISORY" else 3


if __name__ == "__main__":
    raise SystemExit(main())
