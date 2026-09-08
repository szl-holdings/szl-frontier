# SPDX-License-Identifier: Apache-2.0
"""Pinned Kimi/Hy4/Spark evaluation intake; metadata is never action authority.

Default plan is offline. Explicit observe performs at most fifteen bounded public
GETs (five inventories, ten text artifacts), never weight downloads or execution.
The existing wave_plan compiler owns the evaluation contract and policy gates.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
WAVE_PATH = ROOT / 'frontier/waves/2026-09-08-kimi-hy4-spark.json'
SOURCE = 'szl-holdings/szl-frontier'
REPOS = {'moonshotai/Kimi-K3', 'tencent/Hy4-preview', 'tencent/Hy4-preview-FP8',
         'XHToken/Spark-X2.5-4B', 'XHToken/Spark-X2.5-1.7B'}
MAX_BYTES = 4 * 1024**2
SHA40 = re.compile(r'^[a-f0-9]{40}$')
SHA64 = re.compile(r'^[a-f0-9]{64}$')


class IntakeError(ValueError):
    """Unknown, partial, or conflicting observations cannot admit evaluation."""


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def _pairs(rows):
    result = {}
    for key, value in rows:
        if key in result:
            raise IntakeError('duplicate JSON key')
        result[key] = value
    return result


def _constant(_):
    raise IntakeError('nonfinite JSON constant')


def loads(raw: bytes) -> Any:
    if len(raw) > MAX_BYTES:
        raise IntakeError('JSON byte budget')
    try:
        value = json.loads(raw, object_pairs_hook=_pairs, parse_constant=_constant)
        canonical(value)
        return value
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise IntakeError('invalid JSON evidence') from exc


def validate_wave(wave: dict[str, Any]) -> None:
    if not isinstance(wave, dict) or wave.get('schema') != 'szl.frontier.integration-wave.v1':
        raise IntakeError('wave schema')
    if wave.get('sourceOfTruth') != SOURCE or wave.get('wave') != '2026-09-08-kimi-hy4-spark':
        raise IntakeError('wave source identity')
    policy = wave.get('policy', {})
    if policy.get('automaticProductionPromotion') is not False or policy.get('defaultEffect') != 'hold':
        raise IntakeError('production authority refused')
    models, releases = wave.get('observedModels'), wave.get('releases')
    if not isinstance(models, list) or len(models) != 5 or {m.get('repoId') for m in models} != REPOS:
        raise IntakeError('exact five model artifacts required')
    if not isinstance(releases, list) or {r.get('id') for r in releases} != {'kimi-k3','hy4-preview','spark-x25'} or len(releases) != 3:
        raise IntakeError('three deduplicated families required')
    if wave.get('productionDisposition') != 'HOLD':
        raise IntakeError('production admission refused')
    for key in ('modelOperational','trainingAuthorized','weightsRehosted','runtimeQualified','domainDeploymentPerformed'):
        if wave.get(key) is not False:
            raise IntakeError('unwitnessed capability refused')
    for model in models:
        if not SHA40.fullmatch(str(model.get('revision', ''))) or not SHA64.fullmatch(str(model.get('substantiveInventorySha256', ''))):
            raise IntakeError('immutable model identity required')
        files = model.get('reviewedFiles')
        if not isinstance(files, dict) or set(files) != {'LICENSE', 'config.json'} or not all(SHA64.fullmatch(str(h)) for h in files.values()):
            raise IntakeError('reviewed text artifact identities required')
        expected_license = 'other' if model['repoId'] == 'moonshotai/Kimi-K3' else 'apache-2.0'
        if model.get('license') != expected_license:
            raise IntakeError('license identity changed')
    for release in releases:
        if release.get('releaseDate') is not None or release.get('dateStatus') != 'NOT_ASSERTED_FROM_HUB_CREATED_OR_MODIFIED':
            raise IntakeError('Hub timestamps do not establish release dates')
        if release.get('licenseApproved') is not False or release.get('executionAuthorized') is not False or release.get('productionDisposition') != 'HOLD':
            raise IntakeError('qualification is pending')


def material_identity(payload: dict[str, Any]) -> str:
    siblings = payload.get('siblings')
    if not isinstance(siblings, list) or not 1 <= len(siblings) <= 2000:
        raise IntakeError('complete inventory required')
    rows, names = [], set()
    for item in siblings:
        name = item.get('rfilename')
        if not isinstance(name, str) or not name or name in names or '\\' in name or any(p in {'', '.', '..'} for p in name.split('/')):
            raise IntakeError('invalid or duplicate artifact path')
        names.add(name)
        if name.lower().startswith('readme') or name.startswith(('assets/', 'images/', 'docs/', '.gitattributes')):
            continue
        large = item.get('lfs') or {}
        oid = large.get('sha256') or large.get('oid') or item.get('blobId')
        size = item.get('size', large.get('size'))
        if not isinstance(oid, str) or not re.fullmatch(r'[a-f0-9]{40}|[a-f0-9]{64}', oid) or type(size) is not int or size < 0:
            raise IntakeError('missing substantive artifact identity')
        rows.append({'path':name, 'size':size, 'oid':oid})
    if not rows:
        raise IntakeError('substantive inventory empty')
    return digest(sorted(rows, key=lambda r:r['path']))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise IntakeError('metadata redirect refused')


def fetch(repo: str, revision: str, name: str | None) -> bytes:
    if repo not in REPOS or not SHA40.fullmatch(revision) or name not in (None, 'LICENSE', 'config.json'):
        raise IntakeError('unapproved source request')
    # raw avoids /resolve redirects while reading the exact committed text only.
    url = (f'https://huggingface.co/api/models/{repo}/revision/{revision}?blobs=true'
           if name is None else f'https://huggingface.co/{repo}/raw/{revision}/{name}')
    limit = MAX_BYTES if name is None else 128 * 1024
    opener = build_opener(ProxyHandler({}), NoRedirect())
    request = Request(url, headers={'User-Agent':'SZL-Frontier-family-intake/1','Cache-Control':'no-cache'})
    with opener.open(request, timeout=15) as response:
        if response.status != 200 or response.geturl() != url or response.headers.get('Link'):
            raise IntakeError('incomplete source response')
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise IntakeError('source byte budget')
    return raw


def observe_one(model: dict[str, Any], read: Callable = fetch) -> dict[str, Any]:
    repo, revision = model['repoId'], model['revision']
    raw = read(repo, revision, None)
    payload = loads(raw)
    if payload.get('id') != repo or payload.get('sha') != revision:
        raise IntakeError('upstream revision mismatch')
    # Missing flags are UNKNOWN, not normalized to an asserted false.
    if any(payload.get(k) is not False for k in ('private', 'gated', 'disabled')):
        raise IntakeError('source access metadata incomplete or restricted')
    if (payload.get('cardData') or {}).get('license') != model['license']:
        raise IntakeError('license metadata mismatch')
    if material_identity(payload) != model['substantiveInventorySha256']:
        raise IntakeError('substantive inventory differs from reviewed pin')
    files = {}
    for name, expected in model['reviewedFiles'].items():
        text = read(repo, revision, name)
        if len(text) > 128 * 1024 or hashlib.sha256(text).hexdigest() != expected:
            raise IntakeError('reviewed LICENSE/config bytes differ')
        if name == 'config.json' and not isinstance(loads(text), dict):
            raise IntakeError('configuration must be a JSON object')
        files[name] = expected
    return {**model, 'private':False, 'gated':False, 'disabled':False,
        'metadataResponseSha256':hashlib.sha256(raw).hexdigest(), 'verifiedTextFiles':files,
        'licenseApproved':False, 'remoteCodeAllowed':False, 'weightsDownloaded':False,
        'lineageClosureVerified':False}


def plan(wave: dict[str, Any]) -> dict[str, Any]:
    validate_wave(wave)
    return {'schema':'szl.frontier.family-intake-plan.v1','wave':wave['wave'],'waveSha256':digest(wave),
        'state':'EVALUATION_PREPARATION_ONLY','sourcePinsRecorded':5,'releaseFamilies':3,
        'accessMetadataVerification':'PENDING_LIVE_OBSERVATION','modelExecution':'NOT_PERFORMED',
        'benchmarkResults':None,'productionDisposition':'HOLD','modelOperational':False,
        'executionAuthorized':False,'weightsDownloaded':False,'upstreamCodeExecuted':False,
        'domainDeploymentPerformed':False,'licenseApproval':'PENDING_USE_SPECIFIC_REVIEW',
        'alignmentOrder':wave['alignment']['order']}


def observe(wave: dict[str, Any], source_sha: str) -> dict[str, Any]:
    validate_wave(wave)
    actual = subprocess.run(['git','rev-parse','HEAD'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    if not SHA40.fullmatch(source_sha) or actual != source_sha:
        raise IntakeError('checked source differs from declared revision')
    rows, errors = [], []
    for model in wave['observedModels']:
        try:
            rows.append(observe_one(model))
        except Exception as exc:
            errors.append({'repoId':model['repoId'],'errorType':type(exc).__name__,
                           'reason':str(exc) if isinstance(exc, IntakeError) else 'primary-source observation unavailable'})
    body = {'schema':'szl.frontier.upstream-model-pin-set.v1','authority':'PUBLIC_METADATA_ONLY',
        'sourceRepository':SOURCE,'sourceRevision':actual,'sourceBinding':'actual checkout, not a protected-main or runtime claim',
        'collectorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'observedAt':datetime.now(timezone.utc).isoformat(),'models':rows}
    pins = {**body,'receipt':{'algorithm':'sha256','scope':'canonical-json(body-without-receipt)',
        'canonicalBytes':len(canonical(body)),'digest':digest(body)}}
    report = {'schema':'szl.frontier.family-source-witness.v1','status':'INCOMPLETE' if errors else 'OBSERVED',
        'errors':errors,'successfulSources':len(rows),'sourceCount':5,'pinSet':pins,
        'productionDisposition':'HOLD','modelOperational':False,'weightsDownloaded':False,'upstreamCodeExecuted':False}
    if not errors:
        from .wave_plan import compile_plan
        report['evaluationPlan'] = compile_plan(wave, pins)
    report['recordSha256'] = digest(report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('plan','observe'), nargs='?', default='plan')
    parser.add_argument('--source-revision')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        wave = loads(WAVE_PATH.read_bytes())
        if args.command == 'observe' and not args.source_revision:
            raise IntakeError('observe requires actual source revision')
        report = plan(wave) if args.command == 'plan' else observe(wave, args.source_revision)
    except Exception as exc:
        report = {'status':'INCOMPLETE','errorType':type(exc).__name__,'productionDisposition':'HOLD','modelOperational':False}
    text = json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Never overwrite prior evidence, including a success or a symlink target.
        with args.output.open('x', encoding='utf-8') as stream:
            stream.write(text)
    else:
        print(text, end='')
    return 1 if report.get('status') == 'INCOMPLETE' else 0


if __name__ == '__main__':
    raise SystemExit(main())
