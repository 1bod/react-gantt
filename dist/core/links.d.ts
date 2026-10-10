import type { GanttLink, LinkType } from '../types';
/** A bar's box in body coordinates (pixels from the top-left corner of the timeline body). */
export interface BarRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface LinkGeometry {
    /** SVG path of the orthogonal elbow. */
    path: string;
    /** SVG path of the arrow head at the successor end. */
    arrow: string;
}
export type ShowLinks = 'selected' | 'all' | 'none';
/**
 * Orthogonal elbow between two bars. `finish_start` leaves the end of `from` and enters the
 * start of `to` (going around when `to` starts before `from` ends), `start_start` leaves and
 * enters on the left, `finish_finish` on the right. `stub` is the horizontal run at each end.
 */
export declare function linkPath(from: BarRect, to: BarRect, type?: LinkType, stub?: number): LinkGeometry;
/** The links to draw: those touching a selected bar, all of them, or none. */
export declare function selectLinks(links: readonly GanttLink[], mode: ShowLinks, selected: ReadonlySet<string>): GanttLink[];
