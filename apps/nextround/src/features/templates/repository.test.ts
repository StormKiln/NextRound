import { describe, expect, it } from 'vitest';
import { createBrowserRepository, type TemplateStorage } from './repository';

const config = {
  minutes: 4,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'a', name: 'Squat', target: { unit: 'reps' as const, value: 5 } }],
};
function fixture() {
  let raw: string | null = null;
  let fail = false;
  const storage: TemplateStorage = {
    getItem: () => raw,
    setItem: (_key, value) => {
      if (fail) throw new Error('Disk full');
      raw = value;
    },
  };
  return {
    storage,
    repo: createBrowserRepository(storage),
    raw: () => raw,
    corrupt: (value: string) => {
      raw = value;
    },
    fail: () => {
      fail = true;
    },
  };
}
describe('saved workout repository', () => {
  it('persists through restart and isolates nested saved targets from drafts', async () => {
    const f = fixture();
    const input = structuredClone(config);
    await f.repo.mutate({ action: 'save', name: '  Strength  ', config: input });
    input.exercises[0].target.value = 99;
    const loaded = await createBrowserRepository(f.storage).read();
    expect(loaded.templates[0].name).toBe('Strength');
    expect(loaded.templates[0].config).toEqual(config);
    (loaded.templates[0].config as typeof config).exercises[0].target.value = 88;
    expect((await f.repo.read()).templates[0].config).toEqual(config);
  });
  it('preserves countdown checklist options and accepts native nullable descriptions', async () => {
    const f = fixture();
    const countdown = {
      type: 'countdown' as const,
      durationSeconds: 60,
      leadInSeconds: 0,
      warningSeconds: 3,
      exercises: structuredClone(config.exercises),
      showChecklist: false,
    };
    await f.repo.mutate({ action: 'save', name: 'Countdown', config: countdown });
    const raw = JSON.parse(f.raw() ?? '{}');
    raw.templates[0].config.exercises[0].description = null;
    f.corrupt(JSON.stringify(raw));
    const loaded = await f.repo.read();
    expect(loaded.templates[0].config).toMatchObject({
      type: 'countdown',
      showChecklist: false,
      exercises: [{ target: { unit: 'reps', value: 5 } }],
    });
  });
  it('serializes parallel saves and supports rename/delete', async () => {
    const f = fixture();
    await Promise.all(['A', 'B'].map((name) => f.repo.mutate({ action: 'save', name, config })));
    const saved = await f.repo.read();
    expect(saved.templates).toHaveLength(2);
    await f.repo.mutate({ action: 'rename', id: saved.templates[0].id, name: ' C ' });
    expect((await f.repo.read()).templates[0].name).toBe('C');
    await f.repo.mutate({ action: 'delete', id: saved.templates[0].id });
    expect((await f.repo.read()).templates).toHaveLength(1);
  });
  it.each(['{broken', '{"version":2,"templates":[]}', '{"version":1,"templates":[{}]}'])(
    'refuses to overwrite unreadable data: %s',
    async (raw) => {
      const f = fixture();
      f.corrupt(raw);
      await expect(f.repo.read()).rejects.toThrow();
      await expect(f.repo.mutate({ action: 'save', name: 'A', config })).rejects.toThrow();
      expect(f.raw()).toBe(raw);
    },
  );
  it('retains last persisted value on write failure', async () => {
    const f = fixture();
    await f.repo.mutate({ action: 'save', name: 'A', config });
    const before = f.raw();
    f.fail();
    await expect(f.repo.mutate({ action: 'save', name: 'B', config })).rejects.toThrow('Disk full');
    expect(f.raw()).toBe(before);
    expect((await f.repo.read()).templates).toHaveLength(1);
  });
  it('rejects invalid names, configurations and record overflow', async () => {
    const f = fixture();
    for (const name of [' ', 'x'.repeat(121)])
      await expect(f.repo.mutate({ action: 'save', name, config })).rejects.toThrow();
    await expect(
      f.repo.mutate({ action: 'save', name: 'A', config: { ...config, minutes: 0 } }),
    ).rejects.toThrow();
    for (let i = 0; i < 100; i++) await f.repo.mutate({ action: 'save', name: `${i}`, config });
    await expect(f.repo.mutate({ action: 'save', name: 'Overflow', config })).rejects.toThrow(
      '100',
    );
    expect((await f.repo.read()).templates).toHaveLength(100);
  });
});
it('updates the exact loaded template and rejects stale or deleted sources without replacing data', async () => {
  const f = fixture();
  const original = (await f.repo.mutate({ action: 'save', name: 'Routine', config })).templates[0];
  const updated = await f.repo.mutate({
    action: 'update',
    id: original.id,
    expected: original,
    name: 'Changed',
    config: { ...config, minutes: 5 },
  });
  expect(updated.templates).toHaveLength(1);
  expect(updated.templates[0]).toMatchObject({
    id: original.id,
    name: 'Changed',
    config: { minutes: 5 },
  });
  const before = f.raw();
  await expect(
    f.repo.mutate({ action: 'update', id: original.id, expected: original, name: 'Stale', config }),
  ).rejects.toThrow(/changed/);
  expect(f.raw()).toBe(before);
  await f.repo.mutate({ action: 'delete', id: original.id });
  await expect(
    f.repo.mutate({
      action: 'update',
      id: original.id,
      expected: original,
      name: 'Missing',
      config,
    }),
  ).rejects.toThrow(/no longer/);
});
it('failed template update preserves the saved document', async () => {
  const f = fixture();
  const original = (await f.repo.mutate({ action: 'save', name: 'Routine', config })).templates[0];
  const before = f.raw();
  f.fail();
  await expect(
    f.repo.mutate({
      action: 'update',
      id: original.id,
      expected: original,
      name: 'Changed',
      config: { ...config, minutes: 5 },
    }),
  ).rejects.toThrow(/Disk full/);
  expect(f.raw()).toBe(before);
});

it('unsupported nested config fields preserve the original document on every mutation', async () => {
  for (const path of [
    ['config'],
    ['config', 'exercises', 0],
    ['config', 'exercises', 0, 'target'],
  ]) {
    const f = fixture();
    const original = (await f.repo.mutate({ action: 'save', name: 'Original', config }))
      .templates[0];
    const d = JSON.parse(f.raw() ?? 'null');
    let nested = d.templates[0];
    for (const key of path) nested = nested[key];
    nested.future = true;
    const raw = JSON.stringify(d);
    f.corrupt(raw);
    await expect(
      f.repo.mutate({
        action: 'update',
        id: original.id,
        expected: original,
        name: 'Edited',
        config,
      }),
    ).rejects.toThrow();
    await expect(
      f.repo.mutate({ action: 'rename', id: original.id, name: 'Renamed' }),
    ).rejects.toThrow();
    expect(f.raw()).toBe(raw);
  }
});
