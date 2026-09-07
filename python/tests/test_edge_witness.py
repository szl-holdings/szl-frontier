"""Offline witness validation tests; fixtures are never live model evidence."""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('edge_witness_under_test', ROOT / 'python/szl_frontier/edge_witness.py')
assert SPEC is not None and SPEC.loader is not None
witness = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(witness)

PINS = {'fixture/model': '1' * 40, 'fixture/data': '2' * 40}


def report():
    return {'schema': 'szl.frontier.watch-output.v1', 'live': True,
            'sourceCount': 2, 'successfulSources': 2, 'errors': [],
            'productionPromotion': False, 'materialCandidates': [],
            'sourceResults': [{'status': 'ok', 'repoId': repo,
                'baselineRevision': pin, 'observedRevision': pin,
                'baselineFingerprint': '3' * 64, 'artifactFingerprint': '3' * 64,
                'materialChange': False} for repo, pin in PINS.items()]}


def context():
    ref = 'refs/pull/27/merge'
    return {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': witness.SOURCE_REPOSITORY,
            'GITHUB_SHA': '1' * 40, 'GITHUB_REF': ref, 'GITHUB_EVENT_NAME': 'pull_request',
            'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1',
            'GITHUB_WORKFLOW_REF': witness.SOURCE_REPOSITORY + '/.github/workflows/edge-source-witness.yml@' + ref}


class ScanValidationTests(unittest.TestCase):
    def test_complete_pin_observation_is_accepted(self):
        witness.validate_scan(report(), PINS)

    def test_offline_scan_cannot_become_live_witness(self):
        value = report()
        value['live'] = False
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_production_promotion_is_rejected(self):
        value = report()
        value['productionPromotion'] = True
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_partial_sources_are_not_a_clean_scan(self):
        for change in [{'successfulSources': 1}, {'sourceCount': 1}, {'errors': ['fixture']},
                       {'sourceResults': []}, {'sourceCount': True}]:
            with self.subTest(change=change):
                value = report()
                value.update(change)
                with self.assertRaises(witness.WitnessError):
                    witness.validate_scan(value, PINS)

    def test_duplicate_source_cannot_cover_a_missing_source(self):
        value = report()
        value['sourceResults'][1] = copy.deepcopy(value['sourceResults'][0])
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_unknown_source_cannot_substitute_for_an_admitted_source(self):
        value = report()
        value['sourceResults'][1]['repoId'] = 'other/data'
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_wrong_or_missing_pins_fail_closed(self):
        for change in [{'baselineRevision': '4' * 40}, {'observedRevision': 'main'},
                       {'baselineFingerprint': None}, {'artifactFingerprint': 'invalid'}, {'status': 'error'}]:
            with self.subTest(change=change):
                value = report()
                value['sourceResults'][0].update(change)
                with self.assertRaises(witness.WitnessError):
                    witness.validate_scan(value, PINS)

    def test_change_verdict_must_match_fingerprints(self):
        value = report()
        value['sourceResults'][0]['artifactFingerprint'] = '4' * 64
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_material_change_is_observation_not_promotion(self):
        value = report()
        value['sourceResults'][0].update(artifactFingerprint='4' * 64, materialChange=True)
        value['materialCandidates'] = [{'productionDisposition': 'HOLD'}]
        witness.validate_scan(value, PINS)
        value['materialCandidates'][0]['productionDisposition'] = 'PROMOTE'
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_changed_identity_requires_candidate(self):
        value = report()
        value['sourceResults'][0].update(artifactFingerprint='4' * 64, materialChange=True)
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(value, PINS)

    def test_empty_baseline_is_rejected(self):
        with self.assertRaises(witness.WitnessError):
            witness.validate_scan(report(), {})

    def test_nonfinite_evidence_cannot_serialize(self):
        value = report()
        value['badMetric'] = float('inf')
        with self.assertRaises(ValueError):
            witness.validate_scan(value, PINS)


class SourceBindingTests(unittest.TestCase):
    def test_exact_pr_checkout_is_explicit_not_protected_main(self):
        with patch.object(witness.subprocess, 'run') as git:
            git.return_value.stdout = '1' * 40 + '\n'
            result = witness.source_context(ROOT, context())
        self.assertEqual(result['event'], 'pull_request')
        self.assertEqual(result['ref'], 'refs/pull/27/merge')
        self.assertIn('not-production-authorization', result['authority'])
        self.assertEqual(result['runId'], '123')

    def test_actual_checkout_must_match_event_sha(self):
        with patch.object(witness.subprocess, 'run') as git:
            git.return_value.stdout = '2' * 40
            with self.assertRaises(witness.WitnessError):
                witness.source_context(ROOT, context())

    def test_wrong_repo_or_nonactions_context_is_rejected(self):
        for change in [{'GITHUB_REPOSITORY': 'other/repo'}, {'GITHUB_ACTIONS': 'false'}, {'GITHUB_SHA': 'main'}]:
            with self.subTest(change=change):
                value = context()
                value.update(change)
                with self.assertRaises(witness.WitnessError):
                    witness.source_context(ROOT, value)

    def test_main_push_is_accepted_but_feature_dispatch_is_not(self):
        value = context()
        value.update(GITHUB_EVENT_NAME='push', GITHUB_REF='refs/heads/main')
        value['GITHUB_WORKFLOW_REF'] = witness.SOURCE_REPOSITORY + '/.github/workflows/edge-source-witness.yml@refs/heads/main'
        with patch.object(witness.subprocess, 'run') as git:
            git.return_value.stdout = '1' * 40
            self.assertEqual(witness.source_context(ROOT, value)['event'], 'push')
            value.update(GITHUB_EVENT_NAME='workflow_dispatch', GITHUB_REF='refs/heads/feature')
            with self.assertRaises(witness.WitnessError):
                witness.source_context(ROOT, value)

    def test_wrong_workflow_identity_and_run_attempt_are_rejected(self):
        for change in [{'GITHUB_WORKFLOW_REF': 'other/workflow@main'}, {'GITHUB_RUN_ID': 'abc'},
                       {'GITHUB_RUN_ATTEMPT': '0'}]:
            with self.subTest(change=change), patch.object(witness.subprocess, 'run') as git:
                git.return_value.stdout = '1' * 40
                value = context()
                value.update(change)
                with self.assertRaises(witness.WitnessError):
                    witness.source_context(ROOT, value)


class WitnessRecordTests(unittest.TestCase):
    def test_unsigned_record_is_content_addressed_not_a_runtime_claim(self):
        result = witness.make_witness(report(), {'event': 'fixture'}, PINS, {'fixture.py': '4' * 64})
        self.assertEqual(result['status'], 'PASS')
        for key in ['runtimeVerified', 'modelPerformanceVerified', 'trainingAuthorized', 'sealed']:
            self.assertFalse(result[key])
        self.assertEqual(result['productionDisposition'], 'HOLD')
        record_hash = result.pop('recordSha256')
        self.assertEqual(record_hash, hashlib.sha256(witness.canonical_bytes(result)).hexdigest())

    def test_incomplete_record_keeps_observation_errors(self):
        value = report()
        value['errors'] = [{'repoId': 'fixture/model', 'errorType': 'TimeoutError'}]
        result = witness.make_witness(value, {'event': 'fixture'}, PINS, {})
        self.assertEqual(result['status'], 'INCOMPLETE')
        self.assertFalse(result['metadataVerified'])
        self.assertTrue(result['validationErrors'])
        self.assertEqual(result['observations']['errors'], value['errors'])

    def test_atomic_failure_replaces_previous_success(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'record.json'
            witness.write_atomic(path, {'status': 'PASS'})
            witness.write_atomic(path, {'status': 'INCOMPLETE'})
            self.assertEqual(json.loads(path.read_text())['status'], 'INCOMPLETE')
            self.assertEqual([p.name for p in path.parent.iterdir()], ['record.json'])

    def test_workflow_retains_readonly_permissions_and_failure_evidence(self):
        workflow = (ROOT / '.github/workflows/edge-source-witness.yml').read_text()
        self.assertIn('contents: read', workflow)
        self.assertNotIn('secrets.', workflow)
        self.assertNotIn('pull_request_target', workflow)
        self.assertIn('persist-credentials: false', workflow)
        self.assertIn('if: always()', workflow)
        self.assertIn('python -m szl_frontier.edge_witness', workflow)
        self.assertIn('if-no-files-found: error', workflow)


if __name__ == '__main__':
    unittest.main()
