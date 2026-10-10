import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react';
import { applyTaskChanges } from '../core/apply';
import { computeKeyboardStep } from '../core/drag';
import { buildHeaderTicks } from '../core/header';
import { buildResourceLayout, type ResourceBar, type ResourceRowLayout } from '../core/resources';
import { findRowIndex, findTask, flattenRows, getDropPosition, isGroup, samePosition, type GanttRow } from '../core/rows';
import { snapUnitMs } from '../core/snap';
import { clamp, computeRange, createTimeScale, MINUTE, msToPx, scaleWidth, toDateTime, toMs } from '../core/time';
import { getVisibleRange, getVisibleRangeByOffsets } from '../core/virtual';
import { useControllableSet } from '../hooks/useControllableSet';
import { useDrag, type DragSession } from '../hooks/useDrag';
import type { DragResult } from '../core/drag';
import { useScrollViewport } from '../hooks/useScrollViewport';
import type { GanttHandle, GanttLabels, GanttProps } from '../props';
import type { ChangeReason, DragPreview, GanttResourceRow, GanttTask, TaskChange, TaskPosition, ZoomLevel } from '../types';
import { DraftToolbar } from './DraftToolbar';
import { TaskBar } from './TaskBar';
import { TimelineHeader, visibleTicks } from './TimelineHeader';

const DEFAULT_COLUMN_WIDTH: Record<ZoomLevel, number> = { hour: 60, day: 40, week: 140, month: 160 };
const ZOOM_ORDER: ZoomLevel[] = ['hour', 'day', 'week', 'month'];

const DEFAULT_LABELS: GanttLabels = {
  commit: 'Apply',
  discard: 'Discard',
  pendingChanges: (n) => `${n} pending change${n > 1 ? 's' : ''}`,
  expand: 'Expand',
  collapse: 'Collapse',
  bar: (task, start, end) =>
    `${typeof task.label === 'string' ? task.label : task.id}: ${start.toLocaleString({ dateStyle: 'short', timeStyle: 'short' })} – ${end.toLocaleString({ dateStyle: 'short', timeStyle: 'short' })}`,
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

interface Interval {
  start: number;
  end: number;
}

function collectIntervals(tasks: readonly GanttTask[]): Map<string, Interval> {
  const map = new Map<string, Interval>();
  const visit = (task: GanttTask) => {
    map.set(task.id, { start: toMs(task.start), end: toMs(task.end) });
    task.children?.forEach(visit);
  };
  tasks.forEach(visit);
  return map;
}

/** A bar to draw on a row: task mode bars always sit on lane 0. */
interface RowBar {
  task: GanttTask;
  parent: GanttTask | null;
  lane: number;
}

/** Leaf (or child) row describing a task, given as `row` to the render props in resource mode. */
function taskRowOf(bar: ResourceBar): GanttRow {
  return {
    key: bar.task.id,
    task: bar.task,
    parent: bar.parent,
    depth: bar.parent ? 1 : 0,
    kind: bar.parent ? 'child' : isGroup(bar.task) ? 'group' : 'leaf',
    mode: null,
    expanded: false,
    bars: [{ task: bar.task, parent: bar.parent }],
    position: bar.position,
  };
}

function GanttInner<TData, TRowData>(props: GanttProps<TData, TRowData>, ref: React.ForwardedRef<GanttHandle>) {
  const {
    tasks,
    rows: resourceRows,
    laneHeight,
    barInset,
    zoom = 'day',
    onZoomChange,
    range,
    zone = 'local',
    locale,
    snap = 'hour',
    snapToTasks = true,
    snapThresholdPx = 8,
    minDuration,
    parentMode = 'independent',
    expandedIds,
    defaultExpandedIds,
    onExpandedChange,
    readOnly = false,
    allowVerticalMove = true,
    allowResize = true,
    onTaskChange,
    onDragPreview,
    onTaskClick,
    draft = false,
    onDraftChange,
    onDraftCommit,
    showDraftToolbar = true,
    renderDraftToolbar,
    rowHeight = 36,
    columnWidth,
    sidebarWidth = 240,
    headerHeight = 48,
    overscan = 5,
    height = 500,
    showNow = true,
    now,
    renderBar,
    renderLabel,
    renderRowLabel,
    renderHeaderCell,
    barClassName,
    barStyle,
    classNames: c = {},
    className,
    style,
    labels: labelsProp,
  } = props;

  const labels = useMemo<GanttLabels>(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp]);
  const colWidth = columnWidth ?? DEFAULT_COLUMN_WIDTH[zoom];
  const minDurationMs = minDuration ?? Math.max(snapUnitMs(snap), MINUTE);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [viewport, onScroll] = useScrollViewport(scrollerRef);
  const [expanded, toggleExpanded] = useControllableSet(expandedIds, defaultExpandedIds, onExpandedChange);

  // ----- Draft mode state -------------------------------------------------
  const [pending, setPending] = useState<Map<string, TaskChange>>(() => new Map());
  const pendingList = useMemo(() => Array.from(pending.values()), [pending]);
  useEffect(() => {
    if (!draft) setPending((prev) => (prev.size ? new Map() : prev));
  }, [draft]);
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const firstDraftRender = useRef(true);
  useEffect(() => {
    if (firstDraftRender.current) {
      firstDraftRender.current = false;
      return;
    }
    onDraftChangeRef.current?.(pendingList);
  }, [pendingList]);

  // ----- Derived model ----------------------------------------------------
  const effectiveTasks = useMemo<GanttTask<TData>[]>(
    () => (draft && pendingList.length ? applyTaskChanges(tasks, pendingList) : tasks),
    [tasks, draft, pendingList],
  );
  const laneHeightPx = laneHeight ?? rowHeight;
  const layout = useMemo(
    () => (resourceRows ? buildResourceLayout(resourceRows, effectiveTasks, rowHeight, laneHeightPx) : null),
    [resourceRows, effectiveTasks, rowHeight, laneHeightPx],
  );
  const rows = useMemo(
    () => (layout ? [] : flattenRows(effectiveTasks, expanded, parentMode)),
    [layout, effectiveTasks, expanded, parentMode],
  );
  const rowCount = layout ? layout.rows.length : rows.length;
  const rowTop = (index: number) => (layout ? layout.offsets[index]! : index * rowHeight);
  const intervals = useMemo(() => collectIntervals(effectiveTasks), [effectiveTasks]);
  const timeRange = useMemo(
    () => (range ? { startMs: toMs(range.start), endMs: toMs(range.end) } : computeRange(effectiveTasks, zoom, zone)),
    [range, effectiveTasks, zoom, zone],
  );
  const scale = useMemo(() => createTimeScale(timeRange.startMs, timeRange.endMs, zoom, colWidth), [timeRange, zoom, colWidth]);
  const timelineWidth = scaleWidth(scale);
  const tiers = useMemo(() => buildHeaderTicks(timeRange, zoom, zone, locale), [timeRange, zoom, zone, locale]);
  const totalWidth = sidebarWidth + timelineWidth;
  const bodyHeight = layout ? layout.height : rows.length * rowHeight;

  // Bar placement inside a row: 1.0 percentages, or whole pixels per lane.
  const pxBars = layout !== null || barInset !== undefined;
  const inset = barInset ?? Math.round(rowHeight * 0.15);
  const barHeightPx = Math.max(1, rowHeight - 2 * inset);
  const barTop = (lane: number) => (pxBars ? lane * laneHeightPx + inset : undefined);

  const horizontalWindow = useMemo(() => {
    if (viewport.width <= 0) return null;
    const margin = viewport.width;
    return { left: viewport.scrollLeft - sidebarWidth - margin, right: viewport.scrollLeft - sidebarWidth + viewport.width + margin };
  }, [viewport.width, viewport.scrollLeft, sidebarWidth]);

  const visible = useMemo(() => {
    const viewportHeight = Math.max(0, viewport.height - headerHeight);
    return layout
      ? getVisibleRangeByOffsets(layout.offsets, viewport.scrollTop, viewportHeight, overscan)
      : getVisibleRange(viewport.scrollTop, viewportHeight, rowHeight, rows.length, overscan);
  }, [layout, viewport.scrollTop, viewport.height, headerHeight, rowHeight, rows.length, overscan]);

  // ----- Change emission --------------------------------------------------
  const emitChange = useCallback(
    (change: TaskChange) => {
      if (draft) {
        setPending((prev) => {
          const next = new Map(prev);
          // Re-insert at the end so that changes replay in chronological order.
          next.delete(change.id);
          next.set(change.id, change);
          return next;
        });
        return;
      }
      onTaskChange?.(change);
    },
    [draft, onTaskChange],
  );

  const buildChange = useCallback(
    (
      taskId: string,
      start: number,
      end: number,
      reason: ChangeReason,
      position: TaskPosition | undefined,
      rowId?: string,
    ): TaskChange | null => {
      const current = findTask(effectiveTasks, taskId);
      if (!current) return null;
      const currentInterval = intervals.get(taskId)!;
      const previous = pending.get(taskId);
      const originalPosition = previous?.previousPosition ?? findTask(tasks, taskId)?.position ?? current.position;
      const previousStart = previous?.previousStart ?? toDateTime(currentInterval.start, zone);
      const previousEnd = previous?.previousEnd ?? toDateTime(currentInterval.end, zone);
      const datesChanged = start !== currentInterval.start || end !== currentInterval.end;
      const positionChanged = position !== undefined && !samePosition(position, current.position);
      const rowChanged = rowId !== undefined && rowId !== current.task.rowId;
      if (!datesChanged && !positionChanged && !rowChanged) return null;
      const nextPosition = positionChanged ? position : previous?.position;
      const change: TaskChange = {
        id: taskId,
        start: toDateTime(start, zone),
        end: toDateTime(end, zone),
        previousStart,
        previousEnd,
        reason,
        previousPosition: originalPosition,
      };
      if (nextPosition) change.position = nextPosition;
      if (layout) {
        const nextRowId = rowChanged ? rowId : previous?.rowId;
        if (nextRowId !== undefined) change.rowId = nextRowId;
        const previousRowId = previous ? previous.previousRowId : (findTask(tasks, taskId)?.task.rowId ?? current.task.rowId);
        if (previousRowId !== undefined) change.previousRowId = previousRowId;
      }
      return change;
    },
    [effectiveTasks, intervals, pending, tasks, zone, layout],
  );

  // ----- Drag -------------------------------------------------------------
  const edgesByTask = useMemo(() => Array.from(intervals.entries()), [intervals]);
  const getEdges = useCallback(
    (excludeId: string) => {
      const edges: number[] = [];
      for (const [id, interval] of edgesByTask) {
        if (id === excludeId) continue;
        edges.push(interval.start, interval.end);
      }
      return edges;
    },
    [edgesByTask],
  );

  /** The change a drag would produce if dropped now, or `null` if nothing would change. */
  const changeForDrag = useCallback(
    (session: DragSession, result: DragResult): TaskChange | null => {
      if (layout) {
        const rowId = result.rowIndex !== session.originRowIndex ? layout.rows[result.rowIndex]?.row.id : undefined;
        return buildChange(session.taskId, result.start, result.end, session.kind, undefined, rowId);
      }
      const found = findTask(effectiveTasks, session.taskId);
      if (!found) return null;
      let position: TaskPosition | undefined;
      if (result.rowIndex !== session.originRowIndex) {
        position = getDropPosition(rows, result.rowIndex, found.task) ?? undefined;
      }
      return buildChange(session.taskId, result.start, result.end, session.kind, position);
    },
    [layout, effectiveTasks, rows, buildChange],
  );

  const handleDrop = useCallback(
    (session: DragSession, result: DragResult) => {
      const change = changeForDrag(session, result);
      if (change) emitChange(change);
    },
    [changeForDrag, emitChange],
  );

  const handleBarClick = useCallback(
    (session: DragSession, event: ReactPointerEvent<HTMLElement>) => {
      const found = findTask(effectiveTasks, session.taskId);
      if (!found) return;
      onTaskClick?.(found.task as GanttTask<TData>, event);
      if (!layout && isGroup(found.task)) toggleExpanded(found.task.id);
    },
    [effectiveTasks, onTaskClick, toggleExpanded, layout],
  );

  const handlePreview = useCallback(
    (session: DragSession, result: DragResult | null) => {
      if (!onDragPreview) return;
      if (!result) {
        onDragPreview(null);
        return;
      }
      const found = findTask(effectiveTasks, session.taskId);
      const position =
        (!layout && result.rowIndex !== session.originRowIndex && found ? getDropPosition(rows, result.rowIndex, found.task) : null) ??
        found?.position ?? { parentId: null, index: 0 };
      const preview: DragPreview = {
        id: session.taskId,
        start: toDateTime(result.start, zone),
        end: toDateTime(result.end, zone),
        reason: session.kind,
        position,
        snappedTo: result.snappedTo,
      };
      const rowId = layout?.rows[result.rowIndex]?.row.id;
      if (rowId !== undefined) preview.rowId = rowId;
      onDragPreview(preview);
    },
    [onDragPreview, effectiveTasks, rows, zone, layout],
  );

  const { drag, getBarHandlers } = useDrag({
    enabled: !readOnly,
    scrollerRef,
    scale,
    rowCount,
    rowHeight,
    rowTops: layout?.offsets,
    snap,
    zone,
    snapToTasks,
    snapThresholdPx,
    minDurationMs,
    allowVertical: allowVerticalMove,
    allowResize,
    getInterval: (id) => intervals.get(id),
    getEdges,
    onPreview: handlePreview,
    onDrop: handleDrop,
    onClick: handleBarClick,
  });

  // ----- Keyboard ---------------------------------------------------------
  const handleBarKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, task: GanttTask, rowIndex: number) => {
      if (readOnly) return;
      const interval = intervals.get(task.id);
      if (!interval) return;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight': {
          const action = event.shiftKey ? 'resize-end' : event.altKey ? 'resize-start' : 'move';
          if (action !== 'move' && !allowResize) return;
          event.preventDefault();
          const next = computeKeyboardStep({
            action,
            direction: event.key === 'ArrowRight' ? 1 : -1,
            start: interval.start,
            end: interval.end,
            snap,
            minDurationMs,
            zone,
          });
          const change = buildChange(task.id, next.start, next.end, 'keyboard', undefined);
          if (change) emitChange(change);
          return;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!allowVerticalMove) return;
          event.preventDefault();
          const targetRow = clamp(rowIndex + (event.key === 'ArrowDown' ? 1 : -1), 0, rowCount - 1);
          if (targetRow === rowIndex) return;
          if (layout) {
            const change = buildChange(task.id, interval.start, interval.end, 'keyboard', undefined, layout.rows[targetRow]!.row.id);
            if (change) emitChange(change);
            return;
          }
          const position = getDropPosition(rows, targetRow, task);
          if (!position) return;
          const change = buildChange(task.id, interval.start, interval.end, 'keyboard', position);
          if (change) emitChange(change);
          return;
        }
        case 'Enter':
        case ' ': {
          if (!layout && isGroup(task)) {
            event.preventDefault();
            toggleExpanded(task.id);
          }
          return;
        }
        default:
          return;
      }
    },
    [readOnly, intervals, allowResize, allowVerticalMove, snap, minDurationMs, zone, rows, rowCount, layout, buildChange, emitChange, toggleExpanded],
  );

  // ----- Zoom -------------------------------------------------------------
  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!onZoomChange || !event.ctrlKey) return;
      event.preventDefault();
      const index = ZOOM_ORDER.indexOf(zoom);
      const nextIndex = clamp(index + (event.deltaY > 0 ? 1 : -1), 0, ZOOM_ORDER.length - 1);
      if (nextIndex !== index) onZoomChange(ZOOM_ORDER[nextIndex]!);
    },
    [onZoomChange, zoom],
  );

  // ----- Draft actions ----------------------------------------------------
  const commitDraft = useCallback(() => {
    if (!pendingList.length) return;
    const keep = onDraftCommit?.(pendingList) === false;
    if (!keep) setPending(new Map());
  }, [pendingList, onDraftCommit]);
  const discardDraft = useCallback(() => setPending((prev) => (prev.size ? new Map() : prev)), []);

  useImperativeHandle(
    ref,
    () => ({
      commitDraft,
      discardDraft,
      getPendingChanges: () => Array.from(pending.values()),
      scrollToTask: (id) => {
        const el = scrollerRef.current;
        let index = layout ? (layout.barsById.get(id)?.rowIndex ?? -1) : findRowIndex(rows, id);
        if (index < 0 && !layout) {
          // Child drawn inline on its parent's row, or collapsed: go to the parent row.
          const parentId = findTask(effectiveTasks, id)?.position.parentId;
          if (parentId) index = findRowIndex(rows, parentId);
        }
        if (!el || index < 0) return;
        el.scrollTo({ top: rowTop(index) });
        const interval = intervals.get(id);
        if (interval) el.scrollTo({ left: Math.max(0, msToPx(scale, interval.start) - 40) });
      },
      scrollToTime: (date) => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTo({ left: Math.max(0, msToPx(scale, toMs(date)) - 40) });
      },
      getScrollElement: () => scrollerRef.current,
    }),
    [commitDraft, discardDraft, pending, rows, rowHeight, intervals, scale, effectiveTasks, layout],
  );

  // ----- Rendering --------------------------------------------------------
  const nowMs = now !== undefined ? toMs(now) : Date.now();
  const nowPx = msToPx(scale, nowMs);
  const gridLines = useMemo(() => {
    const majors = new Set(tiers.top.map((t) => t.startMs));
    return visibleTicks(tiers.bottom, scale, horizontalWindow).map((tick) => ({
      key: tick.key,
      left: msToPx(scale, tick.startMs),
      major: majors.has(tick.startMs),
    }));
  }, [tiers, scale, horizontalWindow]);

  const dragTaskId = drag?.session.taskId ?? null;
  const dropRowIndex = drag && drag.result.rowIndex !== drag.session.originRowIndex ? drag.result.rowIndex : -1;

  /** Vertical offset of the dragged bar: onto lane 0 of the target row in resource mode. */
  const dragTranslateY = (rowIndex: number, lane: number): number => {
    if (!drag) return 0;
    const target = drag.result.rowIndex;
    if (!layout) return (target - rowIndex) * rowHeight;
    if (target === rowIndex) return 0;
    return rowTop(target) - (rowTop(rowIndex) + lane * laneHeightPx);
  };

  // Resource mode, draft: ghosts at the original place of pending tasks, by original row.
  const pendingGhosts = useMemo(() => {
    const byRow = new Map<number, Array<{ id: string; start: number; end: number; lane: number }>>();
    if (!layout || !draft) return byRow;
    for (const change of pendingList) {
      const rowIndex = change.previousRowId === undefined ? undefined : layout.rowIndexById.get(change.previousRowId);
      if (rowIndex === undefined) continue;
      const located = layout.barsById.get(change.id);
      const lane = located && located.rowIndex === rowIndex ? located.lane : 0;
      const list = byRow.get(rowIndex) ?? [];
      list.push({ id: change.id, start: change.previousStart.toMillis(), end: change.previousEnd.toMillis(), lane });
      byRow.set(rowIndex, list);
    }
    return byRow;
  }, [layout, draft, pendingList]);

  const rootStyle: CSSProperties & Record<string, string | number> = {
    height,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth}px`,
    ...(layout ? { '--gantt-lane-height': `${laneHeightPx}px` } : {}),
    ...style,
  };

  const renderGhost = (key: string, start: number, end: number, lane: number) => {
    const top = barTop(lane);
    return (
      <div
        key={key}
        data-gantt="ghost"
        aria-hidden
        className={cx('gantt-ghost pointer-events-none absolute z-[2] rounded-md', c.ghost)}
        style={{
          left: msToPx(scale, start),
          width: Math.max(2, msToPx(scale, end) - msToPx(scale, start)),
          top: top ?? '15%',
          height: top === undefined ? '70%' : barHeightPx,
        }}
      />
    );
  };

  const renderBarItem = (bar: RowBar, rowIndex: number, taskRow: GanttRow, resource: GanttResourceRow | null) => {
    const interval = intervals.get(bar.task.id);
    if (!interval) return null;
    const isDragging = dragTaskId === bar.task.id && drag !== null && drag.session.originRowIndex === rowIndex;
    const start = isDragging ? drag.result.start : interval.start;
    const end = isDragging ? drag.result.end : interval.end;
    const left = msToPx(scale, start);
    const width = Math.max(2, msToPx(scale, end) - left);
    if (!isDragging && horizontalWindow && (left + width < horizontalWindow.left || left > horizontalWindow.right)) return null;
    const isPending = draft && pending.has(bar.task.id);
    const pendingChange = isPending && !layout ? pending.get(bar.task.id) : undefined;
    const barIsGroup = isGroup(bar.task);
    const ctx = {
      task: bar.task as GanttTask<TData>,
      parent: bar.parent as GanttTask<TData> | null,
      row: taskRow,
      resource: resource as GanttResourceRow<TRowData> | null,
      lane: bar.lane,
      start: toDateTime(start, zone),
      end: toDateTime(end, zone),
      isDragging,
      isPending,
      isGroup: barIsGroup,
    };
    const top = barTop(bar.lane);
    return (
      <span key={bar.task.id} className="contents">
        {isDragging && renderGhost('drag-ghost', drag.session.originStart, drag.session.originEnd, bar.lane)}
        {!isDragging && pendingChange && renderGhost('pending-ghost', pendingChange.previousStart.toMillis(), pendingChange.previousEnd.toMillis(), bar.lane)}
        <TaskBar
          task={bar.task}
          left={left}
          width={width}
          top={top}
          height={top === undefined ? undefined : barHeightPx}
          translateY={isDragging ? dragTranslateY(rowIndex, bar.lane) : 0}
          isDragging={isDragging}
          isPending={isPending}
          isGroup={barIsGroup}
          isChild={bar.parent !== null}
          interactive={!readOnly}
          showHandles={!readOnly && allowResize}
          ariaLabel={labels.bar(bar.task, ctx.start, ctx.end)}
          classNames={c}
          className={barClassName?.(bar.task as GanttTask<TData>)}
          style={barStyle?.(bar.task as GanttTask<TData>)}
          handlers={readOnly ? null : getBarHandlers(bar.task.id, rowIndex, layout ? rowTop(rowIndex) + bar.lane * laneHeightPx + rowHeight / 2 : undefined)}
          onKeyDown={(event) => handleBarKeyDown(event, bar.task, rowIndex)}
        >
          {renderBar ? renderBar(ctx) : bar.task.label}
        </TaskBar>
      </span>
    );
  };

  const renderRow = (row: GanttRow, rowIndex: number) => {
    const group = row.kind === 'group';
    const toggle = () => toggleExpanded(row.task.id);
    const isDropTarget = rowIndex === dropRowIndex;
    return (
      <div
        key={row.key}
        data-gantt="row"
        data-row-index={rowIndex}
        data-task-id={row.task.id}
        data-kind={row.kind}
        data-drop-target={isDropTarget || undefined}
        className={cx(
          'gantt-row absolute left-0 flex border-b border-[var(--gantt-grid-color)]',
          rowIndex % 2 === 1 ? 'bg-[var(--gantt-row-alt-bg)]' : 'bg-[var(--gantt-bg)]',
          'hover:bg-[var(--gantt-row-hover-bg)]',
          c.row,
          group && c.rowGroup,
          row.kind === 'child' && c.rowChild,
          isDropTarget && c.rowDropTarget,
        )}
        style={{ top: headerHeight + rowIndex * rowHeight, height: rowHeight, width: totalWidth }}
      >
        <div
          data-gantt="sidebar-cell"
          className={cx(
            'gantt-sidebar-cell sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-[var(--gantt-grid-major-color)] bg-inherit pr-2 text-sm',
            c.sidebarCell,
          )}
          style={{ width: sidebarWidth, paddingLeft: 8 + row.depth * 20 }}
        >
          {group ? (
            <button
              type="button"
              data-gantt="toggle"
              aria-expanded={row.expanded}
              aria-label={row.expanded ? labels.collapse : labels.expand}
              onClick={toggle}
              className={cx('gantt-toggle flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--gantt-muted)] hover:bg-black/10', c.toggle)}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ transform: row.expanded ? 'rotate(90deg)' : undefined }}>
                <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <div
            data-gantt="sidebar-label"
            className={cx('gantt-sidebar-label min-w-0 flex-1 truncate', group && 'cursor-pointer font-medium', c.sidebarLabel)}
            onClick={group ? toggle : undefined}
          >
            {renderLabel
              ? renderLabel({ task: row.task as GanttTask<TData>, row, isGroup: group, expanded: row.expanded, toggle })
              : row.task.label}
          </div>
        </div>
        <div data-gantt="timeline-cell" className={cx('gantt-timeline-cell relative shrink-0', c.timelineCell)} style={{ width: timelineWidth }}>
          {row.bars.map((bar) => renderBarItem({ task: bar.task, parent: bar.parent, lane: 0 }, rowIndex, row, null))}
        </div>
      </div>
    );
  };

  const renderResourceRow = (row: ResourceRowLayout) => {
    const rowIndex = row.index;
    const isDropTarget = rowIndex === dropRowIndex;
    return (
      <div
        key={row.key}
        data-gantt="row"
        data-row-index={rowIndex}
        data-row-id={row.row.id}
        data-kind="resource"
        data-lanes={row.laneCount}
        data-drop-target={isDropTarget || undefined}
        className={cx(
          'gantt-row absolute left-0 flex border-b border-[var(--gantt-grid-color)]',
          rowIndex % 2 === 1 ? 'bg-[var(--gantt-row-alt-bg)]' : 'bg-[var(--gantt-bg)]',
          'hover:bg-[var(--gantt-row-hover-bg)]',
          c.row,
          isDropTarget && c.rowDropTarget,
        )}
        style={{ top: headerHeight + row.top, height: row.height, width: totalWidth }}
      >
        <div
          data-gantt="sidebar-cell"
          className={cx(
            'gantt-sidebar-cell sticky left-0 z-20 flex shrink-0 items-start border-r border-[var(--gantt-grid-major-color)] bg-inherit px-2 text-sm',
            c.sidebarCell,
          )}
          style={{ width: sidebarWidth }}
        >
          <div
            data-gantt="sidebar-label"
            className={cx('gantt-sidebar-label flex min-w-0 flex-1 items-center', c.sidebarLabel)}
            style={{ height: rowHeight }}
          >
            <div className="min-w-0 flex-1 truncate">
              {renderRowLabel
                ? renderRowLabel({
                    row: row.row as GanttResourceRow<TRowData>,
                    index: rowIndex,
                    tasks: row.bars.map((bar) => bar.task as GanttTask<TData>),
                    laneCount: row.laneCount,
                  })
                : row.row.label}
            </div>
          </div>
        </div>
        <div data-gantt="timeline-cell" className={cx('gantt-timeline-cell relative shrink-0', c.timelineCell)} style={{ width: timelineWidth }}>
          {pendingGhosts.get(rowIndex)?.map((ghost) => renderGhost(`pending-ghost-${ghost.id}`, ghost.start, ghost.end, ghost.lane))}
          {row.bars.map((bar) => renderBarItem(bar, rowIndex, taskRowOf(bar), row.row))}
        </div>
      </div>
    );
  };

  const renderRowAt = (index: number) => {
    if (layout) {
      const row = layout.rows[index];
      return row ? renderResourceRow(row) : null;
    }
    const row = rows[index];
    return row ? renderRow(row, index) : null;
  };

  const visibleRows: React.ReactNode[] = [];
  for (let i = visible.start; i < visible.end; i++) visibleRows.push(renderRowAt(i));
  // Keep the dragged bar's row mounted when it scrolls out of the window, so that the drag survives.
  const originRowIndex = drag?.session.originRowIndex;
  if (originRowIndex !== undefined && (originRowIndex < visible.start || originRowIndex >= visible.end)) {
    visibleRows.push(renderRowAt(originRowIndex));
  }

  return (
    <div
      data-gantt="root"
      data-dragging={drag ? drag.session.kind : undefined}
      className={cx('gantt-root relative overflow-hidden', className, c.root)}
      style={rootStyle}
    >
      <div
        ref={scrollerRef}
        data-gantt="scroller"
        className={cx('gantt-scroller relative h-full w-full overflow-auto', c.scroller)}
        onScroll={onScroll}
        onWheel={handleWheel}
      >
        <div className="relative" style={{ width: totalWidth, height: headerHeight + bodyHeight }}>
          <TimelineHeader
            tiers={tiers}
            scale={scale}
            headerHeight={headerHeight}
            sidebarWidth={sidebarWidth}
            timelineWidth={timelineWidth}
            window={horizontalWindow}
            classNames={c}
            renderHeaderCell={renderHeaderCell}
          />
          <div
            data-gantt="grid"
            aria-hidden
            className={cx('gantt-grid pointer-events-none absolute z-[1]', c.grid)}
            style={{ left: sidebarWidth, top: headerHeight, width: timelineWidth, height: bodyHeight }}
          >
            {gridLines.map((line) => (
              <div
                key={line.key}
                className={cx(
                  'gantt-grid-line absolute inset-y-0 w-px',
                  line.major ? 'bg-[var(--gantt-grid-major-color)]' : 'bg-[var(--gantt-grid-color)]',
                  c.gridLine,
                  line.major && c.gridLineMajor,
                )}
                style={{ left: line.left }}
              />
            ))}
            {showNow && nowMs >= timeRange.startMs && nowMs <= timeRange.endMs && (
              <div
                data-gantt="now"
                className={cx('gantt-now-line absolute inset-y-0 z-10 w-px bg-red-500', c.nowLine)}
                style={{ left: nowPx }}
              />
            )}
          </div>
          {visibleRows}
        </div>
      </div>
      {draft &&
        pendingList.length > 0 &&
        (renderDraftToolbar
          ? renderDraftToolbar({ changes: pendingList, commit: commitDraft, discard: discardDraft })
          : showDraftToolbar && (
              <DraftToolbar changes={pendingList} commit={commitDraft} discard={discardDraft} labels={labels} classNames={c} />
            ))}
    </div>
  );
}

export const Gantt = forwardRef(GanttInner) as <TData = unknown, TRowData = unknown>(
  props: GanttProps<TData, TRowData> & { ref?: React.ForwardedRef<GanttHandle> },
) => React.ReactElement;
