"""Static cross-owner intake tests, not model performance evidence."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WAVE = ROOT / 'frontier/waves/2026-09-08-minicpm5-gguf.json'


class GGUFIntakeTests(unittest.TestCase):
    def setUp(self):
        self.wave = json.loads(WAVE.read_text(encoding='utf-8'))
        self.item = self.wave['candidates'][0]

    def test_extends_one_existing_lane_without_realerting_the_base(self):
        self.assertEqual(len(self.wave['candidates']), 1)
        self.assertFalse(self.wave['deduplication']['newBaseModel'])
        self.assertEqual(self.item['priority'], 'P1')
        self.assertEqual(self.item['primarySource'], 'https://huggingface.co/openbmb/MiniCPM5-2B-GGUF')

    def test_three_byte_identities_and_exact_runtime_are_required(self):
        self.assertEqual(set(self.item['files']), {'Q4_K_M', 'Q8_0', 'F16'})
        self.assertRegex(self.item['revision'], r'^[0-9a-f]{40}$')
        self.assertRegex(self.item['runtime']['revision'], r'^[0-9a-f]{40}$')
        self.assertRegex(self.item['runtime']['sha256'], r'^[0-9a-f]{64}$')
        for row in self.item['files'].values():
            self.assertTrue(row['filename'].endswith('.gguf'))
            self.assertIs(type(row['size']), int)
            self.assertGreater(row['size'], 0)
            self.assertRegex(row['sha256'], r'^[0-9a-f]{64}$')

    def test_historical_failure_is_not_bf16_or_matched_parity(self):
        baseline = self.item['baseline']
        self.assertEqual((baseline['passedCases'], baseline['expectedCases']), (9, 12))
        self.assertEqual(baseline['executionDtype'], 'float16')
        self.assertEqual(baseline['status'], 'SMOKE_FAIL')
        self.assertTrue(baseline['mustRemainUnchanged'])
        self.assertFalse(self.item['matchedQuantizationExperiment'])
        self.assertEqual(self.item['comparisonClass'], 'HISTORICAL_BEHAVIOR_REFERENCE')

    def test_metadata_cannot_authorize_model_or_domain_publication(self):
        self.assertEqual(self.item['sourceWitness']['evidenceClass'], 'METADATA_ONLY')
        self.assertEqual(self.item['productionDisposition'], 'HOLD')
        self.assertFalse(self.item['modelOperational'])
        self.assertFalse(self.wave['policy']['automaticProductionPromotion'])
        self.assertTrue(self.wave['policy']['noWeightRehostingForInventory'])
        self.assertFalse(self.wave['publication']['domainDeploymentPerformed'])
        self.assertFalse(self.wave['publication']['productionPromotion'])
        self.assertGreater(len(self.item['productionGates']), 0)

    def test_authority_chain_and_actual_execution_owner(self):
        self.assertEqual(self.wave['authorityChain'], ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net'])
        self.assertEqual(self.item['evaluationOwner'], 'szl-holdings/szl-forge')
        self.assertRegex(self.item['evaluationSourceRevision'], r'^[0-9a-f]{40}$')
        self.assertRegex(self.item['evaluationRunnerSha256'], r'^[0-9a-f]{64}$')
        self.assertIn('szl-nemo', self.wave['ownership'])
        self.assertIn('szl-serve', self.wave['ownership'])


if __name__ == '__main__':
    unittest.main()
