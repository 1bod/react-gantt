import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { computeDrag, type DragKind, type DragResult } from '../core/drag';
import type { TimeScale } from '../core/time';
import type { SnapMode } from '../types';

export interface DragSession {
  taskId: string;
  kind: DragKind;
  originStart: number;
  originEnd: number;
  originRowIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  /** Magnet edges (other tasks), captured when the drag starts. */
  edges: number[];
  moved: boolean;
}

export interface DragState {
  session: DragSession;
  result: DragResult;
}

export interface UseDragParams {
  enabled: boolean;
  scrollerRef: RefObject<HTMLElement | null>;
  scale: TimeScale;
  rowCount: number;
  rowHeight: number;
  snap: SnapMode;
  zone: string;
  snapToTasks: boolean;
  snapThresholdPx: number;
  minDurationMs: number;
  allowVertical: boolean;
  allowResize: boolean;
  getInterval: (taskId: string) => { start: number; end: number } | undefined;
  getEdges: (excludeTaskId: string) => number[];
  onPreview: (session: DragSession, result: DragResult | null) => void;
  onDrop: (session: DragSession, result: DragResult) => void;
  onClick: (session: DragSession, event: ReactPointerEvent<HTMLElement>) => void;
}

export interface BarDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
}

/** Pixels the pointer must travel before a press becomes a drag. */
export const DRAG_THRESHOLD_PX = 3;
const AUTOSCROLL_EDGE_PX = 40;
const AUTOSCROLL_SPEED_PX = 12;

function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Pointer based drag & drop for task bars. Geometry is derived from pointer deltas
 * (plus scroll deltas), so it stays correct while the container auto-scrolls.
 */
export function useDrag(params: UseDragParams) {
  const paramsRef = useLatest(params);
  const sessionRef = useRef<DragSession | null>(null);
  const resultRef = useRef<DragResult | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoscrollRef = useRef<{ vx: number; vy: number; raf: number | null }>({ vx: 0, vy: 0, raf: null });
  const [drag, setDrag] = useState<DragState | null>(null);

  const stopAutoscroll = useCallback(() => {
    const auto = autoscrollRef.current;
    if (auto.raf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(auto.raf);
    auto.raf = null;
    auto.vx = 0;
    auto.vy = 0;
  }, []);

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const session = sessionRef.current;
      if (!session) return;
      const p = paramsRef.current;
      const scroller = p.scrollerRef.current;
      const scrollDx = scroller ? scroller.scrollLeft - session.startScrollLeft : 0;
      const scrollDy = scroller ? scroller.scrollTop - session.startScrollTop : 0;
      const edgeThresholdMs = p.snapToTasks ? p.snapThresholdPx / p.scale.pxPerMs : 0;
      const result = computeDrag({
        kind: session.kind,
        originStart: session.originStart,
        originEnd: session.originEnd,
        deltaPx: clientX - session.startX + scrollDx,
        deltaY: clientY - session.startY + scrollDy,
        originRowIndex: session.originRowIndex,
        rowCount: p.rowCount,
        rowHeight: p.rowHeight,
        scale: p.scale,
        snap: { snap: p.snap, edges: session.edges, edgeThresholdMs, zone: p.zone },
        minDurationMs: p.minDurationMs,
        allowVertical: p.allowVertical,
      });
      resultRef.current = result;
      setDrag({ session, result });
      p.onPreview(session, result);

      // Auto-scroll when the pointer is close to the edges of the scroll container.
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const auto = autoscrollRef.current;
        if (rect.width > 0 && rect.height > 0) {
          auto.vx = clientX > rect.right - AUTOSCROLL_EDGE_PX ? AUTOSCROLL_SPEED_PX : clientX < rect.left + AUTOSCROLL_EDGE_PX ? -AUTOSCROLL_SPEED_PX : 0;
          auto.vy =
            session.kind === 'move' && p.allowVertical
              ? clientY > rect.bottom - AUTOSCROLL_EDGE_PX
                ? AUTOSCROLL_SPEED_PX
                : clientY < rect.top + AUTOSCROLL_EDGE_PX
                  ? -AUTOSCROLL_SPEED_PX
                  : 0
              : 0;
          if ((auto.vx || auto.vy) && auto.raf === null && typeof requestAnimationFrame === 'function') {
            const tick = () => {
              const s = sessionRef.current;
              const el = paramsRef.current.scrollerRef.current;
              const a = autoscrollRef.current;
              if (!s || !el || (!a.vx && !a.vy)) {
                a.raf = null;
                return;
              }
              el.scrollLeft += a.vx;
              el.scrollTop += a.vy;
              const last = lastPointerRef.current;
              if (last) update(last.x, last.y);
              a.raf = requestAnimationFrame(tick);
            };
            auto.raf = requestAnimationFrame(tick);
          }
        }
      }
    },
    [paramsRef],
  );

  const cleanup = useCallback(
    (element: HTMLElement | null) => {
      const session = sessionRef.current;
      if (session && element && element.hasPointerCapture?.(session.pointerId)) {
        element.releasePointerCapture(session.pointerId);
      }
      if (session && session.moved) paramsRef.current.onPreview(session, null);
      sessionRef.current = null;
      resultRef.current = null;
      lastPointerRef.current = null;
      stopAutoscroll();
      setDrag(null);
    },
    [paramsRef, stopAutoscroll],
  );

  const cancel = useCallback(() => {
    if (!sessionRef.current) return;
    cleanup(null);
  }, [cleanup]);

  useEffect(() => {
    if (!drag) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drag, cancel]);

  useEffect(() => () => stopAutoscroll(), [stopAutoscroll]);

  const getBarHandlers = useCallback(
    (taskId: string, rowIndex: number): BarDragHandlers => ({
      onPointerDown: (event) => {
        const p = paramsRef.current;
        if (!p.enabled || event.button !== 0 || sessionRef.current) return;
        const interval = p.getInterval(taskId);
        if (!interval) return;
        const handle = (event.target as HTMLElement).closest?.('[data-handle]')?.getAttribute('data-handle');
        let kind: DragKind = handle === 'start' ? 'resize-start' : handle === 'end' ? 'resize-end' : 'move';
        if (kind !== 'move' && !p.allowResize) kind = 'move';
        const scroller = p.scrollerRef.current;
        sessionRef.current = {
          taskId,
          kind,
          originStart: interval.start,
          originEnd: interval.end,
          originRowIndex: rowIndex,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startScrollLeft: scroller?.scrollLeft ?? 0,
          startScrollTop: scroller?.scrollTop ?? 0,
          edges: p.getEdges(taskId),
          moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== event.pointerId) return;
        if (!session.moved) {
          const dx = event.clientX - session.startX;
          const dy = event.clientY - session.startY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          session.moved = true;
        }
        event.preventDefault();
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        update(event.clientX, event.clientY);
      },
      onPointerUp: (event) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== event.pointerId) return;
        const element = event.currentTarget;
        // Take the release position into account (the pointer may have moved back).
        if (session.moved) update(event.clientX, event.clientY);
        const result = resultRef.current;
        if (session.moved && result) {
          // Clear first so that the drop handler renders a clean state.
          cleanup(element);
          paramsRef.current.onDrop(session, result);
        } else {
          cleanup(element);
          paramsRef.current.onClick(session, event);
        }
      },
      onPointerCancel: (event) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== event.pointerId) return;
        cleanup(event.currentTarget);
      },
      onLostPointerCapture: (event) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== event.pointerId) return;
        cleanup(null);
      },
    }),
    [paramsRef, update, cleanup],
  );

  return { drag, getBarHandlers, cancel };
}
