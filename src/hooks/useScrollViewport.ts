import { useCallback, useEffect, useState, type RefObject, type UIEvent } from 'react';

export interface Viewport {
  scrollTop: number;
  scrollLeft: number;
  height: number;
  width: number;
}

/** Tracks the scroll offsets and size of a scroll container. */
export function useScrollViewport(ref: RefObject<HTMLElement | null>): [Viewport, (event: UIEvent<HTMLElement>) => void] {
  const [viewport, setViewport] = useState<Viewport>({ scrollTop: 0, scrollLeft: 0, height: 0, width: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setViewport((prev) => {
        const height = el.clientHeight;
        const width = el.clientWidth;
        if (prev.height === height && prev.width === width) return prev;
        return { ...prev, height, width };
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const el = event.currentTarget;
    setViewport((prev) => {
      if (prev.scrollTop === el.scrollTop && prev.scrollLeft === el.scrollLeft) return prev;
      return { ...prev, scrollTop: el.scrollTop, scrollLeft: el.scrollLeft };
    });
  }, []);

  return [viewport, onScroll];
}
