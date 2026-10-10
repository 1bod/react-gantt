import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { BarDragHandlers } from '../hooks/useDrag';
import type { GanttClassNames } from '../props';
import type { GanttTask } from '../types';
export interface TaskBarProps {
    task: GanttTask;
    left: number;
    width: number;
    /** Vertical placement inside the row. Default `15%` / `70%`. */
    top?: number | string;
    height?: number | string;
    /** Vertical offset in pixels while being dragged onto another row. */
    translateY: number;
    isDragging: boolean;
    isPending: boolean;
    isGroup: boolean;
    isChild: boolean;
    isSelected?: boolean;
    isHighlighted?: boolean;
    /** Dragged over a target rejected by `canDrop`. */
    isInvalid?: boolean;
    interactive: boolean;
    showHandles: boolean;
    ariaLabel: string;
    classNames: GanttClassNames;
    className?: string;
    style?: CSSProperties;
    handlers: BarDragHandlers | null;
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    children: ReactNode;
}
export declare function TaskBar(props: TaskBarProps): import("react").JSX.Element;
