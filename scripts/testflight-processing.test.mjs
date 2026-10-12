import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pollProcessing, validateRequest } from './testflight-processing.mjs';

const metadata = { version: '1.17.0', build: '1.27.1', bundle: 'com.stormkiln.nextround' };
const build = (state = 'VALID', version = metadata.version, platform = 'MAC_OS') => ({
  data: [
    {
      id: 'build-id',
      attributes: { version: metadata.build, processingState: state },
      relationships: { preReleaseVersion: { data: { id: 'pre-id' } } },
    },
  ],
  included: [{ type: 'preReleaseVersions', id: 'pre-id', attributes: { version, platform } }],
});
const run = (get, options = {}) =>
  pollProcessing({
    metadata,
    app: 'app-id',
    get,
    attempts: 2,
    sleep: async () => {},
    log: () => {},
    ...options,
  });
test('validates complete explicit identity and bounded polling budget', () => {
  assert.equal(validateRequest(metadata, '10'), 10);
  for (const minutes of ['0', '61', '1.5', 'bad'])
    assert.throws(() => validateRequest(metadata, minutes));
  for (const field of ['version', 'build', 'bundle'])
    assert.throws(() => validateRequest({ ...metadata, [field]: '' }, '10'));
});
test('polls pending then returns exact valid identity', async () => {
  let calls = 0;
  const result = await run(async (path, params) => {
    assert.equal(path, 'builds');
    assert.equal(params['filter[app]'], 'app-id');
    assert.equal(params['filter[version]'], metadata.build);
    return build(++calls === 1 ? 'PROCESSING' : 'VALID');
  });
  assert.equal(result.id, 'build-id');
  assert.equal(calls, 2);
});
test('timeout remains pending rather than claiming upload or success', async () => {
  assert.equal(await run(async () => ({ data: [] })), null);
});
test('rejects Apple failure and mismatched marketing version, platform or build', async () => {
  for (const payload of [
    build('INVALID'),
    build('FAILED'),
    build('VALID', '1.16.0'),
    build('VALID', metadata.version, 'IOS'),
    {
      ...build(),
      data: [{ ...build().data[0], attributes: { version: '1.1.1', processingState: 'VALID' } }],
    },
  ])
    await assert.rejects(run(async () => payload));
});
test('rejects ambiguous build responses and missing identity relationships', async () => {
  await assert.rejects(run(async () => ({ ...build(), data: [...build().data, ...build().data] })));
  await assert.rejects(run(async () => ({ ...build(), included: [] })));
});
