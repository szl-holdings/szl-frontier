"""Exercise urllib's real redirect machinery without opening a network socket."""

from __future__ import annotations

import io
import unittest
from email.message import Message
from unittest.mock import patch
from urllib.request import OpenerDirector
from urllib.response import addinfourl

from szl_frontier.huggingface import StdlibTransport, TransportError, USER_AGENT


ORIGIN = "https://huggingface.co"
START = ORIGIN + "/api/models/synthetic"
REDIRECT_CODES = (301, 302, 303, 307, 308)


class StdlibTransportRedirectTests(unittest.TestCase):
    def setUp(self) -> None:
        self.routes = {}
        self.requests = []
        # _open is the send boundary for every scheme. The rest of urllib,
        # including redirect resolution and dispatch, runs unchanged.
        mocked = patch.object(OpenerDirector, "_open", autospec=True, side_effect=self.respond)
        mocked.start()
        self.addCleanup(mocked.stop)

    def respond(self, opener, request, data=None):
        self.requests.append(request)
        status, headers, body = self.routes[request.full_url]
        message = Message()
        for name, value in headers.items():
            message[name] = value
        response = addinfourl(io.BytesIO(body), message, request.full_url, status)
        response.msg = "synthetic response"
        return response

    def test_rejects_disallowed_redirect_before_next_request(self) -> None:
        targets = (
            "https://elsewhere.invalid/target",
            "http://huggingface.co/target",
            "https://huggingface.co:444/target",
            "https://huggingface.co.elsewhere.invalid/target",
            "https://synthetic-user@huggingface.co/target",
            "//elsewhere.invalid/target",
        )
        for code in REDIRECT_CODES:
            for target in targets:
                with self.subTest(code=code, target=target):
                    self.requests.clear()
                    absolute = "https:" + target if target.startswith("//") else target
                    self.routes = {
                        START: (code, {"Location": target}, b""),
                        absolute: (200, {}, b"must never be requested"),
                    }
                    with self.assertRaises(TransportError):
                        StdlibTransport().get(START, accept="application/json")
                    self.assertEqual([request.full_url for request in self.requests], [START])

    def test_preserves_same_origin_absolute_relative_and_scheme_relative_redirects(self) -> None:
        final = ORIGIN + "/target?revision=synthetic"
        for code in REDIRECT_CODES:
            for target in (final, "/target?revision=synthetic", "//huggingface.co/target?revision=synthetic"):
                with self.subTest(code=code, target=target):
                    self.requests.clear()
                    self.routes = {START: (code, {"Location": target}, b""), final: (200, {}, b"{}")}
                    result = StdlibTransport(timeout_seconds=3).get(START, accept="application/json")
                    self.assertEqual((result.url, result.status, result.body), (final, 200, b"{}"))
                    self.assertEqual([request.full_url for request in self.requests], [START, final])
                    for request in self.requests:
                        headers = {key.lower(): value for key, value in request.header_items()}
                        self.assertEqual(headers["accept"], "application/json")
                        self.assertEqual(headers["user-agent"], USER_AGENT)
                        self.assertNotIn("authorization", headers)
                        self.assertNotIn("cookie", headers)
                        self.assertEqual(request.get_method(), "GET")
                        self.assertIsNone(request.data)
                        self.assertEqual(request.timeout, 3)

    def test_revalidates_each_hop(self) -> None:
        middle = ORIGIN + "/middle"
        outside = "https://elsewhere.invalid/target"
        self.routes = {
            START: (302, {"Location": "/middle"}, b""),
            middle: (307, {"Location": outside}, b""),
            outside: (200, {}, b"must never be requested"),
        }
        with self.assertRaises(TransportError):
            StdlibTransport().get(START, accept="application/json")
        self.assertEqual([request.full_url for request in self.requests], [START, middle])

    def test_response_limits_still_apply_after_redirect(self) -> None:
        final = ORIGIN + "/target"
        for headers, body in (({"Content-Length": "100"}, b""), ({}, b"12345")):
            with self.subTest(headers=headers):
                self.routes = {START: (302, {"Location": final}, b""), final: (200, headers, body)}
                with self.assertRaisesRegex(TransportError, "response exceeds 4 bytes"):
                    StdlibTransport(max_response_bytes=4).get(START, accept="application/json")

    def test_redirect_loop_remains_bounded(self) -> None:
        self.routes = {START: (302, {"Location": START}, b"")}
        with self.assertRaises(TransportError):
            StdlibTransport().get(START, accept="application/json")
        self.assertLess(len(self.requests), 10)

    def test_disallowed_initial_url_never_reaches_send_boundary(self) -> None:
        with self.assertRaises(TransportError):
            StdlibTransport().get("https://elsewhere.invalid/target", accept="application/json")
        self.assertEqual(self.requests, [])
