# SPDX-License-Identifier: Apache-2.0
"""Classify a GitHub revision against the revision a surface actually serves.

Stdlib only. This module does not dispatch a sync, open a deploy window, or
authorize production. A completed sync whose deploy job was skipped did not
move the served revision. Equal SHAs are REACHABLE. They are not LIVE.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

SCHEMA_IN = "szl.frontier.publication-observation.v1"
SCHEMA_OUT = "szl.frontier.publication-lag.v1"
SHA40 = re.compile(r"[0-9a-f]{40}\Z")
DEPLOY_JOBS = {"executed", "skipped", "unavailable"}

LIMITS = (
    "Equal revisions are REACHABLE, not LIVE.",
    "A skipped deploy does not move the served revision.",
    "An executed deploy still requires the served readback.",
    "This record does not authorize production or dispatch a sync.",
)


class PublicationLagError(ValueError):
    """The observation cannot support a publication classification."""


def _require(ok: bool, code: str) -> None:
    if not ok:
        raise PublicationLagError(code)


def _sha(value: Any, code: str) -> str:
    _require(isinstance(value, str) and not isinstance(value, bool) and SHA40.fullmatch(value) is not None, code)
    return value


def classify_publication(observation: Mapping[str, Any]) -> dict[str, Any]:
    _require(isinstance(observation, Mapping) and not isinstance(observation, (str, bytes)), "OBSERVATION_OBJECT")
    _require(observation.get("schema") == SCHEMA_IN, "SCHEMA")
    github = _sha(observation.get("github_sha"), "GITHUB_SHA")
    served = _sha(observation.get("served_sha"), "SERVED_SHA")
    if "space_sha" not in observation or observation.get("space_sha") is None:
        space_sha = None
        space_relation = "UNAVAILABLE"
    else:
        space_sha = _sha(observation.get("space_sha"), "SPACE_SHA")
        space_relation = "MATCH" if space_sha == github else "LAG"
    deploy_job = observation.get("deploy_job")
    _require(isinstance(deploy_job, str) and deploy_job in DEPLOY_JOBS, "DEPLOY_JOB")
    if github == served:
        relation = "MATCH"
        publication_class = "REACHABLE"
    else:
        relation = "LAG"
        publication_class = "LAG"
    return {
        "schema": SCHEMA_OUT,
        "github_sha": github,
        "served_sha": served,
        "space_sha": space_sha,
        "relation": relation,
        "space_relation": space_relation,
        "deploy_job": deploy_job,
        "publication_class": publication_class,
        "live": False,
        "production_authorization": False,
        "limits": list(LIMITS),
    }
