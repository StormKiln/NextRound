import { expect, test } from '@playwright/test';

test('builds a mixed session with editable blocks and keeps existing workout access', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a session', exact: true }).click();
  await page.getByLabel('Session name', { exact: true }).fill('Morning flow');
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('5');
  await page.getByLabel('Lead-in seconds', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Use this block', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Countdown', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Session saved');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByText('Block 1 of 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Session complete', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Save session result', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
});
test('clears a validation-only time filter error', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 2,
        templates: [
          {
            id: 'one',
            name: 'Example',
            config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 3 },
          },
        ],
        collections: [],
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Apply time', exact: true }).click();
  await expect(page.getByLabel('Available minutes', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByLabel('Available minutes', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'false',
  );
});
const session = {
  id: 'flow',
  name: 'Two blocks',
  blocks: [
    {
      id: 'a',
      name: 'Warm-up',
      config: {
        type: 'countdown',
        durationSeconds: 3,
        leadInSeconds: 0,
        warningSeconds: 1,
        exercises: [],
      },
      restSeconds: 2,
      advance: 'ready',
    },
    {
      id: 'b',
      name: 'Finish',
      config: {
        type: 'countdown',
        durationSeconds: 3,
        leadInSeconds: 0,
        warningSeconds: 1,
        exercises: [],
      },
      restSeconds: 0,
      advance: 'automatic',
    },
  ],
};
async function seedSession(page: import('@playwright/test').Page, duration?: number) {
  await page.goto('/');
  await page.evaluate(
    ({ session, duration }) => {
      if (duration) session.blocks[0].config.durationSeconds = duration;
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      );
    },
    { session, duration },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Two blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
}
test('waits explicitly after rest and records both blocks only once', async ({ page }) => {
  await seedSession(page);
  await expect(page.getByRole('heading', { name: 'Ready for the next block?' })).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(1200);
  await expect(page.getByText('Block 1 of 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ready — start next block' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Save session result' }).click();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nextround.training.v1')!),
  );
  expect(data.results).toHaveLength(1);
  expect(data.results[0].blocks.map((b: { status: string }) => b.status)).toEqual([
    'complete',
    'complete',
  ]);
  expect(data.recovery).toBeNull();
});
test('reload recovers paused and does not count time away', async ({ page }) => {
  await seedSession(page, 30);
  await page.waitForTimeout(2200);
  await page.reload();
  await page.getByRole('button', { name: 'Recover session paused', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume session', exact: true })).toBeVisible();
  const before = await page.getByTestId('round-clock').innerText();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('round-clock')).toHaveText(before);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await page.getByRole('button', { name: 'End and review' }).click();
  await expect(page.getByRole('heading', { name: 'Session review' })).toBeVisible();
  await page.getByRole('button', { name: 'Save session result' }).click();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nextround.training.v1')!),
  );
  expect(data.results[0].blocks.map((b: { status: string }) => b.status)).toEqual([
    'partial',
    'skipped',
  ]);
});
test('backup preview replaces data and retains a usable rollback copy', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  const backup = {
    format: 'nextround-backup',
    version: 1,
    createdAt: Date.now(),
    data: {
      templates: { version: 2, templates: [], collections: [] },
      history: { version: 1, results: [] },
      personal: { version: 1, exercises: [] },
      training: { version: 1, sessions: [], results: [], actuals: {}, recovery: null },
      window: { version: 1, closeBehavior: 'minimize' },
      preferences: {},
    },
  };
  await page.getByLabel('Choose JSON file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole('dialog', { name: 'Replace local training data?' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace data and reload' }).click();
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('nextround.training.v1')!).sessions),
  ).toHaveLength(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  await page.getByRole('button', { name: 'Review previous restore copy' }).click();
  await expect(page.getByRole('dialog', { name: 'Replace local training data?' })).toContainText(
    '1 saved sessions',
  );
  await page.getByRole('button', { name: 'Replace data and reload' }).click();
  await expect(page.getByRole('button', { name: 'Open Two blocks' })).toBeVisible();
});
test('failed initial checkpoint releases the session start guard', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Two blocks', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.training.v1') throw new Error('Disk full');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  await expect(page.getByRole('button', { name: 'Home', exact: true }).first()).toBeEnabled();
});
test('session actuals persist independently of targets and appear in history', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const config = {
      type: 'countdown',
      durationSeconds: 1,
      leadInSeconds: 0,
      warningSeconds: 0,
      exercises: [
        {
          id: 'e',
          name: 'Push-up',
          target: { unit: 'reps', value: 5 },
          supportedUnits: ['reps', 'seconds'],
        },
      ],
    };
    localStorage.setItem(
      'nextround.training.v1',
      JSON.stringify({
        version: 1,
        sessions: [
          {
            id: 's',
            name: 'Actual test',
            blocks: [{ id: 'b', name: 'Work', config, restSeconds: 0, advance: 'automatic' }],
          },
        ],
        results: [],
        actuals: {},
        recovery: null,
      }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open Actual test' }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
  await page.getByRole('button', { name: 'Record actuals for Work' }).click();
  await page.getByLabel('Reps', { exact: true }).fill('7');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.training.v1' && !failed) {
        failed = true;
        throw Error('Actual write failed');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Save actual performance', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Record actual performance' })).toContainText(
    'Actual write failed',
  );
  await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'Save actual performance' }).click();
  await page.getByRole('button', { name: 'Save session result' }).click();
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await expect(page).toHaveURL(/history/);
  await page.getByRole('button', { name: 'View session result' }).click();
  await expect(page.getByRole('dialog', { name: 'Actual test' })).toContainText('7 reps');
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nextround.training.v1')!),
  );
  expect(data.results[0].session.blocks[0].config.exercises[0].target.value).toBe(5);
  expect(data.results[0].blocks[0].actuals[0].reps).toBe(7);
  await page.getByLabel('Session note', { exact: true }).fill('Keep this observation');
  await page.getByRole('button', { name: 'Close result', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved changes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('Session note', { exact: true })).toHaveValue(
    'Keep this observation',
  );
});
test('imports a session-only collection atomically and exposes its saved routine', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  const shared = {
    format: 'nextround-collection',
    version: 2,
    name: 'Session collection',
    workouts: [],
    sessions: [session],
  };
  await page
    .getByRole('dialog', { name: 'Import workout collection' })
    .locator('input[type=file]')
    .setInputFiles({
      name: 'collection.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(shared)),
    });
  await page.getByRole('button', { name: 'Add collection and workouts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Two blocks' })).toBeVisible();
  const data = await page.evaluate(() => ({
    training: JSON.parse(localStorage.getItem('nextround.training.v1')!),
    templates: JSON.parse(localStorage.getItem('nextround.workout-templates.v1')!),
  }));
  expect(data.training.sessions).toHaveLength(1);
  expect(data.templates.collections).toHaveLength(1);
  expect(data.training.sessions[0].collections).toEqual([data.templates.collections[0].id]);
});
test('failed checkpoint after starting retains an explicitly recoverable paused session', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Two blocks', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.training.v1' && ++writes === 2)
        throw Error('Transient checkpoint failure');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recover session paused', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Recover session paused', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume session', exact: true })).toBeVisible();
});
test('session editor previews targets and supports drag and keyboard block ordering', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Two blocks', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Saved workout details', includeHidden: true }),
  ).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Drag block 1' })
    .dragTo(page.getByRole('button', { name: 'Drag block 2' }));
  await expect(page.getByLabel('Block 1 name', { exact: true })).toHaveValue(
    session.blocks[1].name,
  );
  await page.getByRole('button', { name: 'Move block 1 down', exact: true }).click();
  await expect(page.getByLabel('Block 1 name', { exact: true })).toHaveValue(
    session.blocks[0].name,
  );
});
test('runs all six modes in one session without saving standalone block results', async ({
  page,
}) => {
  test.setTimeout(60000);
  const common = {
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: [
      { id: 'e', name: 'Squat', target: { unit: 'reps', value: 2 }, supportedUnits: ['reps'] },
    ],
  };
  const configs = [
    { ...common, minutes: 1 },
    { ...common, type: 'countdown', durationSeconds: 1 },
    { ...common, type: 'intervals', rounds: 1, workSeconds: 1, restSeconds: 0 },
    { ...common, type: 'amrap', durationSeconds: 1 },
    { ...common, type: 'forTime' },
    {
      ...common,
      exercises: [{ id: 'e', name: 'Squat', supportedUnits: ['reps'] }],
      type: 'ladder',
      ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 1 },
    },
  ];
  await page.goto('/');
  await page.evaluate(
    (configs) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [
            {
              id: 'six',
              name: 'All six',
              blocks: configs.map((config, i) => ({
                id: String(i),
                name: `Mode ${i + 1}`,
                config,
                restSeconds: 0,
                advance: 'ready',
              })),
            },
          ],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    configs,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open All six' }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.clock.runFor(60500);
  await expect(page.getByRole('button', { name: 'Ready — start next block' })).toBeVisible();
  for (let i = 2; i <= 4; i++) {
    await page.getByRole('button', { name: 'Ready — start next block' }).click();
    await page.clock.runFor(1500);
    await expect(page.getByRole('button', { name: 'Ready — start next block' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Ready — start next block' }).click();
  await page.clock.runFor(1200);
  await page.getByRole('button', { name: 'Finish block', exact: true }).click();
  await page.getByRole('button', { name: 'Finish and review', exact: true }).click();
  await page.clock.runFor(250);
  await page.getByRole('button', { name: 'Ready — start next block' }).click();
  await page.clock.runFor(1200);
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await page.getByRole('button', { name: 'Finish and review', exact: true }).click();
  await page.clock.runFor(250);
  await expect(page.getByRole('heading', { name: 'Session complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save session result', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
  await page.clock.runFor(500);
  const data = await page.evaluate(() => ({
    training: JSON.parse(localStorage.getItem('nextround.training.v1')!),
    history: JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? '{"results":[]}'),
  }));
  expect(data.training.results[0].blocks).toHaveLength(6);
  expect(
    data.training.results[0].blocks.every((b: { status: string }) => b.status === 'complete'),
  ).toBe(true);
  expect(data.history.results).toHaveLength(0);
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await expect(page).toHaveURL(/history/);
});
test('minimum window keeps session actions visible and focuses invalid fields', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [session],
          results: [],
          actuals: {},
          recovery: null,
        }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Two blocks', exact: true }).click();
  await page.addStyleTag({ content: '::-webkit-scrollbar{width:16px;height:16px}' });
  await page.getByLabel('Session name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(page.getByLabel('Session name', { exact: true })).toBeFocused();
  await page.getByLabel('Session name', { exact: true }).fill('Long session name '.repeat(6));
  await page
    .getByRole('button', { name: 'Add Countdown block', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Save session', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeInViewport({
    ratio: 1,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '/tmp/nextround-200-planning/session-editor-760.png',
    fullPage: true,
  });
});
