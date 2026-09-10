import { DateTime } from 'luxon';
import type { GanttTask } from '@1bod/react-gantt';

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
