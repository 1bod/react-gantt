import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { BarDragHandlers } from '../hooks/useDrag';
import type { GanttClassNames } from '../props';
import type { GanttTask } from '../types';

export interface TaskBarProps {
  task: GanttTask;
  left: number;
  width: number;
  /** Vertical offset in pixels while being dragged onto another row. */
  translateY: number;
  isDragging: boolean;
  isPending: boolean;
  isGroup: boolean;
  isChild: boolean;
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

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function TaskBar(props: TaskBarProps) {
  const { task, classNames: c } = props;
  const style: CSSProperties & Record<string, string | number | undefined> = {
    left: props.left,
    width: props.width,
    top: '15%',
    height: '70%',
    transform: props.translateY ? `translateY(${props.translateY}px)` : undefined,
    zIndex: props.isDragging ? 10 : 2,
    '--gantt-bar-bg': task.color,
    ...props.style,
  };
  return (
    <div
      data-gantt="bar"
      data-task-id={task.id}
      data-dragging={props.isDragging || undefined}
      data-pending={props.isPending || undefined}
      data-kind={props.isGroup ? 'group' : props.isChild ? 'child' : 'leaf'}
      role="button"
      tabIndex={props.interactive ? 0 : -1}
      aria-label={props.ariaLabel}
      className={cx(
        'gantt-bar absolute flex items-center rounded-md text-xs select-none touch-none',
        props.interactive ? 'cursor-grab focus:outline-2 focus:outline-offset-1 focus:outline-blue-500' : 'cursor-default',
        props.isDragging && 'cursor-grabbing',
        c.bar,
        props.isGroup && c.barGroup,
        props.isChild && c.barChild,
        props.isPending && c.barPending,
        props.isDragging && c.barDragging,
        props.className,
      )}
      style={style}
      {...(props.handlers ?? {})}
      onKeyDown={props.onKeyDown}
    >
      {props.showHandles && (
        <div
          data-handle="start"
          aria-hidden
          className={cx('gantt-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/20', c.handle)}
        />
      )}
      <div className={cx('gantt-bar-label min-w-0 flex-1 truncate px-2', c.barLabel)}>{props.children}</div>
      {props.showHandles && (
        <div
          data-handle="end"
          aria-hidden
          className={cx('gantt-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/20', c.handle)}
        />
      )}
    </div>
  );
}
