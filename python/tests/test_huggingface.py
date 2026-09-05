from __future__ import annotations

import json
import unittest

from szl_frontier.catalog import PYTHON_ADMISSIONS
from szl_frontier.domain import FrontierRelease
from szl_frontier.huggingface import HttpResponse, HuggingFaceClient, TransportError


class FakeTransport:
    def __init__(self, responses: dict[str, HttpResponse]) -> None:
        self.responses = responses
        self.calls: list[str] = []

    def get(self, url: str, *, accept: str) -> HttpResponse:
        self.calls.append(url)
        return self.responses[url]


class HuggingFaceClientTests(unittest.TestCase):
    def test_dataset_snapshot_hashes_file_inventory(self) -> None:
        release = FrontierRelease.from_mapping(PYTHON_ADMISSIONS[0])
        url = "https://huggingface.co/api/datasets/TheAgenticDataCompany/open-yap-1k"
        payload = {
            "sha": "abc123",
            "lastModified": "2026-09-05T10:00:00Z",
            "private": False,
            "gated": False,
            "disabled": False,
            "downloads": 42,
            "likes": 7,
            "cardData": {"license": "cc-by-4.0"},
            "siblings": [
                {"rfilename": "README.md", "size": 100, "blobId": "one"},
                {"rfilename": "sample.parquet", "lfs": {"size": 200, "oid": "two"}},
            ],
        }
        response = HttpResponse(url=url, status=200, headers={}, body=json.dumps(payload).encode())
        client = HuggingFaceClient(FakeTransport({url: response}))
        snapshot = client.snapshot(release)
        self.assertEqual(snapshot.revision, "abc123")
        self.assertEqual(snapshot.license, "cc-by-4.0")
        self.assertEqual(len(snapshot.artifact_fingerprint or ""), 64)
        self.assertTrue(snapshot.publicly_usable)

    def test_transport_result_cannot_redirect_outside_hugging_face(self) -> None:
        release = FrontierRelease.from_mapping(PYTHON_ADMISSIONS[0])
        requested = "https://huggingface.co/api/datasets/TheAgenticDataCompany/open-yap-1k"
        payload = {"sha": "abc", "siblings": []}
        response = HttpResponse(
            url="https://evil.example/redirected",
            status=200,
            headers={},
            body=json.dumps(payload).encode(),
        )
        client = HuggingFaceClient(FakeTransport({requested: response}))
        with self.assertRaises(TransportError):
            client.snapshot(release)

    def test_blog_snapshot_rejects_non_html(self) -> None:
        release = FrontierRelease.from_mapping(PYTHON_ADMISSIONS[1])
        url = release.artifact_source
        response = HttpResponse(url=url, status=200, headers={}, body=b"not html")
        client = HuggingFaceClient(FakeTransport({url: response}))
        with self.assertRaises(TransportError):
            client.snapshot(release)

    def test_blog_snapshot_hashes_only_canonical_main_content(self) -> None:
        release = FrontierRelease.from_mapping(PYTHON_ADMISSIONS[1])
        url = release.artifact_source
        first = HttpResponse(
            url=url,
            status=200,
            headers={"last-modified": "one"},
            body=b"<html><head><script>volatile-one</script></head><body><main>stable article</main></body></html>",
        )
        second = HttpResponse(
            url=url,
            status=200,
            headers={"last-modified": "two"},
            body=b"<html><head><script>volatile-two</script></head><body><main>stable article</main></body></html>",
        )
        first_snapshot = HuggingFaceClient(FakeTransport({url: first})).snapshot(release)
        second_snapshot = HuggingFaceClient(FakeTransport({url: second})).snapshot(release)
        self.assertEqual(
            first_snapshot.artifact_fingerprint,
            second_snapshot.artifact_fingerprint,
        )
        self.assertEqual(first_snapshot.content_bytes, len(b"<main>stable article</main>"))

    def test_blog_snapshot_requires_exactly_one_main_element(self) -> None:
        release = FrontierRelease.from_mapping(PYTHON_ADMISSIONS[1])
        url = release.artifact_source
        response = HttpResponse(
            url=url,
            status=200,
            headers={},
            body=b"<html><body>article without canonical main</body></html>",
        )
        client = HuggingFaceClient(FakeTransport({url: response}))
        with self.assertRaises(TransportError):
            client.snapshot(release)
