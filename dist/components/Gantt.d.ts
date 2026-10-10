import type { GanttHandle, GanttProps } from '../props';
export declare const Gantt: <TData = unknown, TRowData = unknown>(props: GanttProps<TData, TRowData> & {
    ref?: React.ForwardedRef<GanttHandle>;
}) => React.ReactElement;
