import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine: give elements a deterministic geometry so that
// pixel <-> time conversions inside the component are testable.
if (typeof window !== 'undefined') {
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {
      pointerId: number;
      pointerType: string;
      isPrimary: boolean;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
        this.isPrimary = init.isPrimary ?? true;
      }
    }
    // @ts-expect-error jsdom polyfill
    window.PointerEvent = PointerEvent;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function (this: Element, x?: number | ScrollToOptions, y?: number) {
      if (typeof x === 'object' && x) {
        if (x.left !== undefined) this.scrollLeft = x.left;
        if (x.top !== undefined) this.scrollTop = x.top;
      } else {
        if (x !== undefined) this.scrollLeft = x;
        if (y !== undefined) this.scrollTop = y;
      }
    };
  }
  if (!window.ResizeObserver) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserver;
  }
}
