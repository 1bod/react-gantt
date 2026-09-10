import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * End to end tests run against the demo app with the fixed dataset:
 * zoom = hour (60px per hour, 1px = 1 minute), snap = hour, snapToTasks off unless stated.
 * Task "spec" is 08:00-12:00, "design" 13:00-17:00 (Europe/Paris).
 */

const bar = (page: Page, id: string) => page.locator(`[data-gantt="bar"][data-task-id="${id}"]`);
const rows = (page: Page) => page.locator('[data-gantt="row"]');
const logEntries = (page: Page) => page.getByTestId('log-entry');

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Real mouse drag with intermediate moves (pointer events need them). */
async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, opts: { release?: boolean } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
  }
  if (opts.release !== false) await page.mouse.up();
}

/** Scrolls the gantt so that the task's bar is rendered and in view. */
async function scrollToTask(page: Page, id: string) {
  await page.evaluate((taskId) => (window as Window & { gantt?: { scrollToTask: (id: string) => void } }).gantt?.scrollToTask(taskId), id);
  await expect(bar(page, id)).toBeVisible();
}

async function lastChange(page: Page) {
  const text = await logEntries(page).first().locator('pre').innerText();
  return JSON.parse(text)[0] as {
    id: string;
    reason: string;
    start: string;
    end: string;
    position: { parentId: string | null; index: number } | null;
    previousPosition: { parentId: string | null; index: number };
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?snapToTasks=false');
  await expect(bar(page, 'spec')).toBeVisible();
});

test('renders the project rows and the header', async ({ page }) => {
  await expect(rows(page)).toHaveCount(8); // spec design dev(+3 children expanded) ops review
  await expect(page.locator('[data-gantt="header-cell"]', { hasText: '08:00' }).first()).toBeVisible();
  await expect(page.locator('[data-gantt="header-cell"]', { hasText: 'lun. 5 janv. 2026' })).toBeVisible();
});

test('moves a task with the mouse and snaps to the hour', async ({ page }) => {
  const { x, y, box } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 130, 0); // 130 min -> 10:10 -> snapped to 10:00
  await expect(logEntries(page)).toHaveCount(1);
  const change = await lastChange(page);
  expect(change.id).toBe('spec');
  expect(change.reason).toBe('move');
  expect(change.start).toContain('T10:00:00');
  expect(change.end).toContain('T14:00:00');
  expect(change.position).toBeNull();
  const after = await bar(page, 'spec').boundingBox();
  expect(after!.x - box.x).toBeCloseTo(120, 0);
  expect(after!.width).toBeCloseTo(box.width, 0);
});

test('shows a live preview and a ghost during the drag', async ({ page }) => {
  const { x, y } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 60, 0, { release: false });
  await expect(bar(page, 'spec')).toHaveAttribute('data-dragging', 'true');
  await expect(page.locator('[data-gantt="ghost"]')).toHaveCount(1);
  await expect(page.getByTestId('preview')).toContainText('"snappedTo": "grid"');
  await expect(page.getByTestId('preview')).toContainText('05/01 09:00');
  await page.mouse.up();
  await expect(page.locator('[data-gantt="ghost"]')).toHaveCount(0);
  await expect(page.getByTestId('preview')).toHaveText('—');
});

test('resizes the end with the right handle', async ({ page }) => {
  const box = (await bar(page, 'spec').boundingBox())!;
  await drag(page, { x: box.x + box.width - 3, y: box.y + box.height / 2 }, 70, 0); // end 12:00 -> 13:10 -> 13:00
  const change = await lastChange(page);
  expect(change.reason).toBe('resize-end');
  expect(change.start).toContain('T08:00:00');
  expect(change.end).toContain('T13:00:00');
});

test('resizes the start with the left handle', async ({ page }) => {
  const box = (await bar(page, 'spec').boundingBox())!;
  await drag(page, { x: box.x + 3, y: box.y + box.height / 2 }, 50, 0); // start 08:00 -> 08:50 -> 09:00
  const change = await lastChange(page);
  expect(change.reason).toBe('resize-start');
  expect(change.start).toContain('T09:00:00');
  expect(change.end).toContain('T12:00:00');
});

test('snaps to the edge of a neighbouring task', async ({ page }) => {
  await page.goto('/?snapToTasks=true');
  const { x, y } = await center(bar(page, 'design'));
  await drag(page, { x, y }, -55, 0); // design start 13:00 -> 12:05, within 8px of spec end (12:00)
  const change = await lastChange(page);
  expect(change.id).toBe('design');
  expect(change.start).toContain('T12:00:00');
  expect(change.end).toContain('T16:00:00');
});

test('moves a task to another row and reports its new position', async ({ page }) => {
  const { x, y } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 0, 36 * 2, { release: false });
  await expect(page.locator('[data-gantt="row"][data-drop-target="true"]')).toHaveAttribute('data-task-id', 'dev');
  await page.mouse.up();
  const change = await lastChange(page);
  expect(change.position).toEqual({ parentId: null, index: 2 });
  expect(change.previousPosition).toEqual({ parentId: null, index: 0 });
  const ids = await rows(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.taskId));
  // "dev" is expanded, so its children follow it before "spec".
  expect(ids).toEqual(['design', 'dev', 'dev-api', 'dev-ui', 'dev-tests', 'spec', 'ops', 'review']);
});

test('nests a task into an expanded group', async ({ page }) => {
  // rows: spec design dev dev-api dev-ui dev-tests ops review. Drop "review" (7) on "dev-ui" (4)
  await scrollToTask(page, 'review');
  const { x, y } = await center(bar(page, 'review'));
  await drag(page, { x, y }, 0, -36 * 3);
  const change = await lastChange(page);
  expect(change.position).toEqual({ parentId: 'dev', index: 1 });
  const ids = await rows(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.taskId));
  expect(ids).toEqual(['spec', 'design', 'dev', 'dev-api', 'review', 'dev-ui', 'dev-tests', 'ops']);
});

test('escape cancels the drag', async ({ page }) => {
  const { x, y } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 100, 0, { release: false });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(logEntries(page)).toHaveCount(0);
  await expect(bar(page, 'spec')).not.toHaveAttribute('data-dragging', 'true');
});

test('a click (no movement) toggles a group instead of moving it', async ({ page }) => {
  await expect(bar(page, 'dev-api')).toBeVisible();
  const box = (await bar(page, 'dev').boundingBox())!; // wide bar: click near its left edge, inside the viewport
  await page.mouse.click(box.x + 30, box.y + box.height / 2);
  await expect(bar(page, 'dev-api')).toHaveCount(0);
  await expect(logEntries(page)).toHaveCount(0);
  await page.locator('[data-gantt="row"][data-task-id="dev"] [data-gantt="toggle"]').click();
  await expect(bar(page, 'dev-api')).toBeVisible();
});

test('inline groups draw their children on the parent row', async ({ page }) => {
  await scrollToTask(page, 'ops-staging');
  const opsRow = page.locator('[data-gantt="row"][data-task-id="ops"]');
  await expect(opsRow.locator('[data-gantt="bar"]')).toHaveCount(2);
  const { x, y } = await center(bar(page, 'ops-prod'));
  await drag(page, { x, y }, -60, 0);
  const change = await lastChange(page);
  expect(change.id).toBe('ops-prod');
  expect(change.previousPosition).toEqual({ parentId: 'ops', index: 1 });
});

test('keyboard: arrows move the focused bar', async ({ page }) => {
  await bar(page, 'spec').focus();
  await page.keyboard.press('ArrowRight');
  let change = await lastChange(page);
  expect(change.reason).toBe('keyboard');
  expect(change.start).toContain('T09:00:00');
  await page.keyboard.press('Shift+ArrowRight');
  change = await lastChange(page);
  expect(change.end).toContain('T14:00:00');
  await page.keyboard.press('ArrowDown');
  change = await lastChange(page);
  expect(change.position).toEqual({ parentId: null, index: 1 });
});

test('draft mode collects the changes and commits them at once', async ({ page }) => {
  await page.getByTestId('draft').check();
  const spec = await center(bar(page, 'spec'));
  await drag(page, spec, 60, 0);
  const design = await center(bar(page, 'design'));
  await drag(page, design, 0, 36 * 2);
  await expect(logEntries(page)).toHaveCount(0);
  await expect(page.locator('[data-gantt="draft-toolbar"]')).toContainText('2 modifications en attente');
  await expect(bar(page, 'spec')).toHaveAttribute('data-pending', 'true');
  await expect(page.locator('[data-gantt="ghost"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(logEntries(page)).toHaveCount(1);
  await expect(logEntries(page).first()).toHaveAttribute('data-kind', 'commit');
  const changes = JSON.parse(await logEntries(page).first().locator('pre').innerText()) as Array<{ id: string; position: unknown }>;
  expect(changes.map((c) => c.id)).toEqual(['spec', 'design']);
  // dropped on the row of dev-api (dev is expanded): nested as first child of dev
  expect(changes[1]!.position).toEqual({ parentId: 'dev', index: 0 });
  await expect(page.locator('[data-gantt="draft-toolbar"]')).toHaveCount(0);
});

test('draft mode: discard restores the original state', async ({ page }) => {
  await page.getByTestId('draft').check();
  const before = (await bar(page, 'spec').boundingBox())!;
  const spec = await center(bar(page, 'spec'));
  await drag(page, spec, 60, 0);
  expect((await bar(page, 'spec').boundingBox())!.x).toBeGreaterThan(before.x + 50);
  await page.getByRole('button', { name: 'Annuler' }).click();
  expect((await bar(page, 'spec').boundingBox())!.x).toBeCloseTo(before.x, 0);
  await expect(logEntries(page)).toHaveCount(0);
});

test('read only mode disables dragging', async ({ page }) => {
  await page.getByTestId('readOnly').check();
  const { x, y } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 100, 0);
  await expect(logEntries(page)).toHaveCount(0);
});

test('a rejected change is not applied', async ({ page }) => {
  await page.getByTestId('reject').check();
  const before = (await bar(page, 'spec').boundingBox())!;
  const { x, y } = await center(bar(page, 'spec'));
  await drag(page, { x, y }, 100, 0);
  await expect(logEntries(page).first()).toHaveAttribute('data-kind', 'rejected');
  expect((await bar(page, 'spec').boundingBox())!.x).toBeCloseTo(before.x, 0);
});

test('virtualizes thousands of rows', async ({ page }) => {
  await page.goto('/?dataset=big&zoom=day');
  await expect(rows(page).first()).toBeVisible();
  const rendered = await rows(page).count();
  expect(rendered).toBeLessThan(80);
  const scroller = page.locator('[data-gantt="scroller"]');
  await expect(scroller.locator('> div')).toHaveCSS('height', `${48 + 3000 * 36}px`);
  await scroller.evaluate((el) => {
    el.scrollTop = 36 * 2000;
  });
  await expect(page.locator('[data-gantt="row"][data-task-id="gen-2000"]')).toBeVisible();
  await expect(page.locator('[data-gantt="row"][data-task-id="gen-0"]')).toHaveCount(0);
});

test('drags a row in the big dataset', async ({ page }) => {
  await page.goto('/?dataset=big&zoom=day&snap=day');
  await scrollToTask(page, 'gen-1');
  const { x, y } = await center(bar(page, 'gen-1'));
  await drag(page, { x, y }, 40, 0); // 40px = 1 day at the day zoom
  const change = await lastChange(page);
  expect(change.id).toBe('gen-1');
  expect(change.reason).toBe('move');
});

test('ctrl + wheel changes the zoom level', async ({ page }) => {
  await expect(page.getByTestId('zoom')).toHaveValue('hour');
  const { x, y } = await center(bar(page, 'spec'));
  await page.mouse.move(x, y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Control');
  await expect(page.getByTestId('zoom')).toHaveValue('day');
});
