"""Offline validation regressions for the post-pagination Hub collector.

All network transport is replaced with synthetic byte responses. No receipt
signing, live collection, notifications or persistence is performed.
"""
from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from szl_frontier.catalog import Catalog
from szl_frontier.cli import run
from szl_frontier.domain import FrontierRelease
from szl_frontier.huggingface import HttpResponse, HuggingFaceClient, TransportError
from helpers import baseline_release

URL = "https://huggingface.co/api/models?author=Example&limit=1000&full=false&config=false"


class ByteTransport:
    def __init__(self, body, headers=None):
        self.body = body
        self.headers = headers or {}
        self.calls = []

    def get(self, url, *, accept):
        self.calls.append(url)
        return HttpResponse(url, 200, self.headers, self.body)


def collect(body, headers=None):
    return HuggingFaceClient(ByteTransport(body, headers))._snapshot_model_inventory("Example")


class InventoryValidationTests(unittest.TestCase):
    def test_duplicate_json_keys_are_not_last_value_wins(self):
        for body in (b'[{"id":"Other/no","id":"Example/one"}]',
                     b'[{"id":"Example/one","sha":"old","sha":"new"}]',
                     b'[{"id":"Example/one","extra":{"x":1,"x":2}}]'):
            with self.subTest(body=body), self.assertRaises(TransportError):
                collect(body)

    def test_non_finite_numbers_are_refused_even_in_unused_metadata(self):
        for value in ("NaN", "Infinity", "-Infinity", "1e999", "-1e999"):
            with self.subTest(value=value), self.assertRaises(TransportError):
                collect(('[{"id":"Example/one","extra":' + value + '}]').encode())

    def test_retained_metadata_must_be_optional_nonempty_text(self):
        for key in ("sha", "lastModified"):
            for value in (False, 0, 1, [], {}, "", " ", "\t\n"):
                with self.subTest(key=key, value=value), self.assertRaises(TransportError):
                    collect(json.dumps([{"id": "Example/one", key: value}]).encode())

    def test_lone_surrogate_metadata_is_a_handled_source_failure(self):
        for key in ("sha", "lastModified"):
            for value in ("\ud800", "\udfff", "valid\ud800text"):
                with self.subTest(key=key, value=repr(value)), self.assertRaises(TransportError):
                    collect(json.dumps([{"id": "Example/one", key: value}]).encode())

    def test_deep_json_is_a_handled_source_failure(self):
        with self.assertRaises(TransportError):
            collect(b"[" * 100_000 + b"]" * 100_000)

    def test_ids_require_repository_characters(self):
        for identity in ("Example/a b", "Example/a\nb", "Example/a?b", "Example/a#b", "Example/a%2Fb", "Example/\ud800"):
            with self.subTest(identity=repr(identity)), self.assertRaises(TransportError):
                collect(json.dumps([{"id": identity}]).encode())

    def test_case_variant_identity_is_not_counted_twice(self):
        with self.assertRaises(TransportError):
            collect(b'[{"id":"Example/one"},{"id":"example/ONE"}]')

    def test_malformed_link_url_is_a_handled_source_failure(self):
        with self.assertRaises(TransportError):
            collect(b'[{"id":"Example/one"}]', {"link": '<https://[bad]/>; rel="next"'})

    def test_optional_and_legacy_metadata_stay_supported(self):
        for item in ({"id": "Example/a"}, {"modelId": "Example/a"}, {"id": "Example/modèle"},
                     {"id": "Example/a", "sha": None, "lastModified": None},
                     {"id": "Example/a", "sha": "a" * 40, "lastModified": "2026-11-09T00:00:00Z", "extra": 2.5}):
            with self.subTest(item=item):
                self.assertEqual(collect(json.dumps([item]).encode()).inventory_count, 1)

    def test_unchanged_valid_rows_keep_the_existing_fingerprint(self):
        import hashlib
        rows = [{"id": "Example/a", "sha": "a" * 40, "lastModified": "2026-11-09T00:00:00Z"}]
        expected = hashlib.sha256(json.dumps(rows, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        snapshot = collect(json.dumps(rows).encode())
        self.assertEqual(snapshot.artifact_fingerprint, expected)
        self.assertEqual(snapshot.source, URL)

    def test_bad_inventory_does_not_abort_other_watch_sources(self):
        raw = baseline_release()
        raw["watch"] = {"kind": "model-inventory", "author": "Example", "baselineCount": 0}
        bad = FrontierRelease.from_mapping(raw)
        raw["id"] = "second-source"
        raw["watch"] = {"kind": "model-inventory", "author": "Second", "baselineCount": 0}
        good = FrontierRelease.from_mapping(raw)
        catalog = Catalog((bad, good), "2026-09-01T00:00:00Z", 70)

        class MixedTransport:
            def get(self, url, *, accept):
                body = (b'[{"id":"Example/one","sha":"\\ud800"}]' if "author=Example" in url
                        else b'[{"id":"Second/one"}]')
                return HttpResponse(url, 200, {}, body)

        output = io.StringIO()
        with patch("szl_frontier.cli.CatalogLoader.load", return_value=catalog), \
             patch("szl_frontier.huggingface.StdlibTransport", return_value=MixedTransport()), \
             redirect_stdout(output):
            code = run(["watch", "--require-complete"])
        report = json.loads(output.getvalue())
        self.assertEqual(code, 3)
        self.assertEqual(report["successfulSources"], 1)
        self.assertEqual(len(report["errors"]), 1)
        self.assertEqual([row["status"] for row in report["sourceResults"]], ["error", "ok"])
        self.assertEqual([row["id"] for row in report["materialCandidates"]], ["second-source"])
        self.assertFalse(report["productionPromotion"])


if __name__ == "__main__":
    unittest.main()
