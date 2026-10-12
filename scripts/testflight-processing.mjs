export function validateRequest(metadata, waitMinutes) {
  if (
    !/^\d+\.\d+\.\d+$/.test(metadata.version ?? '') ||
    !/^\d+(\.\d+){0,2}$/.test(metadata.build ?? '') ||
    !/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(metadata.bundle ?? '')
  )
    throw new Error('Provide a marketing version (x.y.z), build number and bundle identifier.');
  const minutes = Number(waitMinutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60)
    throw new Error('Wait minutes must be an integer from 1 to 60.');
  return minutes;
}
export async function pollProcessing({ metadata, app, get, attempts, sleep, log }) {
  let previous;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const payload = await get('builds', {
      'filter[app]': app,
      'filter[version]': metadata.build,
      include: 'preReleaseVersion',
    });
    if (payload.data.length > 1) throw new Error('Multiple builds matched the requested identity.');
    const build = payload.data[0];
    if (build) {
      const preId = build.relationships?.preReleaseVersion?.data?.id;
      const pre = payload.included?.find(
        (item) => item.type === 'preReleaseVersions' && item.id === preId,
      );
      if (
        build.attributes.version !== metadata.build ||
        pre?.attributes.version !== metadata.version ||
        pre?.attributes.platform !== 'MAC_OS'
      )
        throw new Error(
          'Apple build identity does not match the requested macOS marketing version and build.',
        );
    }
    const state = build?.attributes.processingState ?? 'NOT_VISIBLE_YET';
    if (state !== previous) log(`Build processing: ${state}`);
    previous = state;
    if (state === 'VALID') return { id: build.id, ...metadata };
    if (['FAILED', 'INVALID'].includes(state))
      throw new Error(`Apple rejected build processing: ${state}`);
    if (attempt + 1 < attempts) await sleep(15000);
  }
  return null;
}
