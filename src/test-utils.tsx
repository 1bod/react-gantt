import { fireEvent, screen } from '@testing-library/react';
import type { GanttTask } from './types';

export const DAY_START = Date.UTC(2026, 0, 5, 0, 0, 0);
export const H = 3_600_000;
export const MIN = 60_000;

/** Fixed range + hour zoom + 60px columns: 1 pixel = 1 minute. */
export const baseProps = {
  zoom: 'hour' as const,
  columnWidth: 60,
  range: { start: DAY_START, end: DAY_START + 24 * H },
  zone: 'utc',
  locale: 'en',
  snap: 'none' as const,
  snapToTasks: false,
  rowHeight: 36,
  headerHeight: 48,
  sidebarWidth: 200,
  showNow: false,
};

export function makeTasks(): GanttTask[] {
  return [
    { id: 'a', label: 'Task A', start: DAY_START + 10 * H, end: DAY_START + 12 * H },
    { id: 'b', label: 'Task B', start: DAY_START + 14 * H, end: DAY_START + 15 * H, color: '#ff0000' },
    {
      id: 'g',
      label: 'Group G',
      start: DAY_START + 8 * H,
      end: DAY_START + 18 * H,
      children: [
        { id: 'g1', label: 'Child G1', start: DAY_START + 9 * H, end: DAY_START + 10 * H },
        { id: 'g2', label: 'Child G2', start: DAY_START + 16 * H, end: DAY_START + 17 * H },
      ],
    },
    {
      id: 'i',
      label: 'Inline I',
      start: DAY_START + 1 * H,
      end: DAY_START + 5 * H,
      parentMode: 'inline',
      children: [
        { id: 'i1', label: 'Child I1', start: DAY_START + 1 * H, end: DAY_START + 2 * H },
        { id: 'i2', label: 'Child I2', start: DAY_START + 3 * H, end: DAY_START + 4 * H },
      ],
    },
  ];
}

export function getBar(taskId: string): HTMLElement {
  const bar = document.querySelector<HTMLElement>(`[data-gantt="bar"][data-task-id="${taskId}"]`);
  if (!bar) throw new Error(`bar ${taskId} not found`);
  return bar;
}

export function queryBar(taskId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-gantt="bar"][data-task-id="${taskId}"]`);
}

export function getRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-gantt="row"]'));
}

export function getRowIds(): string[] {
  return getRows().map((row) => row.dataset.taskId!);
}

export interface DragOptions {
  /** Element to press on. Defaults to the bar itself. */
  target?: Element;
  startX?: number;
  startY?: number;
  /** Extra intermediate moves before the last one. */
  steps?: number;
  /** Do not release the pointer. */
  hold?: boolean;
}

/** Simulates a pointer drag of (dx, dy) pixels on a bar. */
export function dragBy(bar: HTMLElement, dx: number, dy: number, options: DragOptions = {}) {
  const startX = options.startX ?? 100;
  const startY = options.startY ?? 100;
  const target = options.target ?? bar;
  const pointer = { pointerId: 1, button: 0, buttons: 1, isPrimary: true };
  fireEvent.pointerDown(target, { ...pointer, clientX: startX, clientY: startY });
  const steps = options.steps ?? 2;
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(bar, { ...pointer, clientX: startX + (dx * i) / steps, clientY: startY + (dy * i) / steps });
  }
  if (!options.hold) {
    fireEvent.pointerUp(bar, { ...pointer, clientX: startX + dx, clientY: startY + dy });
  }
}

export function release(bar: HTMLElement, x = 100, y = 100) {
  fireEvent.pointerUp(bar, { pointerId: 1, button: 0, clientX: x, clientY: y });
}

export function handle(bar: HTMLElement, side: 'start' | 'end'): Element {
  const el = bar.querySelector(`[data-handle="${side}"]`);
  if (!el) throw new Error(`handle ${side} not found`);
  return el;
}

export function toggleButton(taskId: string): HTMLElement {
  const row = document.querySelector<HTMLElement>(`[data-gantt="row"][data-task-id="${taskId}"]`);
  const button = row?.querySelector<HTMLElement>('[data-gantt="toggle"]');
  if (!button) throw new Error(`toggle for ${taskId} not found`);
  return button;
}

export { screen };
