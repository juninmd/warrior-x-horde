import { describe, it, expect } from 'vitest';
import { roadHalfWidthAt, perspScale, projectX, roadWorldBounds, REF_Y, HORIZON_Y, ROAD_TOP_HALF, CENTER_X } from '../src/perspective';
import { createEnemyHorde } from '../src/entities';

describe('perspective', () => {
  it('road narrows toward the horizon', () => {
    expect(roadHalfWidthAt(HORIZON_Y)).toBeCloseTo(ROAD_TOP_HALF);
    expect(roadHalfWidthAt(-500)).toBeCloseTo(ROAD_TOP_HALF);
    expect(roadHalfWidthAt(700)).toBeGreaterThan(roadHalfWidthAt(300));
  });
  it('scale is 1 at the army row, clamped elsewhere', () => {
    expect(perspScale(REF_Y)).toBeCloseTo(1);
    expect(perspScale(HORIZON_Y)).toBeCloseTo(0.3);
    expect(perspScale(-100, 0.5)).toBe(0.5);
    expect(perspScale(5000)).toBe(1.25);
  });
  it('projectX is identity at the center and at the army row', () => {
    expect(projectX(CENTER_X, 100)).toBe(CENTER_X);
    expect(projectX(100, REF_Y)).toBeCloseTo(100);
    expect(projectX(40, 200)).toBeGreaterThan(40);
  });
  it('hordes spawn inside the road bounds', () => {
    for (let i = 0; i < 50; i++) {
      const h = createEnemyHorde(480, -50, 10, 1);
      const b = roadWorldBounds(h.y, 0);
      expect(h.x).toBeGreaterThanOrEqual(b.minX);
      expect(h.x).toBeLessThanOrEqual(b.maxX);
    }
  });
});
