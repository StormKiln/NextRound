import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ci_scope', Path(__file__).parents[2] / 'scripts/ci-scope.py')
scope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scope)


class ScopeTests(unittest.TestCase):
    def test_allowlist(self):
        for path in ['README.md', 'CONTRIBUTING.md', 'docs/release.md', 'docs/screenshots/home.png', 'assets/brand/README.md']:
            self.assertTrue(scope.is_documentation(path), path)
        for path in ['apps/app.tsx', 'package.json', 'pnpm-lock.yaml', '.github/workflows/ci.yml',
                     'scripts/ci-scope.py', 'docs/example.ts', 'assets/brand/splash.png', 'apps/help.md']:
            self.assertFalse(scope.is_documentation(path), path)

    def test_fail_closed(self):
        for event in ['pull_request', 'merge_group', 'push', 'workflow_dispatch']:
            self.assertTrue(scope.full_ci(event, {}))
        with patch.object(scope, 'changed_files', return_value=[]):
            self.assertTrue(scope.full_ci('push', {}))
        with patch.object(scope, 'changed_files', side_effect=subprocess.CalledProcessError(1, 'git')):
            self.assertTrue(scope.full_ci('push', {}))

    def test_real_git_diffs_for_all_event_types_and_renames(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', directory, *args], stderr=subprocess.DEVNULL).decode().strip()
            git('init'); git('config', 'user.email', 'ci@example.invalid'); git('config', 'user.name', 'CI test')
            (root / 'README.md').write_text('Original\n')
            (root / 'code.ts').write_text('export const x = 1;\n')
            git('add', '.'); git('commit', '-m', 'base'); base = git('rev-parse', 'HEAD')
            (root / 'README.md').write_text('Updated\n')
            git('commit', '-am', 'docs'); docs = git('rev-parse', 'HEAD')
            def events(head):
                return [('pull_request', {'pull_request': {'base': {'sha': base}, 'head': {'sha': head}}}),
                        ('merge_group', {'merge_group': {'base_sha': base, 'head_sha': head}}),
                        ('push', {'before': base, 'after': head})]
            original = subprocess.check_output
            def in_repo(args):
                return original(args, cwd=directory)
            with patch.object(scope.subprocess, 'check_output', side_effect=in_repo):
                for name, event in events(docs):
                    self.assertFalse(scope.full_ci(name, event), name)
            # A renamed source file must count as code removal, even at a docs path.
            git('mv', 'code.ts', 'removed.md'); git('commit', '-m', 'rename code'); renamed = git('rev-parse', 'HEAD')
            with patch.object(scope.subprocess, 'check_output', side_effect=in_repo):
                for name, event in events(renamed):
                    self.assertTrue(scope.full_ci(name, event), name)
                self.assertTrue(scope.full_ci('push', {'before': '0' * 40, 'after': renamed}))


if __name__ == '__main__':
    unittest.main()
