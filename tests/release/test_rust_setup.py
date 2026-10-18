import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]

class RustSetupTests(unittest.TestCase):
    def run_setup(self, failures):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            (p / 'rustup').write_text('#!/bin/bash\necho "$*" >> "$CALLS"\nn=$(wc -l < "$CALLS")\nif [ "$n" -le "$FAILURES" ]; then exit 42; fi\n')
            (p / 'sleep').write_text('#!/bin/bash\necho "$*" >> "$SLEEPS"\n')
            for name in ['rustup', 'sleep']:
                (p / name).chmod(0o755)
            env = dict(os.environ, PATH=f'{temp}:'+os.environ['PATH'], CALLS=str(p/'calls'), SLEEPS=str(p/'sleeps'), FAILURES=str(failures))
            result = subprocess.run(['bash',str(ROOT/'scripts/setup-rust.sh')],env=env,capture_output=True,text=True)
            calls = (p/'calls').read_text().splitlines() if (p/'calls').exists() else []
            sleeps = (p/'sleeps').read_text().splitlines() if (p/'sleeps').exists() else []
            return result,calls,sleeps
    def test_immediate_success(self):
        result,calls,sleeps=self.run_setup(0)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(calls,['toolchain install 1.98.1 --profile minimal --component rustfmt --component clippy'])
        self.assertEqual(sleeps,[])
    def test_transient_retry(self):
        result,calls,sleeps=self.run_setup(2)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(len(calls),3)
        self.assertEqual(len(set(calls)),1)
        self.assertEqual(sleeps,['5','10'])
    def test_exhaustion_preserves_failure(self):
        result,calls,sleeps=self.run_setup(10)
        self.assertEqual(result.returncode,42,result.stderr)
        self.assertEqual(len(calls),3)
        self.assertEqual(sleeps,['5','10'])
        self.assertIn('failed after 3 attempts',result.stderr)
    def test_all_workflows_use_shared_target(self):
        for name in ['ci','release','testflight']:
            text=(ROOT/f'.github/workflows/{name}.yml').read_text()
            self.assertIn('run: make setup-rust',text)
            self.assertNotIn('run: rustup toolchain install',text)
