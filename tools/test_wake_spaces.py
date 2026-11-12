# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
"""Offline tests for the anonymous Space wake that runs before the verifier.

No test contacts the Hub. A transport that is not injected fails closed.
"""
from __future__ import annotations

import ast
import importlib.util
import io
import json
import os
import sys
import threading
import urllib.parse
from pathlib import Path
from unittest import TestCase, mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "wake_spaces.py"
SPEC = importlib.util.spec_from_file_location("wake_spaces", SCRIPT)
assert SPEC and SPEC.loader
wake = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = wake
SPEC.loader.exec_module(wake)

SPACE = "SZLHOLDINGS/immune-lattice"
WAKE_URL = "https://szlholdings-immune-lattice.hf.space/"


class Ticker:
    def __init__(self):
        self.now = 0.0
        self.slept = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        if not isinstance(seconds, (int, float)) or isinstance(seconds, bool) or seconds <= 0:
            raise AssertionError(seconds)
        self.slept.append(seconds)
        self.now += seconds


def estate():
    return wake.load_verifier()


def response(status, body, url):
    payload = body if isinstance(body, bytes) else body.encode()
    return estate().HttpResponse(status, payload, {}, url)


class WakeSpaceTests(TestCase):
    def setUp(self):
        blocker = mock.patch(
            "socket.socket.connect",
            side_effect=AssertionError("network access is forbidden in wake fixtures"),
        )
        blocker.start()
        self.addCleanup(blocker.stop)

    def test_module_imports_are_stdlib_only(self):
        tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        modules = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                modules.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                modules.add(node.module.split(".")[0])
        self.assertTrue(modules)
        self.assertLessEqual(modules, set(sys.stdlib_module_names))

    def test_space_list_tracks_the_verifier_configuration(self):
        verifier = estate()
        original = (list(verifier.ORG_SPACES), list(verifier.CREATOR_SPACES), verifier.ORG_PROFILE_SPACE)

        def restore():
            verifier.ORG_SPACES, verifier.CREATOR_SPACES, verifier.ORG_PROFILE_SPACE = original

        self.addCleanup(restore)
        verifier.ORG_SPACES = ["immune-lattice", "added-space"]
        verifier.CREATOR_SPACES = ["SZLHOLDINGS/custom-creator", "not a space"]
        verifier.ORG_PROFILE_SPACE = "SZLHOLDINGS/README"
        self.assertEqual(wake.configured_space_ids(verifier), [
            "SZLHOLDINGS/README",
            "SZLHOLDINGS/added-space",
            "SZLHOLDINGS/custom-creator",
            "SZLHOLDINGS/immune-lattice",
        ])
        self.assertIn("immune-lattice", verifier.ORG_SPACES)

    def test_subdomain_and_wake_url_stay_on_this_space(self):
        self.assertEqual(wake.expected_subdomain(SPACE), "szlholdings-immune-lattice")
        self.assertEqual(
            wake.expected_subdomain("SZLHOLDINGS/szl-marketing-1.1"),
            "szlholdings-szl-marketing-1-1",
        )
        self.assertEqual(wake.expected_subdomain("Org/Name_With.Dot"), "org-name-with-dot")
        static = {
            "id": "SZLHOLDINGS/README",
            "subdomain": "szlholdings-readme",
            "host": "https://szlholdings-readme.static.hf.space",
        }
        self.assertEqual(
            wake.select_wake_url("SZLHOLDINGS/README", static),
            "https://szlholdings-readme.static.hf.space/",
        )
        poisoned = {
            "id": SPACE,
            "subdomain": "evil",
            "host": "https://evil.hf.space/steal?token=secret",
        }
        self.assertEqual(wake.select_wake_url(SPACE, poisoned), WAKE_URL)
        swapped = {
            "id": "SZLHOLDINGS/other",
            "subdomain": "szlholdings-immune-lattice",
            "host": "https://szlholdings-immune-lattice.static.hf.space",
        }
        self.assertEqual(wake.select_wake_url(SPACE, swapped), WAKE_URL)
        queried = {
            "id": SPACE,
            "subdomain": "szlholdings-immune-lattice",
            "host": "https://user:secret@szlholdings-immune-lattice.hf.space/?token=secret",
        }
        self.assertEqual(wake.select_wake_url(SPACE, queried), WAKE_URL)
        static_host = "https://szlholdings-readme.static.hf.space/"
        self.assertEqual(wake.validate_request_url(static_host), static_host)

    def test_http_get_is_anonymous_and_does_not_follow_redirects(self):
        opened = mock.Mock()
        opened.code = 302
        opened.status = 302
        opened.headers = {"Location": "https://example.com/collect"}
        opened.read.return_value = b""
        opener = mock.Mock()
        opener.open.return_value = opened
        target = WAKE_URL
        env = {
            "HF_TOKEN": "synthetic-test-token",
            "HUGGING_FACE_HUB_TOKEN": "synthetic-test-token",
            "HUGGINGFACE_HUB_TOKEN": "synthetic-test-token",
            "HF_HUB_TOKEN": "synthetic-test-token",
            "GITHUB_TOKEN": "synthetic-test-token",
            "HTTPS_PROXY": "http://synthetic:password@example.invalid",
        }
        with mock.patch.dict(os.environ, env):
            with mock.patch.object(wake.urllib.request, "build_opener", return_value=opener) as build:
                result = wake.http_get(target)
        self.assertEqual(result.status, 302)
        self.assertEqual(opener.open.call_count, 1)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, target)
        self.assertNotIn("synthetic-test-token", request.full_url)
        header_names = {key.lower() for key in request.headers}
        self.assertNotIn("authorization", header_names)
        self.assertNotIn("proxy-authorization", header_names)
        self.assertNotIn("cookie", header_names)
        proxy = next(arg for arg in build.call_args.args if isinstance(arg, wake.urllib.request.ProxyHandler))
        self.assertEqual(proxy.proxies, {})
        self.assertTrue(any(isinstance(arg, wake._NoRedirect) for arg in build.call_args.args))
        for banned in (
            "https://example.com/",
            "https://szlholdings-immune-lattice.hf.space/?token=secret",
            "https://user:pass@huggingface.co/api/spaces/SZLHOLDINGS/immune-lattice",
            "https://huggingface.co/api/models/SZLHOLDINGS/immune-lattice",
            "https://szlholdings-immune-lattice.hf.space.evil.invalid/",
        ):
            with self.subTest(url=banned):
                with self.assertRaises(ValueError):
                    wake.http_get(banned)

    def test_sleeping_space_is_polled_until_running(self):
        calls = []
        ticker = Ticker()
        get = self.scripted_get(["SLEEPING", "SLEEPING", "RUNNING"], calls)
        result = wake.wake_one(
            SPACE, get=get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=300, poll_interval_seconds=10,
        )
        self.assertTrue(result.reached_running)
        self.assertEqual(result.stage, "RUNNING")
        self.assertEqual(result.wake_url, WAKE_URL)
        self.assertEqual(calls[1], WAKE_URL)
        self.assertEqual(ticker.slept, [10])
        self.assertNotIn("authorization", " ".join(calls).lower())

    def test_running_building_does_not_finish_the_wait(self):
        calls = []
        ticker = Ticker()
        get = self.scripted_get(["RUNNING_BUILDING", "RUNNING_BUILDING", "RUNNING"], calls)
        result = wake.wake_one(
            SPACE, get=get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=300, poll_interval_seconds=10,
        )
        self.assertTrue(result.reached_running)
        self.assertTrue(ticker.slept)
        self.assertEqual(calls[1], WAKE_URL)

    def test_timeout_returns_without_raising_or_sleeping_past_the_budget(self):
        calls = []
        ticker = Ticker()
        get = self.scripted_get(["SLEEPING"], calls)
        result = wake.wake_one(
            SPACE, get=get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=25, poll_interval_seconds=10,
        )
        self.assertFalse(result.reached_running)
        self.assertTrue(result.timed_out)
        self.assertEqual(result.stage, "SLEEPING")
        self.assertEqual(result.error, None)
        self.assertEqual(ticker.now, 25)
        self.assertLessEqual(sum(ticker.slept), 25)
        self.assertEqual(calls[1], WAKE_URL)
        self.assertTrue(all(url == WAKE_URL or url.startswith("https://huggingface.co/api/spaces/") for url in calls))

    def test_anonymous_401_does_not_consume_the_running_timeout(self):
        calls = []
        ticker = Ticker()
        get = self.scripted_get([401], calls)
        result = wake.wake_one(
            SPACE, get=get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=300, poll_interval_seconds=10,
        )
        self.assertFalse(result.reached_running)
        self.assertFalse(result.timed_out)
        self.assertEqual(result.http_status, 401)
        self.assertEqual(result.stage, None)
        self.assertEqual(ticker.slept, [])
        self.assertEqual(calls[1], WAKE_URL)

    def test_non_200_body_claiming_running_is_not_running(self):
        calls = []
        ticker = Ticker()
        get = self.scripted_get([401], calls)
        result = wake.wake_one(
            SPACE, get=get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=30, poll_interval_seconds=10,
        )
        self.assertFalse(result.reached_running)
        self.assertIsNone(result.stage)
        self.assertEqual(ticker.slept, [])

    def test_static_host_from_matching_metadata_is_requested(self):
        sid = "SZLHOLDINGS/README"
        calls = []
        body = json.dumps({
            "id": sid,
            "subdomain": "szlholdings-readme",
            "host": "https://szlholdings-readme.static.hf.space",
            "runtime": {"stage": "RUNNING"},
        }).encode()

        def get(url):
            calls.append(url)
            if urllib.parse.urlsplit(url).hostname == "huggingface.co":
                return response(200, body, url)
            return response(200, b"", url)

        def fail_sleep(seconds):
            raise AssertionError(f"slept {seconds}")

        result = wake.wake_one(
            sid, get=get, sleep=fail_sleep, monotonic=lambda: 0.0,
            timeout_seconds=30, poll_interval_seconds=10,
        )
        self.assertTrue(result.reached_running)
        self.assertIn("https://szlholdings-readme.static.hf.space/", calls)
        self.assertNotIn("https://szlholdings-readme.hf.space/", calls)

    def test_invalid_id_is_not_requested_and_one_failure_does_not_drop_the_other(self):
        calls = []
        lock = threading.Lock()

        def get(url):
            with lock:
                calls.append(url)
            if "immune-lattice" in url:
                raise RuntimeError("boom")
            sid = "SZLHOLDINGS/a11oy"
            body = json.dumps({
                "id": sid,
                "subdomain": "szlholdings-a11oy",
                "host": "https://szlholdings-a11oy.hf.space",
                "runtime": {"stage": "RUNNING"},
            }).encode()
            return response(200, body, url)

        results = wake.wake_all(
            ["not a space", SPACE, "SZLHOLDINGS/a11oy"],
            get=get, sleep=lambda _seconds: None, monotonic=lambda: 0.0,
            timeout_seconds=30, poll_interval_seconds=10, max_workers=2,
        )
        by_space = {item.space: item for item in results}
        self.assertEqual(by_space["not a space"].error, "invalid space id")
        self.assertIn("boom", by_space[SPACE].error)
        self.assertTrue(by_space["SZLHOLDINGS/a11oy"].reached_running)
        self.assertFalse(any("not a space" in url or "nota" in url for url in calls))

    def test_public_listing_adds_only_this_orgs_spaces(self):
        extra = "SZLHOLDINGS/agents-studio"
        foreign = "other-org/space"
        listing = json.dumps([
            {"id": extra},
            {"id": extra},
            {"id": foreign},
            {"id": "not a space"},
        ]).encode()
        calls = []
        ticker = Ticker()

        def get(url):
            calls.append(url)
            parts = urllib.parse.urlsplit(url)
            if parts.hostname == "huggingface.co" and parts.path == "/api/spaces":
                return response(200, listing, url)
            if parts.hostname == "huggingface.co" and parts.path.startswith("/api/spaces/"):
                sid = urllib.parse.unquote(parts.path[len("/api/spaces/"):])
                subdomain = wake.expected_subdomain(sid)
                body = json.dumps({
                    "id": sid,
                    "subdomain": subdomain,
                    "host": f"https://{subdomain}.hf.space",
                    "runtime": {"stage": "RUNNING"},
                }).encode()
                return response(200, body, url)
            self.assertTrue(parts.hostname and parts.hostname.endswith(".hf.space"), url)
            self.assertFalse(parts.query, url)
            self.assertIn(parts.path, ("", "/"), url)
            return response(200, b"", url)

        report = wake.run(
            get, sleep=ticker.sleep, monotonic=ticker.monotonic,
            timeout_seconds=5, poll_interval_seconds=1, max_workers=1,
        )
        woken = {item.space for item in report.results}
        self.assertIn(extra, woken)
        self.assertIn(SPACE, woken)
        self.assertIn(estate().ORG_PROFILE_SPACE, woken)
        self.assertNotIn(foreign, woken)
        self.assertTrue(all(item.reached_running for item in report.results))
        self.assertEqual(ticker.slept, [])
        hosts = {urllib.parse.urlsplit(url).hostname for url in calls}
        self.assertNotIn("other-org-space.hf.space", hosts)
        self.assertIn("szlholdings-immune-lattice.hf.space", hosts)

    def test_main_exits_zero_when_spaces_stay_unreadable(self):
        calls = []
        lock = threading.Lock()
        ticker = Ticker()

        def get(url):
            with lock:
                calls.append(url)
            parts = urllib.parse.urlsplit(url)
            if parts.hostname and parts.hostname.endswith(".hf.space"):
                self.assertFalse(parts.query)
                return response(503, b"", url)
            return response(401, b'{"error":"Invalid username or password."}', url)

        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch("sys.stdout", stdout), mock.patch("sys.stderr", stderr):
            code = wake.main(argv=[], get=get, sleep=ticker.sleep, monotonic=ticker.monotonic)
        self.assertEqual(code, 0)
        self.assertEqual(ticker.slept, [])
        self.assertIn("the verifier decides the receipt", stdout.getvalue())
        self.assertIn(SPACE, stdout.getvalue())
        self.assertTrue(calls)
        self.assertTrue(all("token" not in url for url in calls))

    def scripted_get(self, stages, calls):
        queue = list(stages)

        def get(url):
            calls.append(url)
            parts = urllib.parse.urlsplit(url)
            if parts.hostname != "huggingface.co":
                self.assertEqual(url, WAKE_URL)
                return response(200, b"", url)
            stage = queue.pop(0) if queue else stages[-1]
            if isinstance(stage, int):
                return response(stage, b'{"runtime":{"stage":"RUNNING"}}', url)
            sid = urllib.parse.unquote(parts.path[len("/api/spaces/"):])
            subdomain = wake.expected_subdomain(sid)
            body = json.dumps({
                "id": sid,
                "subdomain": subdomain,
                "host": f"https://{subdomain}.hf.space",
                "runtime": {"stage": stage},
            }).encode()
            return response(200, body, url)

        return get
