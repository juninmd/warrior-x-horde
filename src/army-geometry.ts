// army-geometry.ts - Pure helpers about the army formation (no imports: safe to use anywhere)

/** Approximate radius of the ring formation for `count` soldiers (matches updateSoldierFormation). */
export function armyRadius(count: number): number {
  if (!(count > 1)) return 10; // also covers NaN/undefined from partial test doubles
  const ring = Math.max(0, Math.ceil((-3 + Math.sqrt(9 + 12 * (count - 1))) / 6)); // rings hold 1,6,12,18...
  return 10 + ring * 4;
}
