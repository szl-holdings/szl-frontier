"""Transport and provider-evidence contracts; all responses are local fixtures."""
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import frontier_http as http
import frontier_inventory as inv


class TransportTests(unittest.TestCase):
    @staticmethod
    def response(url, data, headers=None):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.geturl.return_value = url
        response.read.return_value = json.dumps(data).encode()
        response.headers = headers or {}
        response.status = 200
        return response

    def test_pagination_header_case_and_rel_order(self):
        self.assertEqual(http.next_link({'lInK': '<https://api.github.com/p2>; type="json"; rel="NEXT last"'}),
                         'https://api.github.com/p2')

    def test_partial_page_failure_retains_prior_observations(self):
        client = http.Client()
        with patch.object(client, '_request', side_effect=[([{'id': 1}], {'link': '<https://api.github.com/p2>; rel="next"'}),
                                                           http.AuditError('failure', code='HTTP_403')]):
            with self.assertRaises(http.AuditError) as caught:
                client.pages('https://api.github.com/p1')
        self.assertEqual(caught.exception.partial, [{'id': 1}])
        self.assertEqual(caught.exception.code, 'HTTP_403')

    def test_pagination_foreign_origin_never_requested(self):
        client = http.Client(token='a-secret')
        with patch.object(client, '_request', return_value=([{'id': 1}], {'Link': '<https://evil.invalid/>; rel="next"'})) as request:
            with self.assertRaises(http.AuditError) as caught:
                client.pages('https://api.github.com/p1')
        self.assertEqual(request.call_count, 1)
        self.assertEqual(caught.exception.partial, [{'id': 1}])
        self.assertEqual(caught.exception.code, 'UNSAFE_URL')

    def test_redirect_cannot_forward_authorization(self):
        req = urllib.request.Request('https://api.github.com/a', headers={'Authorization': 'Bearer secret'})
        handler = http.SameOriginRedirect('api.github.com')
        with self.assertRaises(http.AuditError):
            handler.redirect_request(req, None, 302, 'redirect', {}, 'https://evil.invalid/')

    def test_unexpected_schema_is_not_an_empty_inventory(self):
        client = http.Client()
        with patch.object(client, '_request', return_value=({'error': 'unexpected'}, {})):
            with self.assertRaises(http.AuditError) as caught:
                client.pages('https://api.github.com/p1')
        self.assertEqual(caught.exception.code, 'INVALID_SCHEMA')

    def test_cycle_preserves_items_and_stops(self):
        client = http.Client()
        with patch.object(client, '_request', return_value=([{'id': 1}], {'Link': '<https://api.github.com/p1>; rel="next"'})) as request:
            with self.assertRaises(http.AuditError) as caught:
                client.pages('https://api.github.com/p1')
        self.assertEqual(request.call_count, 1)
        self.assertEqual(caught.exception.code, 'PAGINATION_LIMIT')

    def test_error_body_and_query_are_never_persisted(self):
        client = http.Client('known-secret')
        opener = unittest.mock.Mock()
        opener.open.side_effect = urllib.error.HTTPError('https://api.github.com/a?token=unknown-secret', 401,
                                                        'secret error message', {}, io.BytesIO(b'hf_secret_response_body'))
        client._local.opener = opener
        with self.assertRaises(http.AuditError) as caught:
            client.request('https://api.github.com/a?token=unknown-secret')
        self.assertEqual(str(caught.exception), 'HTTP 401 for /a')
        self.assertNotIn('secret', json.dumps(client.errors))

    def test_long_retry_after_defers_without_sleep_or_retry(self):
        client = http.Client()
        opener = unittest.mock.Mock()
        opener.open.side_effect = urllib.error.HTTPError('https://api.github.com/a', 429, 'wait',
                                                        {'Retry-After': '120'}, io.BytesIO())
        client._local.opener = opener
        with patch.object(http.time, 'sleep') as sleep:
            with self.assertRaises(http.AuditError) as caught:
                client.request('https://api.github.com/a')
        self.assertEqual(caught.exception.code, 'RATE_LIMITED')
        self.assertEqual(caught.exception.wait_seconds, 120)
        self.assertEqual(opener.open.call_count, 1)
        sleep.assert_not_called()

    def test_secret_patterns_and_url_credentials(self):
        source = 'https://user:password@example.com/path?token=abc Authorization: Bearer ghp_12345678901234567890'
        redacted = http.redact(source)
        for secret in ['user', 'password', 'abc', 'ghp_123']:
            self.assertNotIn(secret, redacted)

    def test_quota_latch_prevents_subsequent_network_and_retains_partial_pages(self):
        client = http.Client()
        first_url = 'https://api.github.com/p1'
        second_url = 'https://api.github.com/p2'
        opener = unittest.mock.Mock()
        opener.open.side_effect = [self.response(first_url, [{'id': 1}], {'Link': '<'+second_url+'>; rel="next"'}),
                                  urllib.error.HTTPError(second_url, 403, 'denied',
                                      {'X-RateLimit-Remaining': '0', 'X-RateLimit-Limit': '5000',
                                       'X-RateLimit-Reset': '2000', 'X-RateLimit-Resource': 'core'}, io.BytesIO())]
        client._local.opener = opener
        with patch.object(http.time, 'time', return_value=1000):
            with self.assertRaises(http.AuditError) as caught:
                client.pages(first_url)
            self.assertEqual(caught.exception.partial, [{'id': 1}])
            self.assertEqual(caught.exception.code, 'QUOTA_EXHAUSTED')
            self.assertEqual(inv._error('github:list', caught.exception)['rate_limit']['remaining'], 0)
            for _ in range(5):
                with self.assertRaises(http.AuditError) as latched:
                    client.request('https://api.github.com/other')
                self.assertEqual(latched.exception.rate_limit['reset_at'], '1970-01-01T00:33:20Z')
        self.assertEqual(opener.open.call_count, 2)
        self.assertEqual(client.requests, 2)
        self.assertEqual(client.stats['rate_limit']['remaining'], 0)
        self.assertEqual(http.Client(provider='huggingface')._quota_blocked_until, 0)

    def test_quota_latch_allows_fresh_attempt_after_known_reset(self):
        client = http.Client()
        url = 'https://api.github.com/a'
        opener = unittest.mock.Mock()
        opener.open.side_effect = [urllib.error.HTTPError(url, 403, 'denied',
                                      {'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '2000'}, io.BytesIO()),
                                  self.response(url, [], {'X-RateLimit-Remaining': '4999', 'X-RateLimit-Reset': '3000'})]
        client._local.opener = opener
        with patch.object(http.time, 'time', return_value=1000):
            with self.assertRaises(http.AuditError):
                client.request(url)
        with patch.object(http.time, 'time', return_value=2001):
            self.assertEqual(client.request(url), [])
        self.assertEqual(opener.open.call_count, 2)
        self.assertEqual(client.stats['rate_limit']['remaining'], 4999)

    def test_credential_resolution_uses_official_sdk_without_direct_cache_reads(self):
        sdk = unittest.mock.Mock()
        sdk.get_token.return_value = 'test-hf-token'
        with patch.dict(http.os.environ, {}, clear=True), patch.object(http.shutil, 'which', return_value=None), \
             patch.object(http.importlib, 'import_module', return_value=sdk) as load:
            github, hf, sources = http.resolve_credentials()
        self.assertEqual((github, hf), ('', 'test-hf-token'))
        self.assertEqual(sources['huggingface'], 'huggingface-sdk')
        load.assert_called_once_with('huggingface_hub')
        sdk.get_token.assert_called_once_with()


class InventoryTests(unittest.TestCase):
    def test_path_candidate_rules_do_not_label_documentation(self):
        for path in ['docs/security.md', 'src/tokens.css', 'docs/token-policy.md', '.env.example', '.env.template']:
            self.assertNotIn('secret-risk-path', inv.classify_path(path), path)
        for path in ['.env', '.env.production', 'credentials.json', '.ssh/id_ed25519']:
            self.assertIn('secret-risk-path', inv.classify_path(path), path)

    def test_weight_files_do_not_prove_training(self):
        self.assertEqual(inv.infer_hf_artifact('models', {'siblings': [{'rfilename': 'model.safetensors'}]}), 'weight-files-unverified')
        self.assertEqual(inv.infer_hf_artifact('models', {'tags': ['source-bound-kernel']}), 'kernel-tagged-unverified')

    def test_untrusted_space_host_is_never_requested(self):
        with patch.object(urllib.request, 'build_opener') as opener:
            for host in ['https://localhost/', 'https://good.hf.space.evil.invalid/', 'http://good.hf.space/', 'https://a.hf.space/?token=secret']:
                self.assertEqual(inv.probe_space_runtime({'host': host})['state'], 'UNKNOWN')
        opener.assert_not_called()

    def test_revision_and_workflow_pagination_are_pinned(self):
        sha = 'a' * 40
        tree = 'b' * 40
        client = unittest.mock.Mock()
        def pages(url, key=None):
            if '/branches?' in url:
                return [{'name': 'main', 'commit': {'sha': sha}, 'protected': True}]
            if '/check-runs?' in url:
                return [{'head_sha': sha, 'status': 'completed', 'conclusion': 'success'}]
            if '/actions/runs?' in url:
                self.assertIn('head_sha=' + sha, url)
                return [{'head_sha': sha, 'status': 'completed', 'conclusion': 'success'}]
            if '/actions/workflows?' in url:
                self.assertEqual(key, 'workflows')
            return []
        def request(url):
            if '/git/commits/' in url:
                self.assertTrue(url.endswith(sha))
                return {'sha': sha, 'tree': {'sha': tree}}
            if '/git/trees/' in url:
                self.assertIn(tree + '?recursive=1', url)
                return {'sha': tree, 'tree': [{'path': 'pyproject.toml', 'sha': 'c'*40}], 'truncated': False}
            return {}
        client.pages.side_effect = pages
        client.request.side_effect = request
        record, errors = inv._repo(client, 'org', {'name': 'repo', 'default_branch': 'main'})
        self.assertEqual(errors, [])
        self.assertEqual(record['audit_state'], 'OBSERVED')
        self.assertEqual(record['revision']['binding'], 'IMMUTABLE_COMMIT_AND_TREE')
        self.assertEqual(record['application_readiness'], 'UNKNOWN')
        self.assertEqual(record['ci']['evidence_class'], 'DECLARED')

    def test_private_hub_assets_filtered_and_partial_list_kept(self):
        class FakeClient:
            def __init__(self, token='', provider='github', **kwargs):
                self.provider = provider
                self.stats = {'requests': 1}
            def pages(self, url, key=None):
                if '/orgs/' in url:
                    return []
                if '/api/models?' in url:
                    raise http.AuditError('page failed', partial=[{'id': 'org/public', 'private': False}, {'id': 'org/private', 'private': True}])
                return []
            def request(self, url):
                self_outer.assertNotIn('/private', url)
                return {'id': 'org/public', 'private': False, 'sha': 'a'*40, 'siblings': [], 'tags': ['license:mit']}
        self_outer = self
        with patch.object(inv, 'Client', FakeClient):
            result = inv.collect('org', 'org', '', '')
        self.assertEqual([a['id'] for a in result['huggingface']['models']], ['org/public'])
        self.assertFalse(result['coverage']['huggingface']['models']['complete'])
        self.assertEqual(result['coverage']['huggingface']['models']['excluded_private'], 1)
        self.assertEqual(result['huggingface']['models'][0]['license'], 'mit')
        self.assertEqual(result['huggingface']['models'][0]['evidence_class'], 'DECLARED')

    def test_unknown_privacy_is_excluded_and_coverage_cannot_be_complete(self):
        class FakeClient:
            def __init__(self, token='', provider='github', **kwargs):
                self.stats = {'requests': 1}
            def pages(self, url, key=None):
                if '/orgs/' in url:
                    return [{'name': 'unknown'}]
                if '/api/collections?' in url:
                    return [{'slug': 'org/missing'}, {'slug': 'org/invalid', 'private': 0},
                            {'slug': 'org/private', 'private': True}, {'slug': 'org/public', 'private': False}]
                return []
            def request(self, url):
                self_outer.assertTrue(url.endswith('/org/public'))
                return {'slug': 'org/public', 'private': False, 'owner': {'name': 'org'}, 'items': []}
        self_outer = self
        with patch.object(inv, 'Client', FakeClient):
            result = inv.collect('org', 'org', '', '')
        self.assertEqual(result['github'], [])
        self.assertEqual(result['coverage']['github']['excluded_unknown_privacy'], 1)
        self.assertFalse(result['coverage']['github']['complete'])
        self.assertEqual([r['id'] for r in result['huggingface']['collections']], ['org/public'])
        self.assertEqual(result['coverage']['huggingface']['collections']['excluded_unknown_privacy'], 2)
        self.assertEqual(result['coverage']['huggingface']['collections']['excluded_private'], 1)
        self.assertFalse(result['coverage']['huggingface']['collections']['complete'])


if __name__ == '__main__':
    unittest.main()
