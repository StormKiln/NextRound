import datetime
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('testflight', Path(__file__).parents[2] / 'scripts/testflight-config.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class TestFlightTests(unittest.TestCase):
    def profile(self):
        return {'Platform':['OSX'], 'TeamIdentifier':['TEAM123'], 'ApplicationIdentifierPrefix':['TEAM123'],
                'ExpirationDate':datetime.datetime(2035,1,1), 'DeveloperCertificates':[b'certificate'],
                'Entitlements':{'com.apple.application-identifier':'TEAM123.com.stormkiln.nextround',
                                'com.apple.developer.team-identifier':'TEAM123'}}

    def test_matching_profile(self):
        self.assertEqual(m.validate_profile(self.profile(), b'certificate', 'TEAM123', 'com.stormkiln.nextround'), 'TEAM123.com.stormkiln.nextround')

    def test_wrong_team_certificate_app_and_expiry(self):
        for key, value in [('Platform',['iOS']), ('TeamIdentifier',['OTHER']), ('DeveloperCertificates',[b'other']),
                           ('ExpirationDate',datetime.datetime(2000,1,1)), ('ProvisionedDevices',['device']),
                           ('ProvisionsAllDevices',True)]:
            p=self.profile(); p[key]=value
            with self.subTest(key=key), self.assertRaises(ValueError):
                m.validate_profile(p,b'certificate','TEAM123','com.stormkiln.nextround')
        p=self.profile(); p['Entitlements']['com.apple.application-identifier']='TEAM123.other'
        with self.assertRaises(ValueError): m.validate_profile(p,b'certificate','TEAM123','com.stormkiln.nextround')

    def test_monotonic_builds_and_retry(self):
        versions=[m.build_number(run,attempt) for run,attempt in [(1,1),(1,2),(2,1),(99,1),(100,1)]]
        tuples=[tuple(map(int,v.split('.'))) for v in versions]
        self.assertEqual(tuples, sorted(set(tuples)))
        for run,attempt in [(0,1),(1,0),(1,100),(999900,1)]:
            with self.assertRaises(ValueError): m.build_number(run,attempt)
