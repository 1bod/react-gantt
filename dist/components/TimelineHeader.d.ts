import type { ReactNode } from 'react';
import type { HeaderTick, HeaderTiers } from '../core/header';
import { type TimeScale } from '../core/time';
import type { GanttClassNames } from '../props';
export interface TimelineHeaderProps {
    tiers: HeaderTiers;
    scale: TimeScale;
    headerHeight: number;
    sidebarWidth: number;
    timelineWidth: number;
    /** Horizontal window (content px) outside of which cells are not rendered. */
    window: {
        left: number;
        right: number;
    } | null;
    classNames: GanttClassNames;
    renderHeaderCell?: (tick: HeaderTick, tier: 'top' | 'bottom') => ReactNode;
    renderSidebarHeader?: () => ReactNode;
    /** Tick marks on the bottom tier, labels anchored at their tick. */
    showTicks?: boolean;
    /** Content drawn in the bottom tier, centred on the now line. */
    nowMarker?: {
        left: number;
        content: ReactNode;
    } | null;
}
export declare function visibleTicks(ticks: HeaderTick[], scale: TimeScale, window: {
    left: number;
    right: number;
} | null): HeaderTick[];
export declare function TimelineHeader(props: TimelineHeaderProps): import("react").JSX.Element;
