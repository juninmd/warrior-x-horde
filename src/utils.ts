// utils.ts - Shared Helper Functions
import { Army, BoundingBox } from './types';
import { BIOMES } from './constants';

// --- Math & Color Utilities ---

/**
 * Darkens or lightens a hex color
 * @param color Hex color (e.g., "#FF0000")
 * @param percent Percentage to shade (-100 to 100). Positive lightens, negative darkens.
 */
export function shadeColor(color: string, percent: number): string {
  // Basic validation to avoid crashes
  if (!color || !color.startsWith('#') || color.length < 7) return color;

  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// --- Collision & Physics Utilities ---

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Calculates the bounding box of an army based on its soldiers.
 */
export function getArmyBounds(army: Army): Rect {
  if (army.soldiers.length === 0) {
    return { left: army.centerX, right: army.centerX, top: army.centerY, bottom: army.centerY };
  }

  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const soldier of army.soldiers) {
    if (soldier.isAlive) {
      left = Math.min(left, soldier.x - soldier.size);
      right = Math.max(right, soldier.x + soldier.size);
      top = Math.min(top, soldier.y - soldier.size);
      bottom = Math.max(bottom, soldier.y + soldier.size);
    }
  }
  return { left, right, top, bottom };
}

/**
 * Checks if two bounding boxes overlap.
 */
export function checkBounds(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Helper to create a rect from a center point and dimensions
 */
export function getEntityBounds(x: number, y: number, width: number, height: number): Rect {
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height
  };
}

/**
 * Helper to create a rect from center-based coordinates (like hordes often are treated)
 * IF x/y are center, use this. IF x/y are top-left, use getEntityBounds.
 * Based on codebase, many entities use top-left, but hordes seem center-ish or variable.
 * We will verify usage. For now, generic rect check is safest.
 */

// --- Biome Utilities ---

export function getBiomeColors(level: number): { sky: string[], ground: string[], road: string[], tree: string } {
  if (level >= BIOMES.ALIEN.minLevel) return BIOMES.ALIEN.colors;
  if (level >= BIOMES.HELL.minLevel) return BIOMES.HELL.colors;
  if (level >= BIOMES.WASTELAND.minLevel) return BIOMES.WASTELAND.colors;
  return BIOMES.GRASSLANDS.colors;
}
