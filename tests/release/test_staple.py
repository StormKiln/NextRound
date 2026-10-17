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

    def test_validation_transport_failure_then_success(self):
        with patch.object(staple.subprocess, 'run', side_effect=[self.result(68, 'NSURLErrorDomain Code=-1005 connection lost'), self.result(0)]) as run, patch.object(staple.time, 'sleep') as sleep:
            staple.staple('NextRound.dmg', operation='validate')
            self.assertEqual(run.call_args_list[0].args[0], ['xcrun', 'stapler', 'validate', 'NextRound.dmg'])
            self.assertEqual(run.call_count, 2)
            sleep.assert_called_once_with(5)

    def test_validation_failures_are_bounded_and_unknown_errors_fail_immediately(self):
        for code, output, expected_calls in [(68, 'NSURLErrorDomain Code=-1009 offline', 4), (68, 'Invalid ticket', 1), (65, 'Not notarized', 1)]:
            with self.subTest(code=code, output=output), patch.object(staple.subprocess, 'run', return_value=self.result(code, output)) as run, patch.object(staple.time, 'sleep'):
                with self.assertRaises(RuntimeError): staple.staple('NextRound.app', operation='validate')
                self.assertEqual(run.call_count, expected_calls)

    def test_unsupported_operation_is_rejected_before_execution(self):
        with patch.object(staple.subprocess, 'run') as run:
            with self.assertRaises(ValueError): staple.staple('NextRound.app', operation='delete')
            run.assert_not_called()
