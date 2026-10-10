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
export declare function packLanes(items: readonly LaneItem[]): LaneLayout;
