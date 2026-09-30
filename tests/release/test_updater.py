import importlib.util
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('updater_manifest', Path(__file__).parents[2] / 'scripts/updater-manifest.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class UpdaterManifestTests(unittest.TestCase):
    def test_only_complete_signed_platform_is_advertised(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            with self.assertRaises(ValueError): module.manifest(root,'0.2.0')
            archive=root/'NextRound_0.2.0_aarch64.app.tar.gz';archive.write_bytes(b'archive')
            with self.assertRaises(ValueError): module.manifest(root,'0.2.0')
            archive.with_suffix(archive.suffix+'.sig').write_text('signature')
            result=module.manifest(root,'0.2.0')
            self.assertEqual(set(result['platforms']),{'darwin-aarch64'})
            self.assertTrue(result['platforms']['darwin-aarch64']['url'].endswith('/v0.2.0/'+archive.name))
    def test_invalid_version_cannot_enter_urls(self):
        with self.assertRaises(ValueError):module.manifest(Path('.'),'0.2.0/other')
