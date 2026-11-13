import { linkPath, type BarRect } from '../core/links';
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

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** SVG overlay of the dependency links, above the rows and below the bars. */
export function LinkLayer({ links, rects, left, top, width, height, classNames: c }: LinkLayerProps) {
  const drawn = links.flatMap((link) => {
    const from = rects.get(link.from);
    const to = rects.get(link.to);
    return from && to ? [{ link, geometry: linkPath(from, to, link.type) }] : [];
  });
  if (!drawn.length) return null;
  return (
    <svg
      data-gantt="links"
      aria-hidden
      className="gantt-links pointer-events-none absolute z-[1] overflow-visible"
      style={{ left, top, width, height }}
    >
      {drawn.map(({ link, geometry }) => (
        <g key={link.id} data-gantt="link" data-link-id={link.id} data-type={link.type ?? 'finish_start'} className={cx('gantt-link', c.link)}>
          <path d={geometry.path} fill="none" stroke="currentColor" strokeWidth={1} />
          <path d={geometry.arrow} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
