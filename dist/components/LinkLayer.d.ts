import { type BarRect } from '../core/links';
import type { GanttClassNames } from '../props';
import type { GanttLink } from '../types';
export interface LinkLayerProps {
    links: GanttLink[];
    /** Boxes of the bars currently rendered, by task id. Links to other bars are skipped. */
    rects: ReadonlyMap<string, BarRect>;
    left: number;
    top: number;
    width: number;
    height: number;
    classNames: GanttClassNames;
}
/** SVG overlay of the dependency links, above the rows and below the bars. */
export declare function LinkLayer({ links, rects, left, top, width, height, classNames: c }: LinkLayerProps): import("react").JSX.Element | null;
