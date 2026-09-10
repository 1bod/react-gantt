import { act, fireEvent, render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTaskChange } from '../core/apply';
import type { GanttHandle } from '../props';
import { baseProps, DAY_START, dragBy, getBar, getRowIds, H, handle, makeTasks, MIN, queryBar, release, toggleButton } from '../test-utils';
import type { GanttTask, TaskChange } from '../types';
import { Gantt } from './Gantt';

afterEach(() => {
  vi.restoreAllMocks();
});

const iso = (dt: DateTime) => dt.toUTC().toISO({ suppressMilliseconds: true });
const at = (hours: number, minutes = 0) => DateTime.fromMillis(DAY_START + hours * H + minutes * MIN, { zone: 'utc' });

describe('rendering', () => {
  it('renders one row per root task, groups collapsed', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    expect(getRowIds()).toEqual(['a', 'b', 'g', 'i']);
    expect(queryBar('g1')).toBeNull();
    expect(screen.getAllByText('Task A')).toHaveLength(2); // sidebar + bar
  });

  it('applies the task color and data attributes', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    const bar = getBar('b');
    expect(bar.style.getPropertyValue('--gantt-bar-bg')).toBe('#ff0000');
    expect(bar.dataset.kind).toBe('leaf');
    expect(getBar('g').dataset.kind).toBe('group');
  });

  it('positions bars from the time scale (1px = 1 minute)', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    const bar = getBar('a');
    expect(bar.style.left).toBe(`${10 * 60}px`);
    expect(bar.style.width).toBe(`${2 * 60}px`);
  });

  it('inline groups draw their children on the parent row', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    expect(queryBar('i')).toBeNull();
    const row = document.querySelector('[data-gantt="row"][data-task-id="i"]')!;
    expect(row.querySelectorAll('[data-gantt="bar"]')).toHaveLength(2);
    expect(getBar('i1').dataset.kind).toBe('child');
  });

  it('renders header tiers', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    expect(screen.getByText('Mon 5 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('supports render props and classNames', () => {
    render(
      <Gantt
        {...baseProps}
        tasks={makeTasks()}
        renderBar={({ task, start }) => <b>{`${task.id}@${start.toFormat('HH')}`}</b>}
        renderLabel={({ task, isGroup }) => <i>{`${isGroup ? 'G:' : ''}${task.id}`}</i>}
        renderHeaderCell={(tick, tier) => (tier === 'bottom' ? `h${tick.label}` : tick.label)}
        classNames={{ bar: 'my-bar', row: 'my-row', barGroup: 'my-group' }}
        barClassName={(task) => (task.id === 'a' ? 'special' : undefined)}
      />,
    );
    expect(screen.getByText('a@10')).toBeInTheDocument();
    expect(screen.getByText('G:g')).toBeInTheDocument();
    expect(screen.getByText('h10:00')).toBeInTheDocument();
    expect(getBar('a')).toHaveClass('my-bar', 'special');
    expect(getBar('g')).toHaveClass('my-group');
    expect(document.querySelector('[data-gantt="row"]')).toHaveClass('my-row');
  });

  it('draws the now line only inside the range', () => {
    const { rerender } = render(<Gantt {...baseProps} tasks={makeTasks()} showNow now={DAY_START + 6 * H} />);
    expect(document.querySelector('[data-gantt="now"]')).toHaveStyle({ left: '360px' });
    rerender(<Gantt {...baseProps} tasks={makeTasks()} showNow now={DAY_START + 48 * H} />);
    expect(document.querySelector('[data-gantt="now"]')).toBeNull();
  });
});

describe('expand / collapse', () => {
  it('toggles children rows from the chevron', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    fireEvent.click(toggleButton('g'));
    expect(getRowIds()).toEqual(['a', 'b', 'g', 'g1', 'g2', 'i']);
    expect(toggleButton('g')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggleButton('g'));
    expect(getRowIds()).toEqual(['a', 'b', 'g', 'i']);
  });

  it('toggles when clicking the group bar without dragging', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    dragBy(getBar('g'), 1, 1);
    expect(getRowIds()).toContain('g1');
  });

  it('toggles from the keyboard', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    fireEvent.keyDown(getBar('g'), { key: 'Enter' });
    expect(getRowIds()).toContain('g1');
    fireEvent.keyDown(getBar('g'), { key: ' ' });
    expect(getRowIds()).not.toContain('g1');
  });

  it('honours defaultExpandedIds', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} defaultExpandedIds={['i']} />);
    expect(getRowIds()).toEqual(['a', 'b', 'g', 'i', 'i1', 'i2']);
  });

  it('is controllable', () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(<Gantt {...baseProps} tasks={makeTasks()} expandedIds={[]} onExpandedChange={onExpandedChange} />);
    fireEvent.click(toggleButton('g'));
    expect(onExpandedChange).toHaveBeenCalledWith(['g']);
    expect(getRowIds()).toEqual(['a', 'b', 'g', 'i']); // parent did not update yet
    rerender(<Gantt {...baseProps} tasks={makeTasks()} expandedIds={['g']} onExpandedChange={onExpandedChange} />);
    expect(getRowIds()).toContain('g1');
  });
});

describe('drag: move', () => {
  it('emits a move with the new dates and keeps the duration', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 90, 0);
    expect(onTaskChange).toHaveBeenCalledTimes(1);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.id).toBe('a');
    expect(change.reason).toBe('move');
    expect(iso(change.start)).toBe(iso(at(11, 30)));
    expect(iso(change.end)).toBe(iso(at(13, 30)));
    expect(iso(change.previousStart)).toBe(iso(at(10)));
    expect(change.position).toBeUndefined();
    expect(change.previousPosition).toEqual({ parentId: null, index: 0 });
  });

  it('moves backwards', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), -30, 0);
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(9, 30)));
  });

  it('snaps to the hour grid', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="hour" tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 40, 0);
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(11)));
  });

  it('snaps to the minute grid', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="minute" tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 7.4, 0);
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(10, 7)));
  });

  it('snaps to the edge of a neighbouring task', () => {
    const onTaskChange = vi.fn();
    // Task B starts at 14:00. Move A (2h) so that its end lands at 13:57: within 8px (8 min).
    render(<Gantt {...baseProps} snap="hour" snapToTasks snapThresholdPx={8} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 117, 0);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(iso(change.end)).toBe(iso(at(14)));
    expect(iso(change.start)).toBe(iso(at(12)));
  });

  it('does not snap to its own edges', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="none" snapToTasks snapThresholdPx={8} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    // A 10:00-12:00 moved by 12 min: its own former edges are the closest ones but must be ignored.
    dragBy(getBar('a'), 12, 0);
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(10, 12)));
  });

  it('shows a live preview and a ghost while dragging', () => {
    const onDragPreview = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onDragPreview={onDragPreview} />);
    const bar = getBar('a');
    dragBy(bar, 60, 0, { hold: true });
    expect(bar.dataset.dragging).toBe('true');
    expect(bar.style.left).toBe(`${11 * 60}px`);
    expect(document.querySelector('[data-gantt="ghost"]')).toHaveStyle({ left: '600px', width: '120px' });
    expect(onDragPreview).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a', reason: 'move', snappedTo: 'none' }));
    expect(iso(onDragPreview.mock.lastCall![0].start)).toBe(iso(at(11)));
    release(bar, 160, 100);
    expect(onDragPreview).toHaveBeenLastCalledWith(null);
    expect(document.querySelector('[data-gantt="ghost"]')).toBeNull();
  });

  it('ignores tiny movements (click), and emits nothing', () => {
    const onTaskChange = vi.fn();
    const onTaskClick = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} onTaskClick={onTaskClick} />);
    dragBy(getBar('a'), 2, 0);
    expect(onTaskChange).not.toHaveBeenCalled();
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), expect.anything());
  });

  it('does not emit when nothing changed', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 10, 0, { hold: true });
    release(getBar('a'), 100, 100); // back to the origin
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('cancels with Escape', () => {
    const onTaskChange = vi.fn();
    const onDragPreview = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} onDragPreview={onDragPreview} />);
    const bar = getBar('a');
    dragBy(bar, 60, 0, { hold: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(bar.dataset.dragging).toBeUndefined();
    expect(onDragPreview).toHaveBeenLastCalledWith(null);
    release(bar, 160, 100);
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('cancels on pointercancel', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, 60, 0, { hold: true });
    fireEvent.pointerCancel(bar, { pointerId: 1 });
    expect(bar.dataset.dragging).toBeUndefined();
    release(bar, 160, 100);
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('ignores non primary buttons and other pointers', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    fireEvent.pointerDown(bar, { pointerId: 1, button: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(bar, { pointerId: 1, button: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(bar, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(bar, { pointerId: 2, button: 0, clientX: 200, clientY: 100 });
    expect(onTaskChange).not.toHaveBeenCalled();
    release(bar);
  });

  it('is disabled in readOnly mode', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} readOnly tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    expect(bar).toHaveAttribute('tabindex', '-1');
    expect(bar.querySelector('[data-handle]')).toBeNull();
    dragBy(bar, 60, 0);
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('accounts for container scrolling during the drag', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    dragBy(bar, 30, 0, { hold: true });
    scroller.scrollLeft = 30;
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 130, clientY: 100 });
    release(bar, 130, 100);
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(11)));
  });

  it('a rejected change (false) leaves the component usable', () => {
    const onTaskChange = vi.fn(() => false);
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 60, 0);
    expect(onTaskChange).toHaveBeenCalledTimes(1);
    expect(getBar('a').style.left).toBe('600px');
    dragBy(getBar('a'), 60, 0);
    expect(onTaskChange).toHaveBeenCalledTimes(2);
  });

  it('moves a child bar of an inline group', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('i2'), 30, 0);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.id).toBe('i2');
    expect(iso(change.start)).toBe(iso(at(3, 30)));
    expect(change.previousPosition).toEqual({ parentId: 'i', index: 1 });
  });
});

describe('drag: resize', () => {
  it('resizes the end from the right handle', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, 45, 0, { target: handle(bar, 'end') });
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.reason).toBe('resize-end');
    expect(iso(change.start)).toBe(iso(at(10)));
    expect(iso(change.end)).toBe(iso(at(12, 45)));
  });

  it('resizes the start from the left handle', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, -30, 0, { target: handle(bar, 'start') });
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.reason).toBe('resize-start');
    expect(iso(change.start)).toBe(iso(at(9, 30)));
    expect(iso(change.end)).toBe(iso(at(12)));
  });

  it('never shrinks below the minimum duration', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} minDuration={15 * MIN} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, -500, 0, { target: handle(bar, 'end') });
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(iso(change.end)).toBe(iso(at(10, 15)));
  });

  it('defaults the minimum duration to the snap unit', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="hour" tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, -500, 0, { target: handle(bar, 'end') });
    expect(iso(onTaskChange.mock.calls[0]![0].end)).toBe(iso(at(11)));
  });

  it('never changes row while resizing', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    const bar = getBar('a');
    dragBy(bar, 30, 100, { target: handle(bar, 'end') });
    expect(onTaskChange.mock.calls[0]![0].position).toBeUndefined();
  });

  it('handles are hidden with allowResize=false and the handle press moves instead', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} allowResize={false} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    expect(getBar('a').querySelector('[data-handle]')).toBeNull();
    dragBy(getBar('a'), 30, 0);
    expect(onTaskChange.mock.calls[0]![0].reason).toBe('move');
  });
});

describe('drag: vertical', () => {
  it('reports the target position when dropped on another row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 0, 36 * 2);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.position).toEqual({ parentId: null, index: 2 });
    expect(change.previousPosition).toEqual({ parentId: null, index: 0 });
    expect(iso(change.start)).toBe(iso(at(10)));
  });

  it('highlights the drop target row and translates the bar during the drag', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    const bar = getBar('a');
    dragBy(bar, 0, 36, { hold: true });
    expect(bar.style.transform).toBe('translateY(36px)');
    expect(document.querySelector('[data-gantt="row"][data-task-id="b"]')).toHaveAttribute('data-drop-target', 'true');
    release(bar, 100, 136);
  });

  it('nests a task into an expanded group when dropped on a child row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} defaultExpandedIds={['g']} onTaskChange={onTaskChange} />);
    // rows: a b g g1 g2 i. Drop A on g2 (index 4)
    dragBy(getBar('a'), 0, 36 * 4);
    expect(onTaskChange.mock.calls[0]![0].position).toEqual({ parentId: 'g', index: 1 });
  });

  it('un-nests a child dropped on a root row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} defaultExpandedIds={['g']} onTaskChange={onTaskChange} />);
    // rows: a b g g1 g2 i. g1 is row 3, drop on row 0.
    dragBy(getBar('g1'), 0, -36 * 3);
    const change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.position).toEqual({ parentId: null, index: 0 });
    expect(change.previousPosition).toEqual({ parentId: 'g', index: 0 });
  });

  it('a group can not be nested: dropping it on a child row targets the parent slot', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} defaultExpandedIds={['g', 'i']} onTaskChange={onTaskChange} />);
    // rows: a b g g1 g2 i i1 i2. Drag group g (row 2) onto i2 (row 7) => slot of i (index 3).
    dragBy(getBar('g'), 0, 36 * 5);
    expect(onTaskChange.mock.calls[0]![0].position).toEqual({ parentId: null, index: 3 });
    // Dropping g on its own child row resolves to its own slot: nothing to emit.
    onTaskChange.mockClear();
    dragBy(getBar('g'), 0, 36);
    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it('clamps to the last row', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 0, 5000);
    expect(onTaskChange.mock.calls[0]![0].position).toEqual({ parentId: null, index: 3 });
  });

  it('is disabled with allowVerticalMove=false', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} allowVerticalMove={false} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    dragBy(getBar('a'), 30, 200);
    expect(onTaskChange.mock.calls[0]![0].position).toBeUndefined();
  });

  it('works end to end with applyTaskChange (controlled parent)', () => {
    function Harness() {
      const [tasks, setTasks] = useState<GanttTask[]>(makeTasks());
      return <Gantt {...baseProps} tasks={tasks} onTaskChange={(change) => setTasks((prev) => applyTaskChange(prev, change))} />;
    }
    render(<Harness />);
    dragBy(getBar('a'), 60, 36 * 3);
    expect(getRowIds()).toEqual(['b', 'g', 'i', 'a']);
    expect(getBar('a').style.left).toBe(`${11 * 60}px`);
  });
});

describe('keyboard', () => {
  it('moves by one snap unit with the arrows', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="hour" tasks={makeTasks()} onTaskChange={onTaskChange} />);
    fireEvent.keyDown(getBar('a'), { key: 'ArrowRight' });
    let change: TaskChange = onTaskChange.mock.calls[0]![0];
    expect(change.reason).toBe('keyboard');
    expect(iso(change.start)).toBe(iso(at(11)));
    expect(iso(change.end)).toBe(iso(at(13)));
    fireEvent.keyDown(getBar('a'), { key: 'ArrowLeft' });
    change = onTaskChange.mock.calls[1]![0];
    expect(iso(change.start)).toBe(iso(at(9)));
  });

  it('resizes with shift / alt', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} snap="hour" tasks={makeTasks()} onTaskChange={onTaskChange} />);
    fireEvent.keyDown(getBar('a'), { key: 'ArrowRight', shiftKey: true });
    expect(iso(onTaskChange.mock.calls[0]![0].end)).toBe(iso(at(13)));
    expect(iso(onTaskChange.mock.calls[0]![0].start)).toBe(iso(at(10)));
    fireEvent.keyDown(getBar('a'), { key: 'ArrowRight', altKey: true });
    expect(iso(onTaskChange.mock.calls[1]![0].start)).toBe(iso(at(11)));
    expect(iso(onTaskChange.mock.calls[1]![0].end)).toBe(iso(at(12)));
  });

  it('moves vertically with up / down', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onTaskChange={onTaskChange} />);
    fireEvent.keyDown(getBar('a'), { key: 'ArrowDown' });
    expect(onTaskChange.mock.calls[0]![0].position).toEqual({ parentId: null, index: 1 });
    fireEvent.keyDown(getBar('a'), { key: 'ArrowUp' });
    expect(onTaskChange).toHaveBeenCalledTimes(1); // already the first row
  });

  it('does nothing in readOnly mode', () => {
    const onTaskChange = vi.fn();
    render(<Gantt {...baseProps} readOnly tasks={makeTasks()} onTaskChange={onTaskChange} />);
    fireEvent.keyDown(getBar('a'), { key: 'ArrowRight' });
    expect(onTaskChange).not.toHaveBeenCalled();
  });
});

describe('draft mode', () => {
  it('collects changes instead of emitting them, then commits all at once', () => {
    const onTaskChange = vi.fn();
    const onDraftChange = vi.fn();
    const onDraftCommit = vi.fn();
    render(
      <Gantt
        {...baseProps}
        draft
        tasks={makeTasks()}
        onTaskChange={onTaskChange}
        onDraftChange={onDraftChange}
        onDraftCommit={onDraftCommit}
        labels={{ commit: 'Valider', discard: 'Annuler', pendingChanges: (n) => `${n} modif` }}
      />,
    );
    dragBy(getBar('a'), 60, 0);
    dragBy(getBar('b'), -60, 0);
    expect(onTaskChange).not.toHaveBeenCalled();
    expect(onDraftChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' })]);
    // Preview: bar moved, ghost at the original place, pending marker.
    expect(getBar('a').style.left).toBe('660px');
    expect(getBar('a').dataset.pending).toBe('true');
    expect(document.querySelectorAll('[data-gantt="ghost"]')).toHaveLength(2);
    expect(screen.getByText('2 modif')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Valider'));
    expect(onDraftCommit).toHaveBeenCalledTimes(1);
    const changes: TaskChange[] = onDraftCommit.mock.calls[0]![0];
    expect(changes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(iso(changes[0]!.start)).toBe(iso(at(11)));
    expect(iso(changes[1]!.start)).toBe(iso(at(13)));
    expect(screen.queryByText('Valider')).toBeNull();
    expect(onDraftChange).toHaveBeenLastCalledWith([]);
  });

  it('merges successive edits of the same task, keeping the original previous values', () => {
    const onDraftCommit = vi.fn();
    render(<Gantt {...baseProps} draft tasks={makeTasks()} onDraftCommit={onDraftCommit} />);
    dragBy(getBar('a'), 60, 0);
    dragBy(getBar('a'), 60, 0);
    fireEvent.click(screen.getByText('Apply'));
    const changes: TaskChange[] = onDraftCommit.mock.calls[0]![0];
    expect(changes).toHaveLength(1);
    expect(iso(changes[0]!.start)).toBe(iso(at(12)));
    expect(iso(changes[0]!.previousStart)).toBe(iso(at(10)));
  });

  it('discards everything', () => {
    const onDraftCommit = vi.fn();
    render(<Gantt {...baseProps} draft tasks={makeTasks()} onDraftCommit={onDraftCommit} />);
    dragBy(getBar('a'), 60, 0);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDraftCommit).not.toHaveBeenCalled();
    expect(getBar('a').style.left).toBe('600px');
    expect(screen.queryByText('Discard')).toBeNull();
  });

  it('previews vertical moves and replays them in order', () => {
    const onDraftCommit = vi.fn();
    render(<Gantt {...baseProps} draft tasks={makeTasks()} onDraftCommit={onDraftCommit} />);
    dragBy(getBar('a'), 0, 36 * 3);
    expect(getRowIds()).toEqual(['b', 'g', 'i', 'a']);
    dragBy(getBar('b'), 0, 36);
    expect(getRowIds()).toEqual(['g', 'b', 'i', 'a']);
    fireEvent.click(screen.getByText('Apply'));
    const changes: TaskChange[] = onDraftCommit.mock.calls[0]![0];
    expect(changes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(changes[0]!.position).toEqual({ parentId: null, index: 3 });
    expect(changes[1]!.position).toEqual({ parentId: null, index: 1 });
    let tasks = makeTasks();
    for (const change of changes) tasks = applyTaskChange(tasks, change);
    expect(tasks.map((t) => t.id)).toEqual(['g', 'b', 'i', 'a']);
  });

  it('exposes commit / discard through the ref and a custom toolbar', () => {
    const ref = createRef<GanttHandle>();
    const onDraftCommit = vi.fn(() => false);
    render(
      <Gantt
        {...baseProps}
        ref={ref}
        draft
        tasks={makeTasks()}
        onDraftCommit={onDraftCommit}
        renderDraftToolbar={({ changes }) => <div data-testid="custom">{changes.length}</div>}
      />,
    );
    dragBy(getBar('a'), 60, 0);
    expect(screen.getByTestId('custom')).toHaveTextContent('1');
    expect(ref.current!.getPendingChanges()).toHaveLength(1);
    act(() => ref.current!.commitDraft());
    expect(onDraftCommit).toHaveBeenCalledTimes(1);
    // commit returned false: changes are kept
    expect(ref.current!.getPendingChanges()).toHaveLength(1);
    act(() => ref.current!.discardDraft());
    expect(ref.current!.getPendingChanges()).toHaveLength(0);
  });

  it('drops pending changes when leaving draft mode', () => {
    const { rerender } = render(<Gantt {...baseProps} draft tasks={makeTasks()} />);
    dragBy(getBar('a'), 60, 0);
    expect(getBar('a').style.left).toBe('660px');
    rerender(<Gantt {...baseProps} draft={false} tasks={makeTasks()} />);
    expect(getBar('a').style.left).toBe('600px');
  });
});

describe('virtualization', () => {
  function bigTasks(count: number): GanttTask[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `t${i}`,
      label: `Task ${i}`,
      start: DAY_START + 2 * H,
      end: DAY_START + 4 * H,
    }));
  }

  it('renders only the rows around the viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(408); // 48 header + 10 rows
    render(<Gantt {...baseProps} tasks={bigTasks(5000)} overscan={2} />);
    const ids = getRowIds();
    expect(ids[0]).toBe('t0');
    expect(ids.length).toBeLessThanOrEqual(14);
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    expect(scroller.firstElementChild).toHaveStyle({ height: `${48 + 5000 * 36}px` });
  });

  it('re-renders rows on scroll', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(408);
    render(<Gantt {...baseProps} tasks={bigTasks(5000)} overscan={2} />);
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    scroller.scrollTop = 36 * 1000;
    fireEvent.scroll(scroller);
    const ids = getRowIds();
    expect(ids[0]).toBe('t998');
    expect(ids).toContain('t1000');
    expect(ids).not.toContain('t0');
  });

  it('scrollToTask scrolls the row into view', () => {
    const ref = createRef<GanttHandle>();
    render(<Gantt {...baseProps} ref={ref} tasks={bigTasks(500)} />);
    act(() => ref.current!.scrollToTask('t200'));
    expect(ref.current!.getScrollElement()!.scrollTop).toBe(200 * 36);
  });
});

describe('zoom', () => {
  it('changes the zoom level with ctrl + wheel', () => {
    const onZoomChange = vi.fn();
    render(<Gantt {...baseProps} zoom="day" tasks={makeTasks()} onZoomChange={onZoomChange} />);
    const scroller = document.querySelector<HTMLElement>('[data-gantt="scroller"]')!;
    fireEvent.wheel(scroller, { deltaY: 100, ctrlKey: true });
    expect(onZoomChange).toHaveBeenLastCalledWith('week');
    fireEvent.wheel(scroller, { deltaY: -100, ctrlKey: true });
    expect(onZoomChange).toHaveBeenLastCalledWith('hour');
    fireEvent.wheel(scroller, { deltaY: 100 });
    expect(onZoomChange).toHaveBeenCalledTimes(2);
  });

  it('does not go past the extremes', () => {
    const onZoomChange = vi.fn();
    render(<Gantt {...baseProps} zoom="month" tasks={makeTasks()} onZoomChange={onZoomChange} />);
    fireEvent.wheel(document.querySelector('[data-gantt="scroller"]')!, { deltaY: 100, ctrlKey: true });
    expect(onZoomChange).not.toHaveBeenCalled();
  });
});
