export interface LaneItem {
  id: string;
  start: number;
  end: number;
}

export interface LaneLayout {
  /** Lane index of each item, 0 being the top lane. */
  lanes: Map<string, number>;
  /** Number of lanes used, at least 1 (an empty row still has one lane). */
  count: number;
}

/**
 * Greedy interval packing: items are visited by start then id (stable whatever the input
 * order) and each one takes the first lane that is free at its start. Touching items
 * (one ends exactly when the next starts) share a lane.
 */
export function packLanes(items: readonly LaneItem[]): LaneLayout {
  const sorted = items.slice().sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    lanes.set(item.id, lane);
  }
  return { lanes, count: Math.max(1, laneEnds.length) };
}
