import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * End to end tests of the resource mode, against the demo's "resources" dataset:
 * machines as rows (28px, lanes of 24px), zoom = hour (1px = 1 minute), snap = hour,
 * pointer-following drag, drops on "maint" rejected by canDrop.
 * "of1044-10" is on "tour-2", 09:00-12:00 (Europe/Paris).
 */

const bar = (page: Page, id: string) => page.locator(`[data-gantt="bar"][data-task-id="${id}"]`);
const row = (page: Page, id: string) => page.locator(`[data-gantt="row"][data-row-id="${id}"]`);
const logEntries = (page: Page) => page.getByTestId('log-entry');

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Real mouse drag with intermediate moves, from the centre of `from` by (dx, dy). */
async function drag(page: Page, from: Locator, dx: number, dy: number) {
  const start = await center(from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(start.x + (dx * i) / steps, start.y + (dy * i) / steps);
  }
}

/** Vertical distance from the centre of a bar to the first lane of a row. */
async function dyToRow(page: Page, barId: string, rowId: string) {
  const from = await center(bar(page, barId));
  const target = (await row(page, rowId).boundingBox())!;
  return target.y + 14 - from.y;
}

async function lastChange(page: Page) {
  const text = await logEntries(page).first().locator('pre').innerText();
  return JSON.parse(text)[0] as { id: string; start: string; end: string; rowId: string | null; previousRowId: string | null };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?dataset=resources&snapToTasks=false');
  await expect(bar(page, 'of1044-10')).toBeVisible();
});

test('renders machines as rows, overlapping operations on lanes, closed time', async ({ page }) => {
  await expect(page.locator('[data-gantt="row"]')).toHaveCount(7);
  await expect(page.locator('[data-gantt="header-sidebar"]')).toHaveText('Machines');
  await expect(row(page, 'tour-1')).toHaveAttribute('data-lanes', '2');
  expect((await row(page, 'tour-1').boundingBox())!.height).toBeCloseTo(52, 0);
  expect((await row(page, 'tour-2').boundingBox())!.height).toBeCloseTo(28, 0);
  // The 20 min lunch break of the press is narrow: plain fill, no hatch.
  await expect(row(page, 'presse').locator('[data-gantt="closed"][data-narrow="true"]').first()).toBeAttached();
  await expect(page.locator('[data-gantt="header-tick"]').first()).toBeAttached();
});

test('drags an operation to another machine', async ({ page }) => {
  const dy = await dyToRow(page, 'of1044-10', 'presse');
  await drag(page, bar(page, 'of1044-10'), 62, dy);
  // The bar follows the pointer, the indicator shows the snapped target, the ghost stays.
  await expect(bar(page, 'of1044-10')).toHaveAttribute('data-dragging', 'true');
  await expect(page.locator('[data-gantt="drop-indicator"]')).toBeVisible();
  await expect(page.locator('[data-gantt="ghost"]')).toHaveCount(1);
  await expect(row(page, 'presse')).toHaveAttribute('data-drop-target', 'true');
  await expect(page.getByTestId('preview')).toContainText('"rowId": "presse"');
  await page.mouse.up();

  await expect(logEntries(page)).toHaveCount(1);
  const change = await lastChange(page);
  expect(change.id).toBe('of1044-10');
  expect(change.rowId).toBe('presse');
  expect(change.previousRowId).toBe('tour-2');
  expect(change.start).toContain('T10:00:00');
  expect(change.end).toContain('T13:00:00');
  await expect(row(page, 'presse').locator('[data-gantt="bar"][data-task-id="of1044-10"]')).toBeVisible();
  await expect(page.locator('[data-gantt="drop-indicator"]')).toHaveCount(0);
});

test('a drop on a rejected machine is cancelled', async ({ page }) => {
  const dy = await dyToRow(page, 'of1044-10', 'maint');
  await drag(page, bar(page, 'of1044-10'), 0, dy);
  await expect(bar(page, 'of1044-10')).toHaveAttribute('data-invalid', 'true');
  await expect(page.locator('[data-gantt="drop-indicator"]')).toHaveAttribute('data-invalid', 'true');
  await expect(page.getByTestId('preview')).toContainText('"valid": false');
  await page.mouse.up();
  await expect(logEntries(page)).toHaveCount(0);
  await expect(row(page, 'tour-2').locator('[data-gantt="bar"][data-task-id="of1044-10"]')).toBeVisible();
  await expect(bar(page, 'of1044-10')).not.toHaveAttribute('data-invalid', 'true');
});

test('selecting an operation shows its links and highlights its order', async ({ page }) => {
  await expect(page.locator('[data-gantt="link"]')).toHaveCount(0);
  const target = await center(bar(page, 'of1042-20'));
  await page.mouse.click(target.x, target.y);
  await expect(bar(page, 'of1042-20')).toHaveAttribute('data-selected', 'true');
  await expect(row(page, 'fraise')).toHaveAttribute('data-has-selection', 'true');
  const links = page.locator('[data-gantt="link"]');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('data-link-id', 'l-1042-a');
  await expect(bar(page, 'of1042-10')).toHaveAttribute('data-highlighted', 'true');
  await expect(bar(page, 'of1042-30')).toHaveAttribute('data-highlighted', 'true');

  // Shift + click adds an operation of another order and its links.
  const other = await center(bar(page, 'of1043-20'));
  await page.keyboard.down('Shift');
  await page.mouse.click(other.x, other.y);
  await page.keyboard.up('Shift');
  await expect(links).toHaveCount(4);

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-gantt="bar"][data-selected]')).toHaveCount(0);
  await expect(links).toHaveCount(0);
});
