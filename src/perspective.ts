// perspective.ts - One shared description of the road so logic, rendering and spawning agree.
// The road is a trapezoid from the horizon (narrow) to the bottom of the screen (wide).
// Entities live in flat "world" coordinates; they are *projected* horizontally toward the road
// center by perspScale(y) when drawn, so far-away hordes line up with the narrow road ahead.
import { BASE_WIDTH, BASE_HEIGHT } from './constants';

export const HORIZON_RATIO = 0.22;
export const HORIZON_Y = BASE_HEIGHT * HORIZON_RATIO;
export const CENTER_X = BASE_WIDTH / 2;
/** Road half-width at the horizon / at the bottom edge (matches the painted road). */
export const ROAD_TOP_HALF = BASE_WIDTH * 0.09;
export const ROAD_BOTTOM_HALF = BASE_WIDTH * 0.475;
/** Depth at which the player army stands: projection is the identity here (input maps 1:1). */
export const REF_Y = BASE_HEIGHT - 80;

/** Road half width at screen row y (clamped to [horizon, 1.15 x bottom]). */
export function roadHalfWidthAt(y: number): number {
  const t = Math.max(0, Math.min(1.15, (y - HORIZON_Y) / (BASE_HEIGHT - HORIZON_Y)));
  return ROAD_TOP_HALF + (ROAD_BOTTOM_HALF - ROAD_TOP_HALF) * t;
}

/** Visual scale at row y relative to the army row. */
export function perspScale(y: number, min = 0.3): number {
  const s = roadHalfWidthAt(y) / roadHalfWidthAt(REF_Y);
  return Math.max(min, Math.min(1.25, s));
}

/** Projects a world x to the screen x for an entity standing at row y. */
export function projectX(x: number, y: number, min = 0.3): number {
  return CENTER_X + (x - CENTER_X) * perspScale(y, min);
}

/** Road limits [minX, maxX] in WORLD coordinates for something at row y (margin keeps units on the asphalt). */
export function roadWorldBounds(y: number, margin = 20): { minX: number; maxX: number } {
  // world x spans what the road spans at the army row; projection does the rest
  const half = roadHalfWidthAt(Math.max(y, REF_Y)) - margin;
  return { minX: CENTER_X - half, maxX: CENTER_X + half };
}
