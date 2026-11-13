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

/** Half pixel coordinates: 1px strokes stay crisp. */
const crisp = (n: number) => Math.floor(n) + 0.5;

const ARROW = 4;

/**
 * Orthogonal elbow between two bars. `finish_start` leaves the end of `from` and enters the
 * start of `to` (going around when `to` starts before `from` ends), `start_start` leaves and
 * enters on the left, `finish_finish` on the right. `stub` is the horizontal run at each end.
 */
export function linkPath(from: BarRect, to: BarRect, type: LinkType = 'finish_start', stub = 8): LinkGeometry {
  const y1 = crisp(from.y + from.height / 2);
  const y2 = crisp(to.y + to.height / 2);
  const x1 = crisp(type === 'start_start' ? from.x : from.x + from.width);
  const x2 = crisp(type === 'finish_finish' ? to.x + to.width : to.x);

  let points: Array<[number, number]>;
  if (type === 'start_start' || type === 'finish_finish') {
    const xm = type === 'start_start' ? Math.min(x1, x2) - stub : Math.max(x1, x2) + stub;
    points = [[x1, y1], [xm, y1], [xm, y2], [x2, y2]];
  } else if (x2 - x1 >= 2 * stub) {
    points = [[x1, y1], [x1 + stub, y1], [x1 + stub, y2], [x2, y2]];
  } else {
    // The successor starts before the predecessor ends: detour between the two bars.
    const ym = y1 === y2 ? crisp(Math.max(from.y + from.height, to.y + to.height) + stub / 2) : crisp((y1 + y2) / 2);
    points = [[x1, y1], [x1 + stub, y1], [x1 + stub, ym], [x2 - stub, ym], [x2 - stub, y2], [x2, y2]];
  }

  const deduped = points.filter((p, i) => i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1]);
  const path = deduped.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  // The arrow points right (enters a start) or left (enters an end).
  const back = type === 'finish_finish' ? x2 + ARROW : x2 - ARROW;
  const arrow = `M${x2} ${y2} L${back} ${y2 - ARROW * 0.75} L${back} ${y2 + ARROW * 0.75} Z`;
  return { path, arrow };
}

/** The links to draw: those touching a selected bar, all of them, or none. */
export function selectLinks(links: readonly GanttLink[], mode: ShowLinks, selected: ReadonlySet<string>): GanttLink[] {
  if (mode === 'none') return [];
  if (mode === 'all') return links.slice();
  return links.filter((link) => selected.has(link.from) || selected.has(link.to));
}
