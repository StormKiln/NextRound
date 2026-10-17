import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('staple', Path(__file__).parents[2] / 'scripts/staple.py')
staple = importlib.util.module_from_spec(spec)
spec.loader.exec_module(staple)

class StapleTests(unittest.TestCase):
    def result(self, code, text=''):
        return subprocess.CompletedProcess([], code, text, '')

    def test_transient_network_failure_then_success(self):
        with patch.object(staple.subprocess, 'run', side_effect=[self.result(68, 'NSURLErrorDomain Code=-1005 The network connection was lost.'), self.result(0)]) as run, patch.object(staple.time, 'sleep') as sleep:
            staple.staple('NextRound.dmg')
            self.assertEqual(run.call_count, 2)
            sleep.assert_called_once_with(5)

    def test_permanent_failure_is_not_retried(self):
        with patch.object(staple.subprocess, 'run', return_value=self.result(65, 'Record not found. Not notarized.')) as run, patch.object(staple.time, 'sleep') as sleep:
            with self.assertRaises(RuntimeError): staple.staple('NextRound.app')
            self.assertEqual(run.call_count, 1)
            sleep.assert_not_called()

    def test_transient_retries_are_bounded(self):
        with patch.object(staple.subprocess, 'run', return_value=self.result(68, 'NSURLErrorDomain Code=-1001 The request timed out.')) as run, patch.object(staple.time, 'sleep') as sleep:
            with self.assertRaises(RuntimeError): staple.staple('NextRound.dmg')
            self.assertEqual(run.call_count, 4)
            self.assertEqual([c.args[0] for c in sleep.call_args_list], [5, 10, 20])

    def test_unknown_error_is_not_retried(self):
        with patch.object(staple.subprocess, 'run', return_value=self.result(68, 'Invalid ticket.')) as run:
            with self.assertRaises(RuntimeError): staple.staple('NextRound.dmg')
            self.assertEqual(run.call_count, 1)
