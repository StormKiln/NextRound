import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('release_metadata', Path(__file__).parents[2] / 'scripts/release-metadata.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReleaseMetadataTests(unittest.TestCase):
    def test_matching_stable_tag(self):
        self.assertEqual(module.validate('v0.1.0', ['0.1.0'] * 5), '0.1.0')

    def test_rejects_invalid_and_prerelease_tags(self):
        for tag in ['0.1.0', 'v01.1.0', 'v1.0', 'v1.0.0;echo bad', 'v1.0.0-rc.1']:
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                module.validate(tag, ['0.1.0'])

    def test_rejects_manifest_drift(self):
        with self.assertRaises(ValueError):
            module.validate('v0.1.0', ['0.1.0', '0.2.0'])

if __name__ == '__main__':
    unittest.main()
