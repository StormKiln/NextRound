import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location('notarize', Path(__file__).parents[2] / 'scripts/notarize.py')
notary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notary)
ID = '11111111-2222-4333-8444-555555555555'

class NotarizeTests(unittest.TestCase):
    def run_case(self, mode, upload_timeout=2, total_timeout=3):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        tool = root / 'tool.py'
        tool.write_text('''import json,sys,time,os
from pathlib import Path
mode,log,action=sys.argv[1:4]
with open(log,'a') as f: f.write(action+'\\n')
if action=='submit':
 if mode=='hang': time.sleep(30)
 if mode=='unknown': print('credential SECRET',file=sys.stderr); sys.exit(1)
 print(json.dumps({'id':'11111111-2222-4333-8444-555555555555'}),flush=True)
 if mode=='id-hang': time.sleep(30)
else:
 calls=Path(log).read_text().splitlines().count('info')
 if mode=='retry' and calls==1: sys.exit(1)
 print(json.dumps({'status':'Invalid' if mode=='reject' else 'In Progress' if mode=='pending' else 'Accepted'}))
''')
        output = root / 'diagnostic.json'
        result = notary.notarize(root/'app.zip', [], output, command=[sys.executable,str(tool),mode,str(root/'calls')], upload_timeout=upload_timeout, total_timeout=total_timeout, request_timeout=.2, poll_interval=.01)
        return result, json.loads(output.read_text()), (root/'calls').read_text()

    def test_success_and_status_retry_do_not_resubmit(self):
        for mode in ['ok','retry','id-hang']:
            result, diagnostic, calls = self.run_case(mode, upload_timeout=.1)
            self.assertTrue(result)
            self.assertEqual(diagnostic['status'], 'Accepted')
            self.assertEqual(calls.count('submit'),1)
            self.assertEqual(diagnostic['id'],ID)

    def test_rejection_and_unknown_transport_failure_are_not_retried(self):
        for mode in ['reject','unknown']:
            result, diagnostic, calls = self.run_case(mode)
            self.assertFalse(result)
            self.assertEqual(calls.count('submit'),1)
            self.assertNotIn('SECRET', json.dumps(diagnostic))

    def test_upload_and_processing_are_bounded(self):
        for mode in ['hang','pending']:
            start=time.monotonic()
            result, diagnostic, calls=self.run_case(mode,upload_timeout=.1,total_timeout=.4)
            self.assertFalse(result)
            self.assertLess(time.monotonic()-start,2)
            self.assertEqual(calls.count('submit'),1)
            self.assertIn(diagnostic['status'], ['Upload outcome unknown','Processing timed out'])

    def test_watchdog_kills_descendants_holding_the_output_pipe(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'survived'
            child = "import time; from pathlib import Path; time.sleep(.4); Path(" + repr(str(marker)) + ").write_text('alive')"
            parent = 'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c",' + repr(child) + ']); time.sleep(30)'
            _, _, timed_out = notary.run_bounded([sys.executable, '-c', parent], .15)
            self.assertTrue(timed_out)
            time.sleep(.5)
            self.assertFalse(marker.exists())

    def test_repeated_invocation_preserves_prior_record_without_upload(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'diagnostic.json'
            original = json.dumps({'id': ID, 'status': 'Processing timed out'})
            output.write_text(original)
            result = notary.notarize(Path(directory)/'app.zip', [], output,
                                    command=[sys.executable,'-c','print("{}")'], total_timeout=.1)
            self.assertFalse(result)
            self.assertEqual(output.read_text(), original)
