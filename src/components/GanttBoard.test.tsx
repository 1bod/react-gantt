import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GanttRow } from '../core/rows';
import { baseProps, DAY_START, dragBy, getBar, getResourceRow, H, makeResourceRows, makeResourceTasks, makeTasks, release, resourceProps } from '../test-utils';
import type { ClosedRange, GanttLink, GanttResourceRow } from '../types';
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

describe('selection', () => {
  const click = (bar: HTMLElement, init: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {}) => {
    fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 100, clientY: 100, ...init });
    fireEvent.pointerUp(bar, { pointerId: 1, button: 0, clientX: 100, clientY: 100, ...init });
  };

  function Controlled(props: { initial?: string[]; onChange?: (ids: string[]) => void; highlightedIds?: string[] }) {
    const [ids, setIds] = useState<string[]>(props.initial ?? []);
    return (
      <Gantt
        {...resourceProps}
        rows={makeResourceRows()}
        tasks={makeResourceTasks()}
        selectedIds={ids}
        highlightedIds={props.highlightedIds}
        onSelectionChange={(next) => {
          props.onChange?.(next);
          setIds(next);
        }}
        renderBar={({ task, isSelected, isHighlighted }) => `${task.id}${isSelected ? '*' : ''}${isHighlighted ? '+' : ''}`}
        renderRowLabel={({ row, hasSelection }) => `${row.id}${hasSelection ? '*' : ''}`}
      />
    );
  }

  it('a click selects one bar, shift / cmd / ctrl + click toggles', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    click(getBar('a'));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    expect(getBar('a')).toHaveAttribute('data-selected', 'true');
    expect(getBar('a')).toHaveStyle({ zIndex: '3' });
    expect(screen.getByText('a*')).toBeInTheDocument();
    click(getBar('c'), { shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
    click(getBar('d'), { metaKey: true });
    click(getBar('a'), { ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith(['c', 'd']);
    expect(getBar('a')).not.toHaveAttribute('data-selected');
    click(getBar('b'));
    expect(onChange).toHaveBeenLastCalledWith(['b']);
    // Clicking the selected bar again changes nothing.
    onChange.mockClear();
    click(getBar('b'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks the rows holding a selected bar', () => {
    render(<Controlled initial={['b']} />);
    expect(getResourceRow('m1')).toHaveAttribute('data-has-selection', 'true');
    expect(getResourceRow('m2')).not.toHaveAttribute('data-has-selection');
    expect(screen.getByText('m1*')).toBeInTheDocument();
  });

  it('Escape clears, unless the focus is outside the gantt or a drag is running', () => {
    const onChange = vi.fn();
    render(
      <>
        <input aria-label="elsewhere" />
        <Controlled initial={['a']} onChange={onChange} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('elsewhere'), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    dragBy(getBar('c'), 30, 0, { hold: true });
    fireEvent.keyDown(window, { key: 'Escape' }); // cancels the drag only
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(getBar('a'), { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(getBar('a')).not.toHaveAttribute('data-selected');
  });

  it('Escape from the document body clears', () => {
    const onChange = vi.fn();
    render(<Controlled initial={['a']} onChange={onChange} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('a click on the empty grid clears, a click in the sidebar does not', () => {
    const onChange = vi.fn();
    render(<Controlled initial={['a']} onChange={onChange} />);
    fireEvent.click(screen.getByText('m2'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(getBar('a'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(getResourceRow('m2').querySelector('[data-gantt="timeline-cell"]')!);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('Enter / Space select from the keyboard', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.keyDown(getBar('c'), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['c']);
    fireEvent.keyDown(getBar('d'), { key: ' ', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(['c', 'd']);
  });

  it('works uncontrolled with onSelectionChange only', () => {
    const onSelectionChange = vi.fn();
    render(<Gantt {...baseProps} tasks={makeTasks()} onSelectionChange={onSelectionChange} />);
    click(getBar('a'));
    expect(getBar('a')).toHaveAttribute('data-selected', 'true');
    expect(document.querySelector('[data-gantt="row"][data-task-id="a"]')).toHaveAttribute('data-has-selection', 'true');
    // Groups still toggle on click, and get selected too.
    click(getBar('g'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['g']);
    expect(document.querySelector('[data-gantt="row"][data-task-id="g1"]')).not.toBeNull();
  });

  it('is disabled without selectedIds / onSelectionChange', () => {
    render(<Gantt {...baseProps} tasks={makeTasks()} />);
    click(getBar('a'));
    expect(getBar('a')).not.toHaveAttribute('data-selected');
    fireEvent.keyDown(getBar('a'), { key: 'Enter' });
    expect(getBar('a')).not.toHaveAttribute('data-selected');
  });

  it('highlights bars', () => {
    render(<Controlled highlightedIds={['c', 'd']} />);
    expect(getBar('c')).toHaveAttribute('data-highlighted', 'true');
    expect(getBar('a')).not.toHaveAttribute('data-highlighted');
    expect(screen.getByText('d+')).toBeInTheDocument();
  });

  it('accepts slot classes', () => {
    render(
      <Gantt
        {...baseProps}
        tasks={makeTasks()}
        selectedIds={['a']}
        highlightedIds={['b']}
        classNames={{ barSelected: 'is-selected', barHighlighted: 'is-highlighted' }}
      />,
    );
    expect(getBar('a')).toHaveClass('is-selected');
    expect(getBar('b')).toHaveClass('is-highlighted');
  });
});

describe('links', () => {
  const links: GanttLink[] = [
    { id: 'ac', from: 'a', to: 'c' },
    { id: 'cd', from: 'c', to: 'd', type: 'start_start' },
    { id: 'bx', from: 'b', to: 'missing' },
  ];
  const drawnIds = () => Array.from(document.querySelectorAll<SVGGElement>('[data-gantt="link"]')).map((g) => g.dataset.linkId);
  const pathOf = (id: string) => document.querySelector(`[data-link-id="${id}"] path`)!.getAttribute('d');

  it('draws only the links of the selected bars by default', () => {
    const { rerender } = render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} links={links} selectedIds={[]} />);
    expect(document.querySelector('[data-gantt="links"]')).toBeNull();
    rerender(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} links={links} selectedIds={['a']} />);
    expect(drawnIds()).toEqual(['ac']);
    rerender(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} links={links} selectedIds={['c']} />);
    expect(drawnIds()).toEqual(['ac', 'cd']);
  });

  it('draws elbows between the bars, in body coordinates', () => {
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} links={links} showLinks="all" classNames={{ link: 'my-link' }} />);
    const svg = document.querySelector<SVGSVGElement>('[data-gantt="links"]')!;
    expect(svg).toHaveStyle({ left: '200px', top: '48px', width: `${24 * 60}px`, height: '108px' });
    // A: 10:00-12:00 on m1 lane 0 (y 4-24). C: 14:00-15:00 on m2 (y 56-76).
    expect(pathOf('ac')).toBe('M720.5 14.5 L728.5 14.5 L728.5 66.5 L840.5 66.5');
    // D: 09:00-10:00 on m3 (y 84-104), start to start.
    expect(pathOf('cd')).toBe('M840.5 66.5 L532.5 66.5 L532.5 94.5 L540.5 94.5');
    // A link to a bar that is not rendered is skipped.
    expect(drawnIds()).toEqual(['ac', 'cd']);
    expect(document.querySelector('[data-link-id="cd"]')).toHaveAttribute('data-type', 'start_start');
    expect(document.querySelector('[data-link-id="ac"]')).toHaveClass('gantt-link', 'my-link');
  });

  it('follows the dragged bar', () => {
    render(<Gantt {...resourceProps} rows={makeResourceRows()} tasks={makeResourceTasks()} links={links} showLinks="all" />);
    const bar = getBar('a');
    dragBy(bar, 60, 50, { hold: true }); // onto m2, one hour later
    expect(pathOf('ac')).toBe('M780.5 66.5 L788.5 66.5 L840.5 66.5'); // same row now: straight
    release(bar, 160, 150);
  });

  it('none hides every link, and task mode bars work too', () => {
    const { rerender } = render(<Gantt {...baseProps} tasks={makeTasks()} links={[{ id: 'ab', from: 'a', to: 'b' }]} showLinks="none" />);
    expect(document.querySelector('[data-gantt="links"]')).toBeNull();
    rerender(<Gantt {...baseProps} tasks={makeTasks()} links={[{ id: 'ab', from: 'a', to: 'b' }]} showLinks="all" />);
    // Rows of 36px, bars at 15% / 70%: centres at 18 and 54.
    expect(pathOf('ab')).toBe('M720.5 18.5 L728.5 18.5 L728.5 54.5 L840.5 54.5');
  });

  it('skips links whose rows are virtualized away', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48 + 100);
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, label: `R${i}` }));
    const tasks = rows.map((row, i) => ({ id: `t${i}`, label: `T${i}`, start: DAY_START + H, end: DAY_START + 2 * H, rowId: row.id }));
    render(
      <Gantt
        {...resourceProps}
        rows={rows}
        tasks={tasks}
        overscan={1}
        showLinks="all"
        links={[
          { id: 'near', from: 't0', to: 't1' },
          { id: 'far', from: 't0', to: 't90' },
        ]}
      />,
    );
    expect(drawnIds()).toEqual(['near']);
  });
});
