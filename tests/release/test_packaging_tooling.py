"""Packaging tooling may live outside the immutable application checkout."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class PackagingToolingTests(unittest.TestCase):
    def test_external_tooling_uses_explicit_source_and_default_stays_local(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'immutable source'
            source.mkdir()
            commands = root / 'bin'
            commands.mkdir()
            for name, body in {
                'uname': 'echo arm64',
                'git': 'exit 0',
                'security': 'echo "Developer ID Application: Test"',
                'make': 'printf "SOURCE=%s\\n" "$PWD"; exit 77',
            }.items():
                command = commands / name
                command.write_text('#!/bin/sh\n' + body + '\n')
                command.chmod(0o755)
            env = {**os.environ, 'PATH': str(commands) + ':' + os.environ['PATH'],
                   'TAURI_SIGNING_PRIVATE_KEY': 'test-only',
                   'APPLE_SIGNING_IDENTITY': 'Developer ID Application: Test',
                   'NOTARYTOOL_PROFILE': 'test-only'}
            env.pop('NEXTROUND_SOURCE_ROOT', None)
            for target in [None, source]:
                with self.subTest(target=target):
                    current = dict(env)
                    if target is not None:
                        current['NEXTROUND_SOURCE_ROOT'] = str(target)
                    result = subprocess.run(['/bin/bash', str(ROOT / 'scripts/package-release.sh')],
                                            cwd=root, env=current, text=True, capture_output=True)
                    self.assertEqual(result.returncode, 77, result.stderr)
                    self.assertIn('SOURCE=' + str(target or ROOT), result.stdout)

    def test_validate_cli_preserves_artifact_path(self):
        with tempfile.TemporaryDirectory() as directory:
            command = Path(directory) / 'xcrun'
            command.write_text('#!/bin/sh\nprintf "ARG=%s\\n" "$@"\n')
            command.chmod(0o755)
            result = subprocess.run(['python3', str(ROOT / 'scripts/staple.py'), '--validate',
                                     'folder with spaces/NextRound.dmg'], text=True,
                                    capture_output=True,
                                    env={**os.environ, 'PATH': directory + ':' + os.environ['PATH']})
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.splitlines(), ['ARG=stapler', 'ARG=validate',
                                                         'ARG=folder with spaces/NextRound.dmg'])
