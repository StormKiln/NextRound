import { sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { pollProcessing, validateRequest } from './testflight-processing.mjs';

const statusOnly = process.argv.includes('--status-only');
const metadata = statusOnly
  ? {
      version: process.env.TESTFLIGHT_VERSION,
      build: process.env.TESTFLIGHT_BUILD,
      bundle: process.env.TESTFLIGHT_BUNDLE,
    }
  : JSON.parse(readFileSync('testflight/metadata.json', 'utf8'));
if (statusOnly && process.argv.includes('--preflight'))
  throw new Error('Status-only cannot run upload preflight.');
const minutes = validateRequest(metadata, process.env.TESTFLIGHT_WAIT_MINUTES ?? '10');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: 'ES256', kid: process.env.APPSTORE_API_KEY_ID, typ: 'JWT' })}.${encode(
    {
      iss: process.env.APPSTORE_API_ISSUER_ID,
      iat: now,
      exp: now + 1200,
      aud: 'appstoreconnect-v1',
    },
  )}`;
  const signature = sign('sha256', Buffer.from(body), {
    key: process.env.APPSTORE_API_PRIVATE_KEY,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  return `${body}.${signature}`;
}
async function get(path, params) {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/${path}?${new URLSearchParams(params)}`,
    {
      headers: { Authorization: `Bearer ${token()}` },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok)
    throw new Error(`App Store Connect status request failed: HTTP ${response.status}`);
  return response.json();
}
const apps = await get('apps', { 'filter[bundleId]': metadata.bundle });
if (apps.data.length !== 1) throw new Error('Expected exactly one matching App Store Connect app');
const app = apps.data[0].id;
if (process.argv.includes('--preflight')) {
  const existing = await get('builds', { 'filter[app]': app, limit: '200', sort: '-uploadedDate' });
  const compare = (a, b) => {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const difference = (left[i] ?? 0) - (right[i] ?? 0);
      if (difference) return difference;
    }
    return 0;
  };
  for (const build of existing.data) {
    const prior = build.attributes.version;
    if (/^\d+(\.\d+){0,2}$/.test(prior) && compare(metadata.build, prior) <= 0) {
      throw new Error(
        `Build ${metadata.build} is not newer than uploaded build ${prior}. Start a new workflow dispatch instead of retrying an older run.`,
      );
    }
  }
  console.log(`App Store Connect preflight passed for build ${metadata.build}`);
  process.exit(0);
}
console.log(`App Store Connect app ${app}; waiting for build ${metadata.build}`);
const result = await pollProcessing({
  metadata,
  app,
  get,
  attempts: minutes * 4,
  sleep: setTimeout,
  log: console.log,
});
if (result) {
  console.log(
    `Build ${result.version} (${result.build}) [${result.id}] processed successfully for macOS. Verify internal TestFlight group availability in App Store Connect.`,
  );
} else {
  console.error(
    `Build processing remains pending after ${minutes} minutes. Run the TestFlight processing status workflow with this exact version/build to check again. Do not reupload just to check processing.`,
  );
  process.exitCode = 2;
}
