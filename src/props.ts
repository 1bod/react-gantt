import type { DateTime } from 'luxon';
import type { CSSProperties, ReactNode } from 'react';
import type { HeaderTick } from './core/header';
import type { GanttRow } from './core/rows';
import type { DateInput, DragPreview, GanttTask, ParentMode, SnapMode, TaskChange, ZoomLevel } from './types';

export type GanttSlot =
  | 'root'
  | 'scroller'
  | 'header'
  | 'headerSidebar'
  | 'headerTimeline'
  | 'headerTierTop'
  | 'headerTierBottom'
  | 'headerCell'
  | 'grid'
  | 'gridLine'
  | 'gridLineMajor'
  | 'nowLine'
  | 'row'
  | 'rowGroup'
  | 'rowChild'
  | 'rowDropTarget'
  | 'sidebarCell'
  | 'sidebarLabel'
  | 'toggle'
  | 'timelineCell'
  | 'bar'
  | 'barGroup'
  | 'barChild'
  | 'barPending'
  | 'barDragging'
  | 'barLabel'
  | 'handle'
  | 'ghost'
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

export interface BarRenderContext<TData = unknown> {
  task: GanttTask<TData>;
  parent: GanttTask<TData> | null;
  row: GanttRow;
  start: DateTime;
  end: DateTime;
  isDragging: boolean;
  isPending: boolean;
  isGroup: boolean;
}

export interface LabelRenderContext<TData = unknown> {
  task: GanttTask<TData>;
  row: GanttRow;
  isGroup: boolean;
  expanded: boolean;
  toggle: () => void;
}

export interface DraftToolbarRenderContext {
  changes: TaskChange[];
  commit: () => void;
  discard: () => void;
}

export interface GanttProps<TData = unknown> {
  tasks: GanttTask<TData>[];

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
  /** Draw a vertical line at the current time. Default `true`. */
  showNow?: boolean;
  /** Override the current time (testing, "as of" views). */
  now?: DateInput;

  renderBar?: (ctx: BarRenderContext<TData>) => ReactNode;
  renderLabel?: (ctx: LabelRenderContext<TData>) => ReactNode;
  renderHeaderCell?: (tick: HeaderTick, tier: 'top' | 'bottom') => ReactNode;
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
  scrollToTask: (id: string) => void;
  scrollToTime: (date: DateInput) => void;
  /** The scrollable element, for advanced integrations. */
  getScrollElement: () => HTMLDivElement | null;
}
