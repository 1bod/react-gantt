import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GanttRow } from '../core/rows';
import { baseProps, DAY_START, getResourceRow, H, makeResourceRows, makeResourceTasks, makeTasks, resourceProps } from '../test-utils';
import type { ClosedRange, GanttResourceRow } from '../types';
import { Gantt } from './Gantt';

afterEach(() => {
  vi.restoreAllMocks();
});

const closedBlocks = (container: Element) => Array.from(container.querySelectorAll<HTMLElement>('[data-gantt="closed"]'));

describe('closed time', () => {
  // Nights 20:00-06:00 on every row, plus a 15 min break on m2.
  const nights: ClosedRange[] = [
    { start: DAY_START - 4 * H, end: DAY_START + 6 * H },
    { start: DAY_START + 20 * H, end: DAY_START + 30 * H },
  ];
  const closedRanges = (row: GanttResourceRow | GanttRow): ClosedRange[] =>
    'task' in row ? [] : row.id === 'm2' ? [...nights, { start: DAY_START + 12 * H, end: DAY_START + 12.25 * H }] : nights;

  it('draws a block per closed range, clipped to the timeline', () => {
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={closedRanges} />);
    const blocks = closedBlocks(getResourceRow('m1'));
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveStyle({ left: '0px', width: `${6 * 60}px` });
    expect(blocks[1]).toHaveStyle({ left: `${20 * 60}px`, width: `${4 * 60}px` }); // the range ends at midnight
    expect(blocks[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks blocks narrower than the threshold', () => {
    const { rerender } = render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={closedRanges} />);
    const narrow = closedBlocks(getResourceRow('m2')).filter((block) => block.dataset.narrow === 'true');
    expect(narrow).toHaveLength(1);
    expect(narrow[0]).toHaveStyle({ left: `${12 * 60}px`, width: '15px' });
    rerender(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={closedRanges} closedNarrowThreshold={10} />);
    expect(closedBlocks(getResourceRow('m2')).filter((block) => block.dataset.narrow)).toHaveLength(0);
  });

  it('draws only the visible window', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={closedRanges} />);
    // Window: scrollLeft 0, sidebar 200, viewport 400 and one viewport of margin => up to 600px (10:00).
    const blocks = closedBlocks(getResourceRow('m2'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveStyle({ left: '0px', width: '360px' });
  });

  it('calls the function once per row and caches the result', () => {
    const spy = vi.fn(closedRanges);
    const { rerender } = render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={spy} />);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls.map((call) => (call[0] as GanttResourceRow).id)).toEqual(['m1', 'm2', 'm3']);
    rerender(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={spy} showNow />);
    expect(spy).toHaveBeenCalledTimes(6); // new rows array: recomputed
    const rows = makeResourceRows();
    rerender(<Gantt {...resourceProps} rows={rows} tasks={makeResourceTasks()} closedRanges={spy} />);
    rerender(<Gantt {...resourceProps} rows={rows} tasks={makeResourceTasks()} closedRanges={spy} showNow />);
    expect(spy).toHaveBeenCalledTimes(9);
  });

  it('task mode: called with the task row', () => {
    const spy = vi.fn((row: GanttResourceRow | GanttRow) => ('task' in row && row.task.id === 'b' ? nights : []));
    render(<Gantt {...baseProps} tasks={makeTasks()} closedRanges={spy} />);
    const row = document.querySelector('[data-gantt="row"][data-task-id="b"]')!;
    expect(closedBlocks(row)).toHaveLength(2);
    expect(closedBlocks(document.body)).toHaveLength(2);
    expect((spy.mock.calls[0]![0] as GanttRow).task.id).toBe('a');
  });

  it('accepts a slot class', () => {
    render(
      <Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} closedRanges={closedRanges} classNames={{ closedRange: 'my-closed' }} />,
    );
    expect(closedBlocks(document.body)[0]).toHaveClass('gantt-closed', 'my-closed');
  });
});

describe('header', () => {
  const cells = (tier: 'top' | 'bottom') => Array.from(document.querySelectorAll<HTMLElement>(`[data-gantt="header-cell"][data-tier="${tier}"]`));

  it('renders the sidebar header cell', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} renderSidebarHeader={() => <button type="button">Rows</button>} />);
    const cell = document.querySelector('[data-gantt="header-sidebar"]')!;
    expect(cell).toContainElement(screen.getByRole('button', { name: 'Rows' }));
  });

  it('uses the tiers of the current zoom level', () => {
    const headerTiers = {
      hour: [
        { unit: 'day', format: 'ccc d LLL' },
        { unit: 'hour', step: 6, format: 'HH:mm' },
      ],
    } as const;
    const { rerender } = render(<Gantt {...baseProps} tasks={makeTasks()} headerTiers={{ hour: [...headerTiers.hour] }} />);
    expect(cells('top').map((cell) => cell.textContent)).toEqual(['Mon 5 Jan']);
    expect(cells('bottom').map((cell) => cell.textContent)).toEqual(['00:00', '06:00', '12:00', '18:00']);
    expect(cells('bottom')[1]).toHaveStyle({ left: '360px', width: '360px' });
    // Grid lines follow the bottom tier, majors at the top tier boundaries.
    const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-gantt="grid-line"]'));
    expect(lines.map((line) => line.style.left)).toEqual(['0px', '360px', '720px', '1080px']);
    expect(lines.map((line) => line.dataset.major ?? '')).toEqual(['true', '', '', '']);
    // Another zoom level without custom tiers: defaults.
    rerender(<Gantt {...baseProps} zoom="day" tasks={makeTasks()} headerTiers={{ hour: [...headerTiers.hour] }} />);
    expect(cells('top')[0]!.textContent).toBe('January 2026');
  });

  it('draws ticks on the bottom tier with labels anchored at them', () => {
    const { rerender } = render(<Gantt {...baseProps} tasks={makeTasks()} />);
    expect(document.querySelector('[data-gantt="header-tick"]')).toBeNull();
    expect(cells('bottom')[0]).toHaveClass('justify-center', 'border-r');
    rerender(<Gantt {...baseProps} tasks={makeTasks()} showTicks classNames={{ headerTick: 'my-tick' }} />);
    const ticks = document.querySelectorAll('[data-gantt="header-tick"]');
    expect(ticks).toHaveLength(23); // none at the very start of the timeline
    expect(ticks[0]).toHaveClass('gantt-header-tick', 'my-tick');
    expect(cells('bottom')[1]).toContainElement(ticks[0] as HTMLElement);
    expect(cells('bottom')[0]).not.toHaveClass('justify-center');
    expect(cells('bottom')[0]).not.toHaveClass('border-r');
    expect(cells('top')[0]).toHaveClass('border-r');
  });
});
