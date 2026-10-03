import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawMothershipBoss, drawBoss } from '../src/renderer-boss';
import { Boss } from '../src/types';

describe('Mothership rendering', () => {
  let ctx: CanvasRenderingContext2D;
  let boss: Boss;

  beforeEach(() => {
    ctx = document.createElement('canvas').getContext('2d')!;
    vi.clearAllMocks();
    boss = { type: 'mothership', x: 300, y: 95, width: 90, height: 30, hp: 1000, maxHp: 1000, isActive: true, color: '#0f8', spawnTime: 0, isMoving: false } as Boss;
  });

  it('draws at the moving hitbox center (not a fixed screen center)', () => {
    drawMothershipBoss(ctx, boss, 1000);
    expect(ctx.translate).toHaveBeenCalledWith(300, expect.any(Number));
  });

  it('renders every state: charging, enraged, low hp, flash', () => {
    for (const patch of [
      { telegraph: 30, pattern: 'fan' as const },
      { phase: 3 },
      { hp: 100 },
      { hitTimer: 4 },
      { hp: 0 },
    ]) {
      expect(() => drawMothershipBoss(ctx, { ...boss, ...patch } as Boss, 5000)).not.toThrow();
    }
  });

  it('is dispatched by drawBoss and draws the shared telegraph-free path', () => {
    expect(() => drawBoss(ctx, boss, 1234)).not.toThrow();
  });
});
