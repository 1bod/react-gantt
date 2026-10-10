import { act, fireEvent, render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTaskChange } from '../core/apply';
import type { GanttHandle } from '../props';
import {
  baseProps,
  DAY_START,
  dragBy,
  getBar,
  getResourceRow,
  getResourceRowIds,
  H,
  makeResourceRows,
  makeResourceTasks,
  makeTasks,
  queryBar,
  release,
  resourceProps,
} from '../test-utils';
import type { GanttResourceRow, GanttTask, TaskChange } from '../types';
import { Gantt } from './Gantt';

afterEach(() => {
  vi.restoreAllMocks();
});

const iso = (dt: DateTime) => dt.toUTC().toISO({ suppressMilliseconds: true });
const at = (hours: number) => DateTime.fromMillis(DAY_START + hours * H, { zone: 'utc' });

describe('resource mode: rendering', () => {
  it('renders one row per resource with its label, and the bars on their row', () => {
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} />);
    expect(getResourceRowIds()).toEqual(['m1', 'm2', 'm3']);
    expect(screen.getByText('Machine 2')).toBeInTheDocument();
    expect(getResourceRow('m1').querySelectorAll('[data-gantt="bar"]')).toHaveLength(2);
    expect(getResourceRow('m2').querySelector('[data-gantt="bar"]')).toBe(getBar('c'));
    expect(getResourceRow('m1')).toHaveAttribute('data-kind', 'resource');
    // No toggles in resource mode.
    expect(document.querySelector('[data-gantt="toggle"]')).toBeNull();
    expect(document.querySelector('[data-gantt="root"]')).toHaveStyle({ '--gantt-lane-height': '24px' });
  });

  it('packs overlapping bars into lanes and grows the row', () => {
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} />);
    const m1 = getResourceRow('m1');
    expect(m1.dataset.lanes).toBe('2');
    expect(m1).toHaveStyle({ top: '48px', height: '52px' });
    expect(getResourceRow('m2')).toHaveStyle({ top: `${48 + 52}px`, height: '28px' });
    expect(getResourceRow('m3')).toHaveStyle({ top: `${48 + 80}px` });
    expect(getBar('a')).toHaveStyle({ top: '4px', height: '20px', left: '600px', width: '120px' });
    expect(getBar('b')).toHaveStyle({ top: '28px', height: '20px' });
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    expect(scroller.firstElementChild).toHaveStyle({ height: `${48 + 108}px` });
  });

  it('defaults laneHeight to rowHeight and the inset to 15% of the row', () => {
    render(<Gantt {...baseProps} rows={makeResourceRows()} tasks={makeResourceTasks()} />);
    expect(getResourceRow('m1')).toHaveStyle({ height: '72px' });
    expect(getBar('b')).toHaveStyle({ top: `${36 + 5}px`, height: '26px' });
  });

  it('only draws tasks whose rowId matches a row, children included', () => {
    const tasks: GanttTask[] = [
      ...makeResourceTasks(),
      { id: 'orphan', label: 'Orphan', start: DAY_START, end: DAY_START + H },
      {
        id: 'order',
        label: 'Order',
        start: DAY_START,
        end: DAY_START + 20 * H,
        children: [{ id: 'op', label: 'Op', start: DAY_START + 16 * H, end: DAY_START + 17 * H, rowId: 'm2' }],
      },
    ];
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={tasks} />);
    expect(queryBar('orphan')).toBeNull();
    expect(queryBar('order')).toBeNull();
    expect(getBar('op').dataset.kind).toBe('child');
  });

  it('renderRowLabel and renderBar receive the resource context', () => {
    const rows: GanttResourceRow<{ code: string }>[] = [
      { id: 'm1', label: 'Machine 1', data: { code: 'M-01' } },
      { id: 'm2', label: 'Machine 2', data: { code: 'M-02' } },
      { id: 'm3', label: 'Machine 3', data: { code: 'M-03' } },
    ];
    render(
      <Gantt<unknown, { code: string }>
        {...resourceProps}
        rows={rows}
        tasks={makeResourceTasks()}
        renderRowLabel={({ row, index, tasks, laneCount }) => `${row.data?.code}#${index}:${tasks.map((t) => t.id).join('')}/${laneCount}`}
        renderBar={({ task, resource, lane, row }) => `${task.id}@${resource?.data?.code}/${lane}/${row.kind}`}
      />,
    );
    expect(screen.getByText('M-01#0:ab/2')).toBeInTheDocument();
    expect(screen.getByText('M-03#2:d/1')).toBeInTheDocument();
    expect(screen.getByText('b@M-01/1/leaf')).toBeInTheDocument();
  });

  it('task mode bars switch to pixel geometry with barInset', () => {
    render(<Gantt {...baseProps} barInset={6} tasks={makeTasks()} />);
    expect(getBar('a')).toHaveStyle({ top: '6px', height: '24px' });
  });
});

describe('resource mode: drag', () => {
  it('reports the target rowId when a bar is dropped on another row', () => {
    const onTaskChange = vi.fn();
    const onDragPreview = vi.fn();
    render(
      <Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} onTaskChange={onTaskChange} onDragPreview={onDragPreview} />,
    );
    const bar = getBar('a');
    // Centre of A (row m1, lane 0) is at 14px; m2 spans 52-80.
    dragBy(bar, 60, 50, { hold: true });
    expect(onDragPreview).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a', rowId: 'm2' }));
    expect(getResourceRow('m2')).toHaveAttribute('data-drop-target', 'true');
    expect(bar.style.transform).toBe('translateY(52px)');
    expect(document.querySelector('[data-gantt="ghost"]')).toHaveStyle({ left: '600px', top: '4px', height: '20px' });
    release(bar, 160, 150);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.rowId).toBe('m2');
    expect(change.previousRowId).toBe('m1');
    expect(change.position).toBeUndefined();
    expect(iso(change.start)).toBe(iso(at(11)));
  });

  it('measures the vertical move from the bar lane', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} onTaskChange={onTaskChange} />);
    // B sits on lane 1 of m1: its centre is at 38px, 20px lower is m2.
    dragBy(getBar('b'), 0, 20, { hold: true });
    expect(getBar('b').style.transform).toBe(`translateY(${52 - 24}px)`);
    release(getBar('b'), 100, 120);
    expect(onTaskChange.mock.calls[0]![0]).toMatchObject({ id: 'b', rowId: 'm2', previousRowId: 'm1' });
  });

  it('a horizontal move keeps the row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('c'), 30, 5);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.rowId).toBeUndefined();
    expect(change.previousRowId).toBe('m2');
    expect(iso(change.start)).toBe(iso(DateTime.fromMillis(DAY_START + 14.5 * H, { zone: 'utc' })));
  });

  it('does not emit when dropped back on its own row at the same time', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 0, 8);
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('works end to end with applyTaskChange', () => {
    function Harness() {
      const [tasks, setTasks] = useState<GanttTask[]>(makeResourceTasks());
      return <Gantt {...resourceProps} rows={makeResourceRows()} tasks={tasks} onTaskChange={(change) => setTasks((prev) => applyTaskChange(prev, change))} />;
    }
    render(<Harness />);
    dragBy(getBar('a'), 0, 80); // 14 + 80 = 94: m3
    expect(getResourceRow('m3').querySelectorAll('[data-gantt="bar"]')).toHaveLength(2);
    expect(getResourceRow('m1')).toHaveStyle({ height: '28px' });
    expect(getResourceRow('m1').dataset.lanes).toBe('1');
  });

  it('clicking a parent bar does not expand anything', () => {
    const onTaskClick = vi.fn();
    const tasks: GanttTask[] = [
      {
        id: 'p',
        label: 'Parent',
        start: DAY_START + 2 * H,
        end: DAY_START + 4 * H,
        rowId: 'm1',
        children: [{ id: 'p1', label: 'P1', start: DAY_START + 5 * H, end: DAY_START + 6 * H, rowId: 'm2' }],
      },
    ];
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={tasks} onTaskClick={onTaskClick} />);
    dragBy(getBar('p'), 1, 0);
    fireEvent.keyDown(getBar('p'), { key: 'Enter' });
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(getResourceRowIds()).toEqual(['m1', 'm2', 'm3']);
  });
});

describe('resource mode: keyboard', () => {
  it('moves a bar to the next / previous row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} onTaskChange={onTaskChange} />);
    fireEvent.keyDown(getBar('a'), { key: 'ArrowDown' });
    expect(onTaskChange.mock.calls[0]![0]).toMatchObject({ id: 'a', reason: 'keyboard', rowId: 'm2', previousRowId: 'm1' });
    fireEvent.keyDown(getBar('a'), { key: 'ArrowUp' });
    expect(onTaskChange).toHaveBeenCalledTimes(1); // already the first row
    fireEvent.keyDown(getBar('d'), { key: 'ArrowUp' });
    expect(onTaskChange.mock.calls[1]![0]).toMatchObject({ id: 'd', rowId: 'm2' });
  });
});

describe('resource mode: draft', () => {
  it('previews a row change with a ghost on the original row and commits the rowId', () => {
    const onDraftCommit = vi.fn();
    render(<Gantt {...resourceProps} draft rows={makeResourceRows()} tasks={makeResourceTasks()} onDraftCommit={onDraftCommit} />);
    dragBy(getBar('a'), 0, 80);
    expect(getResourceRow('m3').contains(getBar('a'))).toBe(true);
    expect(getBar('a').dataset.pending).toBe('true');
    const ghost = getResourceRow('m1').querySelector('[data-gantt="ghost"]');
    expect(ghost).toHaveStyle({ left: '600px', width: '120px' });
    // A second edit of the same task keeps the original row.
    dragBy(getBar('a'), 60, 0);
    expect(getResourceRow('m1').querySelector('[data-gantt="ghost"]')).not.toBeNull();
    fireEvent.click(screen.getByText('Apply'));
    const changes: TaskChange[] = onDraftCommit.mock.calls[0]![0];
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: 'a', rowId: 'm3', previousRowId: 'm1' });
  });

  it('draws the ghost on the bar lane when the row did not change', () => {
    render(<Gantt {...resourceProps} draft rows={makeResourceRows()} tasks={makeResourceTasks()} />);
    dragBy(getBar('b'), 120, 0); // 13:00-15:00, still overlapping nothing: one lane left
    const ghost = getResourceRow('m1').querySelector('[data-gantt="ghost"]');
    expect(ghost).toHaveStyle({ left: `${11 * 60}px`, top: '4px' });
  });
});

describe('resource mode: virtualization', () => {
  function bigRows(count: number): { rows: GanttResourceRow[]; tasks: GanttTask[] } {
    const rows = Array.from({ length: count }, (_, i) => ({ id: `r${i}`, label: `Resource ${i}` }));
    const tasks: GanttTask[] = [];
    rows.forEach((row, i) => {
      tasks.push({ id: `t${i}`, label: `T${i}`, start: DAY_START + 2 * H, end: DAY_START + 4 * H, rowId: row.id });
      // Every other row has two overlapping bars: 52px instead of 28px.
      if (i % 2 === 0) tasks.push({ id: `u${i}`, label: `U${i}`, start: DAY_START + 3 * H, end: DAY_START + 5 * H, rowId: row.id });
    });
    return { rows, tasks };
  }

  it('renders only the rows around the viewport, with variable heights', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48 + 400);
    const { rows, tasks } = bigRows(2000);
    render(<Gantt {...resourceProps} rows={rows} tasks={tasks} overscan={2} />);
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    expect(scroller.firstElementChild).toHaveStyle({ height: `${48 + 1000 * 52 + 1000 * 28}px` });
    expect(getResourceRowIds().length).toBeLessThan(20);
    scroller.scrollTop = 500 * 80; // row 1000 starts at 1000 / 2 * 80
    fireEvent.scroll(scroller);
    const ids = getResourceRowIds();
    expect(ids[0]).toBe('r998');
    expect(ids).toContain('r1005');
    expect(ids).not.toContain('r0');
  });

  it('scrollToTask scrolls to the row of the task', () => {
    const ref = createRef<GanttHandle>();
    const { rows, tasks } = bigRows(300);
    render(<Gantt {...resourceProps} ref={ref} rows={rows} tasks={tasks} />);
    act(() => ref.current!.scrollToTask('u200'));
    expect(ref.current!.getScrollElement()!.scrollTop).toBe(100 * 80);
    act(() => ref.current!.scrollToTask('missing'));
    expect(ref.current!.getScrollElement()!.scrollTop).toBe(100 * 80);
  });

  it('keeps the dragged row mounted when it scrolls out of the window', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48 + 400);
    const { rows, tasks } = bigRows(2000);
    render(<Gantt {...resourceProps} rows={rows} tasks={tasks} overscan={2} />);
    const bar = getBar('t0');
    dragBy(bar, 10, 10, { hold: true });
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    scroller.scrollTop = 500 * 80;
    fireEvent.scroll(scroller);
    expect(getResourceRowIds()).toContain('r0');
    expect(getBar('t0').dataset.dragging).toBe('true');
    release(bar, 110, 110);
  });
});
