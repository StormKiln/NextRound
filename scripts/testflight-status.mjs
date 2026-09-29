import { sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const metadata = JSON.parse(readFileSync('testflight/metadata.json', 'utf8'));
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
let previous;
for (let attempt = 0; attempt < 40; attempt++) {
  const builds = await get('builds', { 'filter[app]': app, 'filter[version]': metadata.build });
  const state = builds.data[0]?.attributes.processingState ?? 'NOT_VISIBLE_YET';
  if (state !== previous) console.log(`Build processing: ${state}`);
  previous = state;
  if (state === 'VALID') {
    console.log(
      `Build ${metadata.version} (${metadata.build}) processed successfully. Assign it to an internal TestFlight group in App Store Connect.`,
    );
    process.exit(0);
  }
  if (['FAILED', 'INVALID'].includes(state))
    throw new Error(`Apple rejected build processing: ${state}`);
  await setTimeout(15000);
}
throw new Error(
  'Upload succeeded, but processing is still pending after 10 minutes. Check App Store Connect before uploading again.',
);
