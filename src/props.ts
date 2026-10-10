import type { DateTime } from 'luxon';
import type { CSSProperties, ReactNode } from 'react';
import type { HeaderTick, HeaderTierSpecs } from './core/header';
import type { ShowLinks } from './core/links';
import type { GanttRow } from './core/rows';
import type { ClosedRange, DateInput, DragPreview, GanttLink, GanttResourceRow, GanttTask, ParentMode, SnapMode, TaskChange, ZoomLevel } from './types';

export type GanttSlot =
  | 'root'
  | 'scroller'
  | 'header'
  | 'headerSidebar'
  | 'headerTimeline'
  | 'headerTierTop'
  | 'headerTierBottom'
  | 'headerCell'
  | 'headerTick'
  | 'grid'
  | 'gridLine'
  | 'gridLineMajor'
  | 'nowLine'
  | 'nowMarker'
  | 'row'
  | 'rowGroup'
  | 'rowChild'
  | 'rowDropTarget'
  | 'sidebarCell'
  | 'sidebarLabel'
  | 'toggle'
  | 'timelineCell'
  | 'closedRange'
  | 'bar'
  | 'barGroup'
  | 'barChild'
  | 'barPending'
  | 'barDragging'
  | 'barSelected'
  | 'barHighlighted'
  | 'barLabel'
  | 'handle'
  | 'ghost'
  | 'link'
  | 'draftToolbar'
  | 'draftButton'
  | 'draftButtonPrimary';

/** Extra class names appended to each rendered slot. */
export type GanttClassNames = Partial<Record<GanttSlot, string>>;

export interface GanttLabels {
  commit: string;
  discard: string;
  pendingChanges: (count: number) => string;
  expand: string;
  collapse: string;
  /** Accessible name of a bar. */
  bar: (task: GanttTask, start: DateTime, end: DateTime) => string;
}

export interface BarRenderContext<TData = unknown, TRowData = unknown> {
  task: GanttTask<TData>;
  parent: GanttTask<TData> | null;
  /** Task mode row. In resource mode, a leaf (or child) row describing the task itself. */
  row: GanttRow;
  /** Resource mode: the row the bar is drawn on. `null` in task mode. */
  resource: GanttResourceRow<TRowData> | null;
  /** Resource mode: lane of the bar inside its row (0 in task mode). */
  lane: number;
  start: DateTime;
  end: DateTime;
  isDragging: boolean;
  isPending: boolean;
  isGroup: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

export interface LabelRenderContext<TData = unknown> {
  task: GanttTask<TData>;
  row: GanttRow;
  isGroup: boolean;
  expanded: boolean;
  toggle: () => void;
}

export interface RowLabelRenderContext<TData = unknown, TRowData = unknown> {
  row: GanttResourceRow<TRowData>;
  index: number;
  /** Tasks drawn on the row, ordered by start then id. */
  tasks: GanttTask<TData>[];
  laneCount: number;
  /** One of the row's bars is selected. */
  hasSelection: boolean;
}

export interface DraftToolbarRenderContext {
  changes: TaskChange[];
  commit: () => void;
  discard: () => void;
}

export interface GanttProps<TData = unknown, TRowData = unknown> {
  tasks: GanttTask<TData>[];

  /**
   * Resource mode: one row per resource, tasks are drawn on the row given by `task.rowId`
   * (several bars per row, overlapping bars packed into lanes). Without `rows`, the
   * component is in task mode (one row per task).
   */
  rows?: GanttResourceRow<TRowData>[];
  /** Resource mode: height added to a row by each extra lane. Defaults to `rowHeight`. */
  laneHeight?: number;
  /**
   * Vertical gap in pixels between a bar and the edges of its row (or lane).
   * Defaults to 15% of `rowHeight` (rounded to whole pixels in resource mode).
   */
  barInset?: number;

  /** Header granularity. Default `day`. */
  zoom?: ZoomLevel;
  /** Called on ctrl + wheel. When omitted, wheel zooming is disabled. */
  onZoomChange?: (zoom: ZoomLevel) => void;
  /** Visible time range. Defaults to the extent of the tasks, padded by one unit. */
  range?: { start: DateInput; end: DateInput };
  /** IANA zone used for the grid and headers. Default `local`. */
  zone?: string;
  /** Locale for header labels (luxon). Defaults to the runtime locale. */
  locale?: string;

  /** Grid snapping. Default `hour`. */
  snap?: SnapMode;
  /** Magnetise bars to the start/end of the other tasks. Default `true`. */
  snapToTasks?: boolean;
  /** Magnet radius in pixels. Default `8`. */
  snapThresholdPx?: number;
  /** Minimum task duration in milliseconds. Defaults to the snap unit (at least one minute). */
  minDuration?: number;

  /** Default display mode of tasks that have children. Default `independent`. */
  parentMode?: ParentMode;
  /** Controlled list of expanded task ids. */
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;

  readOnly?: boolean;
  /** Allow dragging a bar onto another row. Default `true`. */
  allowVerticalMove?: boolean;
  /** Show resize handles. Default `true`. */
  allowResize?: boolean;

  /**
   * Called when the user finishes moving or resizing a task (immediate mode).
   * Return `false` to reject the change. The component never mutates `tasks`:
   * apply the change yourself (see `applyTaskChange`).
   */
  onTaskChange?: (change: TaskChange) => void | boolean;
  /** Fires continuously during a drag, then once with `null` when the drag ends. */
  onDragPreview?: (preview: DragPreview | null) => void;
  onTaskClick?: (task: GanttTask<TData>, event: React.PointerEvent<HTMLElement>) => void;

  /**
   * Selected bars (controlled). A click selects one bar, shift / cmd / ctrl + click toggles
   * it, Escape or a click on the empty grid clears. Selection is enabled as soon as
   * `selectedIds` or `onSelectionChange` is given (internal state with the latter only).
   */
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Bars to emphasise (e.g. the other operations of the selected order): `data-highlighted`. */
  highlightedIds?: string[];

  /** Dependencies, drawn as orthogonal elbows between the rendered bars (see `showLinks`). */
  links?: GanttLink[];
  /** Which links are drawn: those touching a selected bar (default), all of them, or none. */
  showLinks?: ShowLinks;

  /**
   * Draft mode: changes are collected instead of being emitted through `onTaskChange`,
   * displayed as a preview, and emitted all at once through `onDraftCommit`.
   */
  draft?: boolean;
  onDraftChange?: (changes: TaskChange[]) => void;
  /** Return `false` to keep the pending changes after the commit. */
  onDraftCommit?: (changes: TaskChange[]) => void | boolean;
  /** Show the built-in commit/discard toolbar in draft mode. Default `true`. */
  showDraftToolbar?: boolean;
  renderDraftToolbar?: (ctx: DraftToolbarRenderContext) => ReactNode;

  rowHeight?: number;
  /** Width of one zoom unit (an hour, a day…) in pixels. */
  columnWidth?: number;
  sidebarWidth?: number;
  headerHeight?: number;
  /** Rows rendered above and below the viewport. Default `5`. */
  overscan?: number;
  /** Height of the component. The body scrolls inside it. Default `500`. */
  height?: number | string;
  /**
   * Closed time of a row, drawn as shaded blocks behind the bars. Called with the resource
   * row in resource mode, with the task row in task mode (`'task' in row`). Results are
   * cached until the function or the rows change: pass a stable function.
   */
  closedRanges?: (row: GanttResourceRow<TRowData> | GanttRow) => ClosedRange[];
  /** Closed blocks narrower than this (pixels) get `data-narrow` (no hatch by default). Default `30`. */
  closedNarrowThreshold?: number;
  /** Draw a vertical line at the current time. Default `true`. */
  showNow?: boolean;
  /** Override the current time (testing, "as of" views). */
  now?: DateInput;
  /** Content drawn in the bottom header tier, centred on the now line (e.g. a time chip). */
  renderNow?: (now: DateTime) => ReactNode;

  renderBar?: (ctx: BarRenderContext<TData, TRowData>) => ReactNode;
  renderLabel?: (ctx: LabelRenderContext<TData>) => ReactNode;
  /** Resource mode: content of a row's sidebar cell. Defaults to `row.label`. */
  renderRowLabel?: (ctx: RowLabelRenderContext<TData, TRowData>) => ReactNode;
  renderHeaderCell?: (tick: HeaderTick, tier: 'top' | 'bottom') => ReactNode;
  /** Content of the top-left header cell, above the sidebar. */
  renderSidebarHeader?: () => ReactNode;
  /**
   * Header tiers per zoom level: unit, step and label format of the top and bottom tiers
   * (e.g. days over 6-hour steps). Missing levels use `DEFAULT_HEADER_TIERS`.
   */
  headerTiers?: Partial<Record<ZoomLevel, HeaderTierSpecs>>;
  /** Tick marks on the bottom tier; its labels are then left-aligned at their tick. Default `false`. */
  showTicks?: boolean;
  barClassName?: (task: GanttTask<TData>) => string | undefined;
  barStyle?: (task: GanttTask<TData>) => CSSProperties | undefined;

  classNames?: GanttClassNames;
  className?: string;
  style?: CSSProperties;
  labels?: Partial<GanttLabels>;
}

export interface GanttHandle {
  commitDraft: () => void;
  discardDraft: () => void;
  getPendingChanges: () => TaskChange[];
  /** Scrolls to the row of the task (its resource row in resource mode) and to the start of its bar. */
  scrollToTask: (id: string) => void;
  scrollToTime: (date: DateInput) => void;
  /** The scrollable element, for advanced integrations. */
  getScrollElement: () => HTMLDivElement | null;
}
