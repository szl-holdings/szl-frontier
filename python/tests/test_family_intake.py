"""Offline synthetic metadata contracts. None of these fixtures is live evidence."""
import copy
import hashlib
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('family_intake_tested', ROOT/'python/szl_frontier/family_intake.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def fixture():
    license_text = b'fixture license, never clearance'
    config = b'{"auto_map":{"AutoModel":"untrusted.Custom"}}'
    payload = {'id':'moonshotai/Kimi-K3','sha':'1'*40,'private':False,'gated':False,'disabled':False,
        'cardData':{'license':'other'},'siblings':[
            {'rfilename':'LICENSE','size':len(license_text),'blobId':'a'*40},
            {'rfilename':'config.json','size':len(config),'blobId':'b'*40},
            {'rfilename':'weights.safetensors','size':100,'lfs':{'sha256':'c'*64}},
            {'rfilename':'README.md','size':5,'blobId':'d'*40}]}
    model = {'repoId':payload['id'],'revision':payload['sha'],'license':'other','role':'primary','releaseId':'kimi-k3',
        'substantiveInventorySha256':m.material_identity(payload),'reviewedFiles':{
        'LICENSE':hashlib.sha256(license_text).hexdigest(),'config.json':hashlib.sha256(config).hexdigest()}}
    texts = {'LICENSE':license_text,'config.json':config}
    return model, payload, texts


class FamilyIntakeTests(unittest.TestCase):
    def test_default_plan_retains_unknowns(self):
        p=m.plan(m.loads(m.WAVE_PATH.read_bytes()))
        self.assertEqual((p['releaseFamilies'],p['sourcePinsRecorded']),(3,5))
        self.assertEqual(p['productionDisposition'],'HOLD')
        self.assertEqual(p['accessMetadataVerification'],'PENDING_LIVE_OBSERVATION')
        self.assertIsNone(p['benchmarkResults'])
        self.assertFalse(p['executionAuthorized'])

    def test_five_artifacts_not_five_family_alerts(self):
        wave=m.loads(m.WAVE_PATH.read_bytes())
        self.assertEqual([len(r['artifacts']) for r in wave['releases']], [1,2,2])
        self.assertTrue(wave['deduplication']['preservePriorMiniCPMFailures'])

    def test_hub_date_is_not_a_release_date(self):
        wave=m.loads(m.WAVE_PATH.read_bytes());wave['releases'][0]['releaseDate']='2026-09-08'
        with self.assertRaises(m.IntakeError):m.validate_wave(wave)

    def test_kimi_license_may_not_be_relabelled_apache(self):
        wave=m.loads(m.WAVE_PATH.read_bytes());wave['observedModels'][0]['license']='apache-2.0'
        with self.assertRaises(m.IntakeError):m.validate_wave(wave)

    def test_forbidden_promotions_are_rejected(self):
        for key in ('modelOperational','trainingAuthorized','weightsRehosted','runtimeQualified','domainDeploymentPerformed'):
            with self.subTest(key=key):
                wave=m.loads(m.WAVE_PATH.read_bytes());wave[key]=True
                with self.assertRaises(m.IntakeError):m.validate_wave(wave)

    def test_duplicate_artifact_cannot_cover_missing_pin(self):
        wave=m.loads(m.WAVE_PATH.read_bytes());wave['observedModels'][-1]=copy.deepcopy(wave['observedModels'][0])
        with self.assertRaises(m.IntakeError):m.validate_wave(wave)

    def test_wrong_pin_or_missing_license_hash_rejected(self):
        for field,bad in [('revision','main'),('reviewedFiles',{})]:
            wave=m.loads(m.WAVE_PATH.read_bytes());wave['observedModels'][0][field]=bad
            with self.assertRaises(m.IntakeError):m.validate_wave(wave)

    def test_complete_fixture_can_be_checked_without_executing_custom_code(self):
        model,p,texts=fixture();calls=[]
        def read(repo,rev,name):
            calls.append(name)
            return m.canonical(p) if name is None else texts[name]
        r=m.observe_one(model,read)
        self.assertEqual(len(calls),3)
        self.assertFalse(r['remoteCodeAllowed'])
        self.assertFalse(r['licenseApproved'])
        self.assertFalse(r['weightsDownloaded'])
        self.assertFalse(r['lineageClosureVerified'])

    def test_unknown_disabled_flag_fails_closed(self):
        model,p,texts=fixture();p.pop('disabled')
        with self.assertRaises(m.IntakeError):m.observe_one(model,lambda r,v,n:m.canonical(p) if n is None else texts[n])

    def test_upstream_revision_or_license_drift_rejected(self):
        for field,value in [('id','other/repo'),('sha','2'*40),('cardData',{'license':'apache-2.0'}),('private',True)]:
            with self.subTest(field=field):
                model,p,texts=fixture();p[field]=value
                with self.assertRaises(m.IntakeError):m.observe_one(model,lambda r,v,n:m.canonical(p) if n is None else texts[n])

    def test_license_and_config_bytes_must_match(self):
        for name in ('LICENSE','config.json'):
            model,p,texts=fixture();texts[name]=b'changed'
            with self.assertRaises(m.IntakeError):m.observe_one(model,lambda r,v,n:m.canonical(p) if n is None else texts[n])

    def test_popularity_readme_churn_does_not_change_inventory(self):
        _,p,_=fixture();before=m.material_identity(p)
        p['likes']=999;p['sha']='e'*40;p['siblings'][-1]['blobId']='f'*40
        self.assertEqual(before,m.material_identity(p))

    def test_same_size_weight_change_is_material(self):
        _,p,_=fixture();before=m.material_identity(p)
        p['siblings'][2]['lfs']['sha256']='e'*64
        self.assertNotEqual(before,m.material_identity(p))

    def test_missing_blob_or_unsafe_path_rejected(self):
        for change in ({'blobId':None},{'rfilename':'../file'},{'rfilename':'LICENSE'}):
            _,p,_=fixture();p['siblings'][1].update(change)
            with self.assertRaises(m.IntakeError):m.material_identity(p)

    def test_duplicate_json_and_nonfinite_rejected(self):
        for raw in (b'{"x":1,"x":2}',b'{"x":NaN}',b'{"x":1e999}'):
            with self.assertRaises(m.IntakeError):m.loads(raw)

    def test_size_budget_rejected(self):
        with self.assertRaises(m.IntakeError):m.loads(b' '*(m.MAX_BYTES+1))

    def test_unapproved_network_inputs_refused_before_connection(self):
        with patch.object(m,'build_opener') as opener:
            for repo,rev,name in [('attacker/model','1'*40,None),('moonshotai/Kimi-K3','main',None),('moonshotai/Kimi-K3','1'*40,'model.py')]:
                with self.assertRaises(m.IntakeError):m.fetch(repo,rev,name)
            opener.assert_not_called()

    def test_redirect_not_followed(self):
        with self.assertRaises(m.IntakeError):m.NoRedirect().redirect_request(None,None,302,'',None,'http://127.0.0.1')

    def test_public_hf_wave_projections_are_byte_identical(self):
        original=m.WAVE_PATH.read_bytes()
        for name in ('public/frontier/kimi-hy4-spark-intake.v1.json','hf/dataset/kimi-hy4-spark-intake.v1.json'):
            self.assertEqual((ROOT/name).read_bytes(),original)


if __name__=='__main__':unittest.main()
