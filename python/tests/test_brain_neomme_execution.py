# SPDX-License-Identifier: Apache-2.0
"""Archive consistency tests, not a repeat of native model inference."""
from pathlib import Path
import hashlib
import json
import math
import statistics
import unittest

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / 'public/frontier/brain-neomme-1.4.1.json'
EXPECTED_FILE_SHA256 = '4d304899485766fd5b5201a719be7baffce0be3d4f08df7ca2f2e29e5c4d9286'


class BrainNeoMMEExecutionTests(unittest.TestCase):
    def setUp(self):
        self.raw = PATH.read_bytes()
        self.value = json.loads(self.raw)
        self.measured = self.value['measured_job_summary']

    def test_exact_public_dataset_projection(self):
        self.assertEqual(self.raw, (ROOT / 'hf/dataset/brain-neomme-1.4.1.json').read_bytes())
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(), EXPECTED_FILE_SHA256)
        canonical = json.dumps(self.value, sort_keys=True, indent=2, ensure_ascii=True, allow_nan=False).encode() + b'\n'
        self.assertEqual(self.raw, canonical)

    def test_identity_and_scope_are_explicit(self):
        self.assertEqual(self.measured['source_revision'], '76e1eb42a115b41724fa469ba238f1d81bd13583')
        self.assertEqual(self.measured['installed_package'], '1.4.1')
        self.assertEqual(self.value['model_revision'], '0dcb6c924435bd0bf5d504dba9ba2bb63acd8595')
        self.assertEqual(self.value['corpus_sha256'], '387337acbd8fe443637102fe7ea75387fa4c3d9d746d8ab6e2d14d6c138aad8f')
        self.assertEqual(self.measured['indexed_rows'], 575)
        self.assertEqual(self.measured['diagnostic_queries_each_process'], 8)
        self.assertEqual(self.value['evidence_kind'], 'CAPTURED_JOB_SUMMARY_NOT_FULL_EXECUTION_RECEIPT')
        self.assertEqual(self.value['job_stage_observed'], 'COMPLETED')

    def test_metrics_recompute_without_dropping_cold_state(self):
        for key in ['uncached_observed_seconds', 'warm_cached_seconds', 'cold_restore_seconds_by_query']:
            values = self.measured[key]
            self.assertEqual(len(values), 8)
            self.assertTrue(all(type(v) in (int, float) and math.isfinite(v) and v > 0 for v in values))
        self.assertEqual(statistics.median(self.measured['uncached_observed_seconds']), self.measured['uncached_median_seconds'])
        self.assertEqual(statistics.median(self.measured['warm_cached_seconds']), self.measured['warm_cache_median_seconds'])
        self.assertIn('cold', self.value['comparison_limit'].lower())
        self.assertIs(self.value['causal_speedup_established'], False)

    def test_completed_restore_and_cache_budget(self):
        self.assertEqual(self.measured['status'], 'PASS')
        for key in ['all_hydration_digests_match', 'fresh_process_rankings_identical', 'uncached_observed_rankings_identical']:
            self.assertIs(self.measured[key], True)
        for key in ['first_process_cache', 'fresh_process_cache']:
            cache = self.measured[key]
            self.assertGreater(cache['payload_bytes'], 0)
            self.assertLessEqual(cache['payload_bytes'], cache['max_bytes'])
        self.assertGreater(self.measured['first_process_cache']['hits'], 0)
        self.assertGreater(self.measured['fresh_process_cache']['misses'], 0)
        for field in ['index_sha256', 'build_receipt_sha256', 'restore_receipt_sha256']:
            self.assertRegex(self.measured[field], r'^[0-9a-f]{64}$')

    def test_no_inferred_deployment_quality_or_private_authority(self):
        for key in ['independent_relevance_evaluation', 'production_promoted', 'private_graph_loaded']:
            self.assertIs(self.measured[key], False)
        self.assertEqual(self.value['runtime_default_changed'], False)
        self.assertEqual(self.value['private_memory_durability'], 'NOT_TESTED')
        self.assertEqual(self.value['persistence_scope'], 'FRESH_PYTHON_PROCESS_SAME_JOB_FILESYSTEM')
        self.assertEqual(self.value['signature'], None)
        self.assertEqual(self.value['product_domain_state'], 'NOT_INFERRED')
        self.assertEqual(self.value['proof_domain_state'], 'NOT_INFERRED')
        self.assertEqual(self.value['uncached_job_final_state'], 'ERROR_JOB_TIMEOUT')
        self.assertIs(self.value['uncached_first_process_completed'], True)


if __name__ == '__main__':
    unittest.main()
