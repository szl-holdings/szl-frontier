# SPDX-License-Identifier: Apache-2.0
"""Verify the real archived report. No model execution is claimed by these tests."""
import copy
import hashlib
import json
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/frontier/neomme-smoke.v1.json'
FILE_SHA = '532bd787585fcde19c3b4f90b62bcde7e584ec0ef71bc4b3e65733e158aad9f2'
RECEIPT_SHA = 'e1584ec61cdaaa189891d3f0d5fcfb9d9c1803169a18bf0929daf5334754354d'
IDS = ['battery', 'solar', 'water', 'library', 'freight', 'seeds']
EXPECTED = ['battery', 'solar', 'water', 'library', 'freight', 'seeds', 'seeds', 'solar']


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()


def verify_seal(value):
    payload = dict(value)
    seal = payload.pop('receipt_sha256')
    if seal != RECEIPT_SHA or hashlib.sha256(canonical(payload)).hexdigest() != seal:
        raise ValueError('archived receipt changed')


class NeoMMEEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.raw = PUBLIC.read_bytes()
        self.report = json.loads(self.raw)

    def test_exact_mirror_and_canonical_bytes(self):
        self.assertEqual(self.raw, (ROOT / 'hf/dataset/neomme-smoke.v1.json').read_bytes())
        self.assertEqual(self.raw, canonical(self.report) + b'\n')
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(), FILE_SHA)

    def test_receipt_replays(self):
        verify_seal(self.report)

    def test_mutation_is_not_a_valid_receipt(self):
        for field, value in [('production_promotion', True), ('queries', 9), ('status', 'QUALIFIED')]:
            bad = copy.deepcopy(self.report); bad[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                verify_seal(bad)

    def test_no_authority_is_inferred(self):
        for field in ['production_promotion', 'training_performed', 'routing_changed', 'private_brain_loaded', 'trust_remote_code']:
            self.assertIs(self.report[field], False)
        self.assertEqual(self.report['status'], 'SMOKE_EXECUTED')
        self.assertEqual(self.report['runtime_qualification'], 'UNQUALIFIED')
        self.assertEqual(self.report['receipt_status'], 'UNSIGNED_HONEST')
        self.assertEqual(self.report['fixture_kind'], 'ORIGINAL_SYNTHETIC_SMOKE_NOT_INDEPENDENT_HELDOUT')

    def test_source_identities_remain_exact(self):
        self.assertEqual(self.report['model'], 'Hcompany/NeoMME-260M-Retriever')
        self.assertEqual(self.report['model_revision'], '0dcb6c924435bd0bf5d504dba9ba2bb63acd8595')
        self.assertEqual(self.report['harness_sha256'], 'c2baaebf25abada28df32d3af0f8038f4e6aead983c9d0e653bf5952f4db56a7')
        self.assertEqual(self.report['artifact_sha256']['model.safetensors'], self.report['weight_sha256'])
        self.assertEqual(len(self.report['image_rgb_sha256']), 6)

    def test_all_rankings_and_metrics_recompute(self):
        self.assertEqual(self.report['queries'], len(EXPECTED))
        self.assertEqual(self.report['documents'], len(IDS))
        self.assertEqual(set(self.report['cases']), {'text:dense_cosine', 'text:mean_maxsim', 'image:dense_cosine', 'image:mean_maxsim'})
        for entry in self.report['cases'].values():
            self.assertEqual(len(entry['scores']), len(EXPECTED))
            self.assertEqual(len(entry['rankings']), len(EXPECTED))
            positions = []
            for scores, ranking, target in zip(entry['scores'], entry['rankings'], EXPECTED):
                self.assertEqual(len(scores), len(IDS))
                self.assertTrue(all(type(s) is float and math.isfinite(s) for s in scores))
                recomputed = [IDS[i] for i in sorted(range(len(IDS)), key=lambda i: (-scores[i], IDS[i]))]
                self.assertEqual(ranking, recomputed)
                positions.append(ranking.index(target) + 1)
            n = len(EXPECTED)
            measured = {'top1': sum(p == 1 for p in positions) / n,
                        'recall_at_3': sum(p <= 3 for p in positions) / n,
                        'mrr': sum(1 / p for p in positions) / n,
                        'ndcg_at_3': sum(1 / math.log2(p + 1) if p <= 3 else 0 for p in positions) / n}
            self.assertEqual(entry['metrics'], measured)

    def test_observed_resource_values_are_complete(self):
        for lane, count in [('query', 8), ('text', 6), ('image', 6)]:
            values = self.report['encoding_seconds_by_item'][lane]
            self.assertEqual(len(values), count)
            self.assertTrue(all(math.isfinite(v) and v > 0 for v in values))
        self.assertGreater(self.report['max_rss_bytes_process_including_dependencies'], 0)
        self.assertGreater(self.report['elapsed_seconds'], 0)

    def test_viewer_is_digest_bound_and_fail_closed(self):
        page = (ROOT / 'public/frontier/neomme.html').read_text()
        script = (ROOT / 'public/frontier/neomme-evidence.js').read_text()
        self.assertIn('id="results" class="card" hidden', page)
        self.assertIn('not an independent held-out benchmark', page)
        self.assertIn(FILE_SHA, script)
        self.assertIn("byId('results').hidden = true", script)
        self.assertIn('crypto.subtle.digest', script)
        self.assertNotIn('innerHTML', script)


if __name__ == '__main__':
    unittest.main()
