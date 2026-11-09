"""Complete bounded inventories through urllib's actual transport machinery."""
from __future__ import annotations

import io
import json
import unittest
from email.message import Message
from unittest.mock import patch
from urllib.request import OpenerDirector
from urllib.response import addinfourl

from szl_frontier.huggingface import HuggingFaceClient, StdlibTransport, TransportError

START = "https://huggingface.co/api/models?author=Example&limit=1000&full=false&config=false"
NEXT = START + "&cursor=second"


def row(name, sha="revision", modified="2026-11-01T00:00:00Z"):
    return {"id": "Example/" + name, "sha": sha, "lastModified": modified}


class InventoryPaginationTests(unittest.TestCase):
    def setUp(self):
        self.routes = {}
        self.requests = []
        mocked = patch.object(OpenerDirector, "_open", autospec=True, side_effect=self.respond)
        mocked.start()
        self.addCleanup(mocked.stop)

    def respond(self, opener, request, data=None):
        self.requests.append(request)
        status, headers, payload = self.routes[request.full_url]
        message = Message()
        for key, value in headers:
            message[key] = value
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        response = addinfourl(io.BytesIO(body), message, request.full_url, status)
        response.msg = "synthetic response"
        return response

    def snapshot(self):
        return HuggingFaceClient(StdlibTransport())._snapshot_model_inventory("Example")

    def test_two_pages_contribute_count_bytes_and_fingerprint(self):
        first, second = [row("first")], [row("second", modified="2026-11-02T00:00:00Z")]
        self.routes = {START: (200, [("Link", f'<{NEXT}>; rel="next"')], first), NEXT: (200, [], second)}
        snapshot = self.snapshot()
        self.assertEqual(snapshot.inventory_count, 2)
        self.assertEqual(snapshot.content_bytes, len(json.dumps(first).encode()) + len(json.dumps(second).encode()))
        self.assertEqual(snapshot.last_modified, second[0]["lastModified"])
        self.assertEqual(snapshot.source, START)
        self.routes[NEXT] = (200, [], [row("second", sha="new revision")])
        self.assertNotEqual(snapshot.artifact_fingerprint, self.snapshot().artifact_fingerprint)
        for request in self.requests:
            headers = {k.lower(): v for k, v in request.header_items()}
            self.assertNotIn("authorization", headers)
            self.assertNotIn("cookie", headers)

    def test_fingerprint_does_not_depend_on_page_partition(self):
        self.routes = {START: (200, [], [row("second"), row("first")])}
        single = self.snapshot()
        self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]), NEXT: (200, [], [row("second")])}
        self.assertEqual(single.artifact_fingerprint, self.snapshot().artifact_fingerprint)

    def test_repeated_header_fields_and_quoted_commas_preserve_next(self):
        headers = [("Link", f'<{NEXT}>; title="part, two; next"; rel="next"'),
                   ("Link", f'<{START}>; rel="first"')]
        self.routes = {START: (200, headers, [row("first")]), NEXT: (200, [], [row("second")])}
        self.assertEqual(self.snapshot().inventory_count, 2)

    def test_relative_next_and_relation_list(self):
        relative = NEXT.removeprefix("https://huggingface.co")
        self.routes = {START: (200, [("Link", f'<{relative}>; rel="next last"')], [row("first")]), NEXT: (200, [], [row("second")])}
        self.assertEqual(self.snapshot().inventory_count, 2)

    def test_next_cannot_change_origin_path_author_or_query_scope(self):
        targets = [NEXT.replace("https:", "http:"), NEXT.replace("huggingface.co", "outside.invalid"),
                   NEXT.replace("/api/models", "/api/datasets"), NEXT.replace("Example", "Other"),
                   NEXT + "&author=Other", NEXT + "&filter=gguf", NEXT + "#hidden",
                   NEXT.replace("full=false", "full=true"), NEXT.replace("&limit=1000", ""),
                   NEXT.replace("cursor=second", "cursor="), NEXT + "&cursor=other"]
        for target in targets:
            with self.subTest(target=target):
                self.requests.clear()
                self.routes = {START: (200, [("Link", f'<{target}>; rel="next"')], [row("first")])}
                with self.assertRaises(TransportError): self.snapshot()
                self.assertEqual(len(self.requests), 1)

    def test_malformed_or_ambiguous_links_cannot_silently_finish(self):
        headers = ["garbage", f'<{NEXT}>; rel="next', f'<{NEXT}>; rel=next; rel=last',
                   f'<{NEXT}>; rel=next, <{NEXT}>; rel=next', f'<{NEXT}>; rel=next; anchor="/elsewhere"',
                   f'<{NEXT}>; rel=next,', f'<{NEXT}>; rel=', f'<{NEXT}>; title="missing rel"']
        for header in headers:
            with self.subTest(header=header):
                self.requests.clear()
                self.routes = {START: (200, [("Link", header)], [row("first")])}
                with self.assertRaises(TransportError): self.snapshot()
                self.assertEqual(len(self.requests), 1)

    def test_later_page_failure_cannot_return_first_page_snapshot(self):
        for status, payload in [(503, b"failure"), (200, b"not json"), (200, {"unexpected": []})]:
            with self.subTest(status=status, payload=payload):
                self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]), NEXT: (status, [], payload)}
                with self.assertRaises(TransportError): self.snapshot()

    def test_duplicate_ids_are_not_counted_twice(self):
        for items in ([row("first")], [row("first", sha="different")]):
            with self.subTest(items=items):
                self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]), NEXT: (200, [], items)}
                with self.assertRaises(TransportError): self.snapshot()

    def test_malformed_rows_cannot_disappear_from_complete_inventory(self):
        for item in (None, {}, {"id": 7}, {"id": "Other/model"}, {"id": "Example/"}, {"id": "Example/a", "modelId": "Example/b"}):
            with self.subTest(item=item):
                self.routes = {START: (200, [], [item])}
                with self.assertRaises(TransportError): self.snapshot()

    def test_cursor_cycle_is_rejected_before_refetch(self):
        self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]),
                       NEXT: (200, [("Link", f'<{START}>; rel=next')], [row("second")])}
        with self.assertRaises(TransportError): self.snapshot()
        self.assertEqual([r.full_url for r in self.requests], [START, NEXT])

    def test_page_limit_raises_instead_of_returning_partial_snapshot(self):
        third = START + "&cursor=third"
        self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]),
                       NEXT: (200, [("Link", f'<{third}>; rel=next')], [row("second")])}
        with patch("szl_frontier.huggingface.MAX_INVENTORY_PAGES", 2, create=True):
            with self.assertRaises(TransportError): self.snapshot()
        self.assertEqual(len(self.requests), 2)

    def test_aggregate_body_limit_applies_across_pages(self):
        self.routes = {START: (200, [("Link", f'<{NEXT}>; rel=next')], [row("first")]), NEXT: (200, [], [row("second")])}
        limit = len(json.dumps([row("first")]).encode()) + 1
        with patch("szl_frontier.huggingface.MAX_INVENTORY_BYTES", limit, create=True):
            with self.assertRaises(TransportError): self.snapshot()

    def test_final_redirected_response_must_remain_in_inventory_scope(self):
        outside = "https://huggingface.co/api/models?author=Other&limit=1000&full=false&config=false"
        self.routes = {START: (302, [("Location", outside)], b""), outside: (200, [], [row("first")])}
        with self.assertRaises(TransportError): self.snapshot()

    def test_empty_terminal_page_is_valid(self):
        self.routes = {START: (200, [], [])}
        self.assertEqual(self.snapshot().inventory_count, 0)

    def test_redirect_cannot_skip_to_an_unseen_cursor(self):
        self.routes = {START: (302, [("Location", NEXT)], b""), NEXT: (200, [], [row("second")])}
        with self.assertRaises(TransportError): self.snapshot()
        self.assertEqual([request.full_url for request in self.requests], [START, NEXT])
