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
        for name in ['ci','testflight']:
            text=(ROOT/f'.github/workflows/{name}.yml').read_text()
            self.assertIn('run: make setup-rust',text)
            self.assertNotIn('run: rustup toolchain install',text)

    def test_legacy_release_loads_workflow_tooling_outside_checkout(self):
        workflow=(ROOT/'.github/workflows/release.yml').read_text()
        step=workflow.split('      - name: Set up Rust\n',1)[1].split('      - name:',1)[0]
        self.assertIn('RUST_TOOLING_COMMIT: ${{ github.sha }}',step)
        self.assertIn('git show "$RUST_TOOLING_COMMIT:scripts/setup-rust.sh"',step)
        self.assertNotIn('make setup-rust',step)
        script='\n'.join(line[10:] for line in step.split('        run: |\n',1)[1].splitlines())
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp); repo=p/'repo';repo.mkdir();tools=p/'bin';tools.mkdir()
            (tools/'rustup').write_text('#!/bin/sh\nexit 0\n');(tools/'rustup').chmod(0o755)
            def git(*args):
                return subprocess.check_output(['git',*args],cwd=repo,text=True).strip()
            git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','Test')
            (repo/'Makefile').write_text('legacy:\n\ttrue\n');git('add','.');git('commit','-qm','legacy');old=git('rev-parse','HEAD')
            (repo/'scripts').mkdir();(repo/'scripts/setup-rust.sh').write_text((ROOT/'scripts/setup-rust.sh').read_text());git('add','.');git('commit','-qm','tooling');new=git('rev-parse','HEAD')
            git('checkout','-q',old)
            env=dict(os.environ, RUST_TOOLING_COMMIT=new,RUNNER_TEMP=str(p),PATH=str(tools)+':'+os.environ['PATH'])
            result=subprocess.run(['bash','-c',script],cwd=repo,env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(git('rev-parse','HEAD'),old)
            self.assertEqual(git('status','--porcelain'),'')
