"""Use the existing wave compiler; synthetic access flags are fixtures only."""
import copy
import unittest
from szl_frontier import family_intake as intake
from szl_frontier.wave_plan import compile_plan, WavePlanError


def fixture_pins(wave):
    body={'schema':'szl.frontier.upstream-model-pin-set.v1','authority':'PUBLIC_METADATA_ONLY',
          'evidenceClass':'OFFLINE_FIXTURE_NOT_OBSERVED','models':[
              dict(row,private=False,gated=False,disabled=False) for row in wave['observedModels']]}
    return {**body,'receipt':{'algorithm':'sha256','scope':'canonical-json(body-without-receipt)',
                            'canonicalBytes':len(intake.canonical(body)),'digest':intake.digest(body)}}


class ExistingCompilerIntegrationTests(unittest.TestCase):
    def test_three_families_five_pins_compile_without_production_authority(self):
        wave=intake.loads(intake.WAVE_PATH.read_bytes())
        result=compile_plan(wave,fixture_pins(wave))
        self.assertEqual((result['releaseCount'],result['artifactCount']),(3,5))
        self.assertEqual(result['productionPromotionCount'],0)
        self.assertFalse(result['networkAccess'])
        for row in result['plans']:
            self.assertEqual(row['productionDisposition'],'HOLD')
            self.assertFalse(row['executionAuthorized'])
            self.assertIsNone(row['benchmarkResults'])
            for artifact in row['artifacts']:
                self.assertFalse(artifact['remoteCodeAllowed'])
                self.assertFalse(artifact['licenseApproved'])
                self.assertFalse(artifact['weightsDownloaded'])

    def test_existing_compiler_still_rejects_wrong_owner(self):
        wave=intake.loads(intake.WAVE_PATH.read_bytes());pins=fixture_pins(wave)
        wave['releases'][0]['targetRepos']=['attacker/runtime']
        with self.assertRaises(WavePlanError):compile_plan(wave,pins)

    def test_existing_compiler_still_rejects_missing_pin(self):
        wave=intake.loads(intake.WAVE_PATH.read_bytes());modified=copy.deepcopy(wave)
        modified['observedModels'].pop()
        with self.assertRaises(WavePlanError):compile_plan(wave,fixture_pins(modified))


if __name__=='__main__':unittest.main()
