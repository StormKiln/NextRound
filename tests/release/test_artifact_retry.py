"""Exercise the upload/download name contract under two attempts of one run."""
from pathlib import Path
import re
import unittest
ROOT = Path(__file__).resolve().parents[2]

def artifact_steps(file, action):
    text = (ROOT / '.github/workflows' / file).read_text()
    return re.findall(r'uses: actions/' + action + r'@[^\n]+\n\s+with:\n([\s\S]*?)(?=\n\s+- (?:name:|uses:)|\Z)', text)

def value(block, key):
    match = re.search(r'^\s*' + key + r':\s*(.+)$', block, re.M)
    return match.group(1).strip() if match else None

def resolve(name, attempt):
    return name.replace('${{ github.run_attempt }}',str(attempt)).replace('${{ github.run_number }}','38')

class ArtifactRetryTests(unittest.TestCase):
    def test_release_second_attempt_can_upload_and_consumer_gets_verified_artifact(self):
        uploads=artifact_steps('release.yml','upload-artifact')
        stored={}
        for attempt in [1,2]:
            for block in uploads:
                name=resolve(value(block,'name'),attempt)
                self.assertTrue(name not in stored or value(block,'overwrite')=='true',f'retry conflicts on {name}')
                stored[name]=attempt
        for block in artifact_steps('release.yml','download-artifact'):
            self.assertEqual(stored[resolve(value(block,'name'),2)],2)
        diagnostic_names=[n for n in stored if 'diagnostic' in n]
        self.assertEqual(len(diagnostic_names),2,'retain both attempts for diagnosis')
    def test_testflight_attempts_have_distinct_installers(self):
        names=[value(block,'name') for block in artifact_steps('testflight.yml','upload-artifact')]
        self.assertTrue(names)
        for name in names:self.assertNotEqual(resolve(name,1),resolve(name,2))
