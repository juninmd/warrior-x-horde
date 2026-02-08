import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawMothershipBoss } from '../src/renderer-boss';
import { Boss } from '../src/types';

describe('Renderer Boss Coverage Gap', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;
  let boss: Boss;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;

    // Reset mocks on ctx
    vi.clearAllMocks();

    boss = {
      type: 'mothership',
      x: 400,
      y: 100,
      width: 200,
      height: 100,
      hp: 1000,
      maxHp: 1000,
      isActive: true,
      bullets: [],
      fireRate: 100,
      lastFireTime: 0,
      vx: 0,
      vy: 0
    };
  });

  it('should draw damage aura when HP < 50%', () => {
    boss.hp = 400; // 40%
    drawMothershipBoss(ctx, boss, 0);

    // Check if red aura is drawn (radius 120)
    expect(ctx.arc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 120, 0, Math.PI * 2);
  });

  it('should draw cannon fire when time aligns', () => {
    // Condition: Math.sin(time * 0.05) > 0.5
    // time = 32 -> 32 * 0.05 = 1.6 -> sin(1.6) ~ 1
    const time = 32;

    drawMothershipBoss(ctx, boss, time);

    // Radii 6 and 4 are used for cannon fire
    expect(ctx.arc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 6, 0, Math.PI * 2);
    expect(ctx.arc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 4, 0, Math.PI * 2);
  });

  it('should draw HP bar with orange color for medium HP (25-50%)', () => {
    boss.hp = 400; // 40%

    // Spy on addColorStop
    const addColorStop = vi.fn();
    ctx.createLinearGradient = vi.fn().mockReturnValue({ addColorStop });

    drawMothershipBoss(ctx, boss, 0);

    expect(addColorStop).toHaveBeenCalledWith(0, '#FFAA00');
    expect(addColorStop).toHaveBeenCalledWith(1, '#FF8800');
  });

  it('should draw HP bar with red color for low HP (< 25%)', () => {
    boss.hp = 200; // 20%

    const addColorStop = vi.fn();
    ctx.createLinearGradient = vi.fn().mockReturnValue({ addColorStop });

    drawMothershipBoss(ctx, boss, 0);

    expect(addColorStop).toHaveBeenCalledWith(0, '#FF4444');
    expect(addColorStop).toHaveBeenCalledWith(1, '#CC0000');
  });
});
