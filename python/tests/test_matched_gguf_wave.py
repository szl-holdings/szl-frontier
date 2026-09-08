"""Preserve measured F16/Q4 failure and byte-identical evidence projections."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WAVE = ROOT / 'frontier/waves/2026-09-08-minicpm5-matched-worker.json'


class MatchedWaveTests(unittest.TestCase):
    def setUp(self):
        self.wave = json.loads(WAVE.read_text(encoding='utf-8'))

    def test_projections_equal_admitted_evidence_bytes(self):
        for name in ('public/frontier/minicpm5-matched-evidence.v1.json', 'hf/dataset/minicpm5-matched-evidence.v1.json'):
            with self.subTest(path=name):
                self.assertEqual((ROOT / name).read_bytes(), WAVE.read_bytes())

    def test_new_observation_does_not_duplicate_model_or_claim_live(self):
        self.assertFalse(self.wave['newBaseModel'])
        self.assertEqual(self.wave['extendsWave'], '2026-09-08-minicpm5-gguf')
        self.assertTrue((ROOT / 'frontier/waves/2026-09-08-minicpm5-gguf.json').is_file())
        self.assertEqual(self.wave['productionDisposition'], 'HOLD')
        for key in ('productionPromotion', 'modelOperational', 'runtimeQualified', 'quantizationIsolationVerified', 'trainingAuthorized', 'weightsRehosted', 'toolExecuted'):
            self.assertIs(self.wave[key], False)
        self.assertIsNone(self.wave['speedupClaim'])
        self.assertFalse(self.wave['publication']['domainDeploymentPerformed'])
        self.assertEqual(self.wave['publication']['productState'], 'NOT_INFERRED')

    def test_equal_totals_do_not_erase_case_regression(self):
        evidence = self.wave['evaluation']
        first, second = evidence['variantResults']
        self.assertEqual((first['variant'], second['variant']), ('F16', 'Q4_K_M'))
        for row in (first, second):
            self.assertEqual((row['passedCases'], row['completedCases'], row['status']), (9, 12, 'SMOKE_FAIL'))
            self.assertEqual(row['completedCases'] - row['passedCases'], len(row['failedIds']))
        recovered = set(first['failedIds']) - set(second['failedIds'])
        regressed = set(second['failedIds']) - set(first['failedIds'])
        self.assertEqual(recovered, set(evidence['q4RecoveredIds']))
        self.assertEqual(regressed, set(evidence['q4RegressedIds']))
        self.assertEqual(regressed, {'probe_06'})
        self.assertFalse(evidence['verdictParity'])
        self.assertFalse(evidence['outputHashParity'])
        self.assertEqual(evidence['sameOutputHashCount'], 10)

    def test_exact_evidence_identity_and_authority_chain(self):
        evidence = self.wave['evaluation']
        self.assertEqual(self.wave['authorityChain'], ['GitHub', 'Hugging Face', 'a-11-oy.com', 'a11oy.net'])
        self.assertEqual(evidence['recordSha256'], 'f514192cf45013e55ad75d748554bce1769dbcac9ffdfbdacea00c065543fef0')
        self.assertEqual(evidence['executedSourceRevision'], '04c68889c996b74c3b131190abd5f87b157a520c')
        self.assertIn('/ddc10a6e1ca8aee7ad29abdae0f792e950f00799/', evidence['evidenceSource'])
        self.assertEqual(evidence['job'], 'https://huggingface.co/jobs/SZLHOLDINGS/6a9ff695b012ba1d5b8f2b37')
        self.assertEqual(evidence['exitCode'], 2)
        self.assertEqual(evidence['providerTerminalStage'], 'ERROR')
        self.assertFalse(evidence['sealed'])
        self.assertFalse(evidence['automaticRetry'])
        for key in ('matchedRunnerSha256', 'ggufRunnerSha256', 'suiteSha256', 'recordSha256', 'archiveSha256'):
            self.assertRegex(evidence[key], r'^[a-f0-9]{64}$')


if __name__ == '__main__':
    unittest.main()
