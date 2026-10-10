# SPDX-License-Identifier: Apache-2.0
"""The publication classifier never turns a SHA match or a skipped deploy into LIVE."""

from __future__ import annotations

import unittest

from szl_frontier.publication_lag import PublicationLagError, classify_publication

GITHUB = "e" * 40
SERVED = "0" * 40
SPACE = "a" * 40


def observation(**overrides):
    payload = {
        "schema": "szl.frontier.publication-observation.v1",
        "github_sha": GITHUB,
        "served_sha": SERVED,
        "deploy_job": "skipped",
    }
    payload.update(overrides)
    return payload


class PublicationLagTests(unittest.TestCase):
    def test_skipped_deploy_with_different_shas_stays_lag(self) -> None:
        result = classify_publication(observation())
        self.assertEqual(result["relation"], "LAG")
        self.assertEqual(result["publication_class"], "LAG")
        self.assertEqual(result["deploy_job"], "skipped")
        self.assertIs(result["live"], False)
        self.assertIs(result["production_authorization"], False)
        self.assertEqual(result["space_relation"], "UNAVAILABLE")

    def test_equal_shas_are_reachable_and_not_live(self) -> None:
        result = classify_publication(observation(served_sha=GITHUB, deploy_job="executed", space_sha=GITHUB))
        self.assertEqual(result["relation"], "MATCH")
        self.assertEqual(result["publication_class"], "REACHABLE")
        self.assertEqual(result["space_relation"], "MATCH")
        self.assertIs(result["live"], False)
        self.assertNotIn("LIVE", result["publication_class"])

    def test_executed_deploy_does_not_erase_a_lag(self) -> None:
        result = classify_publication(observation(deploy_job="executed", space_sha=SPACE))
        self.assertEqual(result["relation"], "LAG")
        self.assertEqual(result["space_relation"], "LAG")
        self.assertIs(result["live"], False)

    def test_caller_live_flag_is_ignored(self) -> None:
        result = classify_publication(observation(served_sha=GITHUB, live=True, production_authorization=True))
        self.assertIs(result["live"], False)
        self.assertIs(result["production_authorization"], False)

    def test_rejects_malformed_inputs(self) -> None:
        cases = (
            observation(schema="other"),
            observation(github_sha=GITHUB.upper()),
            observation(github_sha=GITHUB[:-1]),
            observation(served_sha=True),
            observation(deploy_job="success"),
            observation(deploy_job=True),
            observation(space_sha="main"),
            [],
        )
        for payload in cases:
            with self.subTest(payload=payload):
                with self.assertRaises(PublicationLagError):
                    classify_publication(payload)


if __name__ == "__main__":
    unittest.main()
