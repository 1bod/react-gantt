import { type RefObject, type UIEvent } from 'react';
export interface Viewport {
    scrollTop: number;
    scrollLeft: number;
    height: number;
    width: number;
}
/** Tracks the scroll offsets and size of a scroll container. */
export declare function useScrollViewport(ref: RefObject<HTMLElement | null>): [Viewport, (event: UIEvent<HTMLElement>) => void];
