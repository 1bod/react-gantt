import { DateTime } from 'luxon';
import type { ClosedRange, GanttLink, GanttResourceRow, GanttTask } from '@1bod/react-gantt';

/** Deterministic pseudo random generator so that the demo (and e2e tests) are stable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BASE = DateTime.fromISO('2026-01-05T08:00:00', { zone: 'Europe/Paris' });

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#dc2626'];

export interface DemoData {
  kind: 'dev' | 'design' | 'ops';
  /** Resources dataset: manufacturing order of the operation. */
  order?: string;
}

/** A small, hand written set that e2e tests rely on. Keep it stable. */
export function fixedTasks(): GanttTask<DemoData>[] {
  const t = (h: number) => BASE.plus({ hours: h });
  return [
    { id: 'spec', label: 'Spécification', start: t(0), end: t(4), color: '#2563eb', data: { kind: 'design' } },
    { id: 'design', label: 'Maquettes', start: t(5), end: t(9), color: '#db2777', data: { kind: 'design' } },
    {
      id: 'dev',
      label: 'Développement',
      start: t(8),
      end: t(30),
      color: '#16a34a',
      data: { kind: 'dev' },
      children: [
        { id: 'dev-api', label: 'API', start: t(8), end: t(16), color: '#16a34a', data: { kind: 'dev' } },
        { id: 'dev-ui', label: 'UI', start: t(14), end: t(24), color: '#15803d', data: { kind: 'dev' } },
        { id: 'dev-tests', label: 'Tests', start: t(24), end: t(30), color: '#166534', data: { kind: 'dev' } },
      ],
    },
    {
      id: 'ops',
      label: 'Mise en prod (inline)',
      start: t(30),
      end: t(40),
      parentMode: 'inline',
      data: { kind: 'ops' },
      children: [
        { id: 'ops-staging', label: 'Staging', start: t(30), end: t(33), color: '#f59e0b', data: { kind: 'ops' } },
        { id: 'ops-prod', label: 'Prod', start: t(36), end: t(38), color: '#dc2626', data: { kind: 'ops' } },
      ],
    },
    { id: 'review', label: 'Revue', start: t(40), end: t(44), color: '#7c3aed', data: { kind: 'design' } },
  ];
}

/** Thousands of generated rows to exercise virtualization. */
export function generateTasks(count: number, seed = 42): GanttTask<DemoData>[] {
  const rand = mulberry32(seed);
  const tasks: GanttTask<DemoData>[] = [];
  for (let i = 0; i < count; i++) {
    const startH = Math.floor(rand() * 24 * 30);
    const durH = 2 + Math.floor(rand() * 48);
    const color = COLORS[i % COLORS.length];
    const kind: DemoData['kind'] = i % 3 === 0 ? 'dev' : i % 3 === 1 ? 'design' : 'ops';
    const task: GanttTask<DemoData> = {
      id: `gen-${i}`,
      label: `Tâche ${i}`,
      start: BASE.plus({ hours: startH }),
      end: BASE.plus({ hours: startH + durH }),
      color,
      data: { kind },
    };
    if (i % 7 === 0) {
      const childCount = 2 + Math.floor(rand() * 3);
      task.children = Array.from({ length: childCount }, (_, j) => {
        const cs = startH + Math.floor(rand() * durH);
        return {
          id: `gen-${i}-${j}`,
          label: `Sous-tâche ${i}.${j}`,
          start: BASE.plus({ hours: cs }),
          end: BASE.plus({ hours: cs + 1 + Math.floor(rand() * 12) }),
          color,
          data: { kind },
        };
      });
      if (i % 14 === 0) task.parentMode = 'inline';
    }
    tasks.push(task);
  }
  return tasks;
}

/** Resources dataset: machines of a workshop. The e2e tests rely on it, keep it stable. */
export const RESOURCE_ROWS: GanttResourceRow<{ code: string }>[] = [
  { id: 'tour-1', label: 'Tour CNC 1', data: { code: 'TCN-01' } },
  { id: 'tour-2', label: 'Tour CNC 2', data: { code: 'TCN-02' } },
  { id: 'fraise', label: 'Fraiseuse 5 axes', data: { code: 'FR5-01' } },
  { id: 'presse', label: 'Presse plieuse', data: { code: 'PP-01' } },
  { id: 'peint', label: 'Cabine peinture', data: { code: 'CP-01' } },
  { id: 'ctrl', label: 'Contrôle qualité', data: { code: 'CQ-01' } },
  { id: 'maint', label: 'Maintenance (verrouillée)', data: { code: 'MNT' } },
];

const ORDER_COLORS: Record<string, string> = { 'OF-1042': '#2563eb', 'OF-1043': '#16a34a', 'OF-1044': '#db2777', 'OF-1045': '#7c3aed' };

/**
 * Operations of four manufacturing orders, one task per operation, placed on a machine.
 * OF-1042 and OF-1043 overlap on "Tour CNC 1" (two lanes).
 */
export function resourceTasks(): GanttTask<DemoData>[] {
  const t = (h: number) => BASE.plus({ hours: h });
  const op = (order: string, seq: number, name: string, rowId: string, from: number, to: number): GanttTask<DemoData> => ({
    id: `${order.toLowerCase().replace('-', '')}-${seq}`,
    label: `${order} · ${seq} ${name}`,
    start: t(from),
    end: t(to),
    rowId,
    color: ORDER_COLORS[order],
    data: { kind: 'ops', order },
  });
  return [
    op('OF-1042', 10, 'Tournage', 'tour-1', 0, 3),
    op('OF-1042', 20, 'Fraisage', 'fraise', 3, 6),
    op('OF-1042', 30, 'Contrôle', 'ctrl', 6, 7),
    op('OF-1043', 10, 'Tournage', 'tour-1', 2, 5),
    op('OF-1043', 20, 'Pliage', 'presse', 5, 8),
    op('OF-1043', 30, 'Peinture', 'peint', 9, 11),
    op('OF-1044', 10, 'Tournage', 'tour-2', 1, 4),
    op('OF-1044', 20, 'Fraisage', 'fraise', 7, 10),
    op('OF-1044', 30, 'Contrôle', 'ctrl', 24, 25),
    op('OF-1045', 10, 'Pliage', 'presse', 24, 27),
    op('OF-1045', 20, 'Peinture', 'peint', 28, 31),
    { id: 'revision', label: 'Révision annuelle', start: t(26), end: t(30), rowId: 'maint', color: '#64748b', data: { kind: 'ops' } },
  ];
}

export const RESOURCE_LINKS: GanttLink[] = [
  { id: 'l-1042-a', from: 'of1042-10', to: 'of1042-20' },
  { id: 'l-1042-b', from: 'of1042-20', to: 'of1042-30' },
  { id: 'l-1043-a', from: 'of1043-10', to: 'of1043-20' },
  { id: 'l-1043-b', from: 'of1043-20', to: 'of1043-30' },
  { id: 'l-1044-a', from: 'of1044-10', to: 'of1044-20' },
  { id: 'l-1044-b', from: 'of1044-20', to: 'of1044-30' },
  { id: 'l-1045-a', from: 'of1045-10', to: 'of1045-20' },
];

/** Every machine is closed at night (20:00 - 06:00); press and paint booth stop 20 min for lunch. */
export function resourceClosedRanges(row: { id: string }): ClosedRange[] {
  const day = (offset: number) => BASE.startOf('day').plus({ days: offset });
  const ranges: ClosedRange[] = [];
  for (let d = -1; d <= 3; d++) {
    ranges.push({ start: day(d).set({ hour: 20 }), end: day(d + 1).set({ hour: 6 }) });
    if (row.id === 'presse' || row.id === 'peint') ranges.push({ start: day(d).set({ hour: 12 }), end: day(d).set({ hour: 12, minute: 20 }) });
  }
  return ranges;
}
