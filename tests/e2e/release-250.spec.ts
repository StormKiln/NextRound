import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page) {
  await page.goto('/');
  const session = result220().session;
  await page.evaluate((session) => {
    localStorage.setItem(
      'nextround.training.v1',
      JSON.stringify({ version: 1, sessions: [session], results: [], actuals: {}, recovery: null }),
    );
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 2,
        templates: [
          { id: 'a', name: 'Alpha warm up', favourite: true, config: session.blocks[0].config },
          {
            id: 'b',
            name: 'Beta strength',
            config: {
              ...session.blocks[0].config,
              type: 'emom',
              minutes: 2,
              durationSeconds: undefined,
            },
          },
        ],
        collections: [],
      }),
    );
  }, session);
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
}
test('batch chooser previews, orders and appends independent workouts with Undo', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await dialog.getByRole('checkbox', { name: 'Select Alpha warm up' }).check();
  await dialog.getByRole('checkbox', { name: 'Select Beta strength' }).check();
  await dialog.getByRole('button', { name: 'Move selected workout 2 up' }).click();
  await dialog.getByRole('button', { name: 'Preview Beta strength' }).click();
  await expect(dialog.getByRole('region', { name: 'Saved workout details' })).toContainText('EMOM');
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/workout-chooser.png' });
  await dialog.getByRole('button', { name: 'Add selected workouts', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('Block 2 name')).toHaveValue('Beta strength');
  await expect(page.getByLabel('Block 3 name')).toHaveValue('Alpha warm up');
  await expect(page.getByRole('button', { name: 'Edit block 2', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(1);
});
test('changed selection cannot append before explicit refresh and review', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await dialog.getByRole('checkbox', { name: 'Select Alpha warm up' }).check();
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.workout-templates.v1')!);
    d.templates[0].name = 'Changed warm up';
    localStorage.setItem('nextround.workout-templates.v1', JSON.stringify(d));
  });
  await dialog.getByRole('button', { name: 'Add selected workouts', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('changed');
  await expect(
    dialog.getByRole('button', { name: 'Add selected workouts', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Select Changed warm up' })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Select Changed warm up' })).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(1);
});
test('shared library labels include sessions', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  await expect(page.getByLabel('Search saved library', { exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'All collections', exact: true })).toHaveCount(1);
});
test('block update and addition use distinct instructions and actions', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit block 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Update block', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Session block editor' })).toContainText(
    'Update this block',
  );
  await page.getByRole('button', { name: 'Cancel block edit' }).click();
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add block to session', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel block edit' }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(1);
});
test('duplicate and boundary moves announce position and preserve useful focus through Undo', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Duplicate block 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit block 2', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Duplicated Work');
  await page.getByRole('button', { name: 'Move block 2 up', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('position 1 of 2');
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.getByRole('button', { name: 'Edit block 2', exact: true })).toBeFocused();
  await expect(page.getByLabel('Block 2 name')).toHaveValue('Work copy');
});
test('chooser filters are independent and cancellation preserves the editor', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await dialog.getByLabel('Favourites only').check();
  await expect(dialog.getByRole('checkbox', { name: 'Select Beta strength' })).toHaveCount(0);
  await dialog.getByLabel('Favourites only').uncheck();
  await dialog.getByRole('combobox', { name: 'Workout type', exact: true }).selectOption('emom');
  await expect(dialog.getByRole('checkbox', { name: 'Select Alpha warm up' })).toHaveCount(0);
  await dialog.getByLabel('Find a saved workout').fill('Push-up');
  await dialog.getByRole('checkbox', { name: 'Select Beta strength' }).check();
  await dialog.getByLabel('Find a saved workout').fill('no matches');
  await expect(dialog).toContainText('No workouts match');
  await expect(dialog.getByRole('list', { name: 'Selected workout order' })).toContainText(
    'Beta strength',
  );
  // Chromium consumes Escape to clear a nonempty search field. Test modal
  // cancellation from a control without that native search-field behavior.
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Choose saved workouts', exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(1);
});
test('deleted selection and failed reads cannot append cached workouts', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await dialog.getByRole('checkbox', { name: 'Select Beta strength' }).check();
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.workout-templates.v1')!);
    d.templates.pop();
    localStorage.setItem('nextround.workout-templates.v1', JSON.stringify(d));
  });
  await dialog.getByRole('button', { name: 'Add selected workouts', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('removed');
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'nextround.workout-templates.v1') throw Error('Read unavailable');
      return original.call(this, key);
    };
  });
  await dialog.getByRole('button', { name: 'Refresh saved workouts' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Read unavailable');
  await expect(
    dialog.getByRole('button', { name: 'Add selected workouts', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(1);
});
test('capacity is explicit and never truncates a selected batch', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    const b = d.sessions[0].blocks[0];
    d.sessions[0].blocks = Array.from({ length: 19 }, (_, i) => ({
      ...structuredClone(b),
      id: 'block' + i,
    }));
    localStorage.setItem('nextround.training.v1', JSON.stringify(d));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await dialog.getByRole('checkbox', { name: 'Select Alpha warm up' }).check();
  await expect(dialog).toContainText('1 available block slots');
  await expect(dialog.getByRole('checkbox', { name: 'Select Beta strength' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Add selected workouts', exact: true }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(20);
  await expect(
    page.getByRole('button', { name: 'Choose saved workouts', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(19);
});
test('session and chooser selects have usable height and reachable actions at minimum size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.getByRole('button', { name: 'Duplicate block 1', exact: true }).click();
  const select = page.getByRole('combobox', { name: 'After rest', exact: true });
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  expect(
    (await dialog.getByRole('combobox', { name: 'Workout type', exact: true }).boundingBox())!
      .height,
  ).toBeGreaterThanOrEqual(44);
  await expect(
    dialog.getByRole('button', { name: 'Add selected workouts', exact: true }),
  ).toBeInViewport();
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
});

test('actual performance selects are readable in WebKit at minimum size', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.evaluate((result) => {
    localStorage.setItem(
      'nextround.training.v1',
      JSON.stringify({ version: 1, sessions: [], results: [result], actuals: {}, recovery: null }),
    );
  }, result220());
  await page.reload();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: 'View session result', exact: true }).click();
  await page.getByRole('button', { name: 'Edit actuals for Work', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Record actual performance', exact: true });
  for (const name of ['Movement', 'Record for', 'Load unit']) {
    const select = dialog.getByRole('combobox', { name, exact: true });
    expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
});

test('long selected lists keep chooser actions visible and selection order accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.workout-templates.v1')!);
    d.templates = Array.from({ length: 20 }, (_, i) => ({
      ...structuredClone(d.templates[0]),
      id: `long-${i}`,
      name: `Workout ${i + 1} with a deliberately long descriptive title for a training block`,
    }));
    localStorage.setItem('nextround.workout-templates.v1', JSON.stringify(d));
  });
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  for (let i = 1; i <= 19; i++)
    await dialog
      .getByRole('checkbox', {
        name: `Select Workout ${i} with a deliberately long descriptive title for a training block`,
        exact: true,
      })
      .check();
  await expect(
    dialog.getByRole('button', { name: 'Add selected workouts', exact: true }),
  ).toBeInViewport();
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Move selected workout 19 up', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Remove selected workout 18', exact: true }),
  ).toBeFocused();
  await expect(dialog.locator('.chooser-footer').getByRole('status')).toContainText(
    'position 18 of 19',
  );
  await dialog.getByRole('button', { name: 'Remove selected workout 18', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Remove selected workout 18', exact: true }),
  ).toBeFocused();
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/workout-chooser-minimum.png' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Choose saved workouts', exact: true }),
  ).toBeFocused();
});
