import type { ReactNode } from 'react';
import type { HeaderTick, HeaderTiers } from '../core/header';
import { msToPx, type TimeScale } from '../core/time';
import type { GanttClassNames } from '../props';

export interface TimelineHeaderProps {
  tiers: HeaderTiers;
  scale: TimeScale;
  headerHeight: number;
  sidebarWidth: number;
  timelineWidth: number;
  /** Horizontal window (content px) outside of which cells are not rendered. */
  window: { left: number; right: number } | null;
  classNames: GanttClassNames;
  renderHeaderCell?: (tick: HeaderTick, tier: 'top' | 'bottom') => ReactNode;
  renderSidebarHeader?: () => ReactNode;
  /** Tick marks on the bottom tier, labels anchored at their tick. */
  showTicks?: boolean;
  /** Content drawn in the bottom tier, centred on the now line. */
  nowMarker?: { left: number; content: ReactNode } | null;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function visibleTicks(ticks: HeaderTick[], scale: TimeScale, window: { left: number; right: number } | null): HeaderTick[] {
  if (!window) return ticks;
  return ticks.filter((tick) => msToPx(scale, tick.endMs) >= window.left && msToPx(scale, tick.startMs) <= window.right);
}

export function TimelineHeader(props: TimelineHeaderProps) {
  const { tiers, scale, classNames: c } = props;
  const tierHeight = props.headerHeight / 2;

  const renderTier = (ticks: HeaderTick[], tier: 'top' | 'bottom') => (
    <div
      data-gantt={`header-${tier}`}
      className={cx('relative', tier === 'top' ? c.headerTierTop : c.headerTierBottom)}
      style={{ height: tierHeight }}
    >
      {visibleTicks(ticks, scale, props.window).map((tick) => {
        const left = msToPx(scale, tick.startMs);
        const width = msToPx(scale, tick.endMs) - left;
        const anchored = tier === 'bottom' && props.showTicks;
        return (
          <div
            key={tick.key}
            data-gantt="header-cell"
            data-tier={tier}
            className={cx(
              'gantt-header-cell absolute inset-y-0 overflow-hidden border-b border-[var(--gantt-grid-color)] px-1 text-xs leading-none whitespace-nowrap text-[var(--gantt-muted)] flex items-center',
              !anchored && 'border-r',
              tier === 'top' ? 'font-medium' : !anchored && 'justify-center',
              c.headerCell,
            )}
            style={{ left, width }}
            title={tick.label}
          >
            {anchored && tick.startMs > scale.startMs && (
              <span
                data-gantt="header-tick"
                aria-hidden
                className={cx('gantt-header-tick absolute bottom-0 left-0 h-[var(--gantt-tick-height)] w-px bg-[var(--gantt-grid-major-color)]', c.headerTick)}
              />
            )}
            {props.renderHeaderCell ? props.renderHeaderCell(tick, tier) : tick.label}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      data-gantt="header"
      className={cx('gantt-header sticky top-0 z-30 flex bg-[var(--gantt-bg)]', c.header)}
      style={{ height: props.headerHeight, width: props.sidebarWidth + props.timelineWidth }}
    >
      <div
        data-gantt="header-sidebar"
        className={cx(
          'gantt-header-sidebar sticky left-0 z-40 flex shrink-0 items-center border-r border-b border-[var(--gantt-grid-major-color)] bg-[var(--gantt-bg)]',
          c.headerSidebar,
        )}
        style={{ width: props.sidebarWidth }}
      >
        {props.renderSidebarHeader?.()}
      </div>
      <div data-gantt="header-timeline" className={cx('gantt-header-timeline relative shrink-0', c.headerTimeline)} style={{ width: props.timelineWidth }}>
        {renderTier(tiers.top, 'top')}
        {renderTier(tiers.bottom, 'bottom')}
        {props.nowMarker && (
          <div
            data-gantt="now-marker"
            className={cx('gantt-now-marker absolute bottom-0 z-10 flex w-0 items-center justify-center overflow-visible', c.nowMarker)}
            style={{ left: props.nowMarker.left, height: tierHeight }}
          >
            {props.nowMarker.content}
          </div>
        )}
      </div>
    </div>
  );
}
