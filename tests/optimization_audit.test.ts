import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bullet } from '../src/types';

// Mock game.ts to prevent side effects (resizeCanvas)
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
  canvas: { getContext: vi.fn() },
}));

// Mock input.ts to prevent side effects
vi.mock('../src/input', () => ({
  virtualJoystick: { active: false },
  vibrate: vi.fn(),
  triggerHaptic: vi.fn(),
}));

// Import after mocks
import * as renderer from '../src/renderer';
const { drawBullets, _resetSpriteCache, preRenderSprites } = renderer;

describe('Optimization Audit', () => {
  it('debug imports', () => {
    console.log('renderer keys:', Object.keys(renderer));
    expect(drawBullets).toBeDefined();
  });
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    _resetSpriteCache();
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      canvas: { width: 800, height: 600 },
    } as unknown as CanvasRenderingContext2D;
  });

  it('should use cached sprites for bullets instead of gradients', () => {
    const bullets: Bullet[] = [
      { x: 100, y: 100, targetX: 100, targetY: 0, speed: 10, damage: 1, isEnemy: false },
      { x: 200, y: 200, targetX: 200, targetY: 300, speed: 10, damage: 1, isEnemy: true },
    ];

    // First call initializes cache
    drawBullets(ctx, bullets);

    // Should have initialized cache
    // The first call might still use fallback depending on implementation details of preRenderSprites timing,
    // but in our implementation, we call preRenderSprites synchronously if not initialized.
    // preRenderSprites populates the cache.
    // So drawBullets should find the cache immediately.

    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.createRadialGradient).not.toHaveBeenCalled(); // Should use cache!
  });

  it('should initialize bullet cache keys', () => {
    // We can't access spriteCache directly as it is not exported,
    // but we can verify behavior.

    preRenderSprites(); // Force init

    const bullets: Bullet[] = [
      { x: 100, y: 100, targetX: 100, targetY: 0, speed: 10, damage: 1, isEnemy: false }
    ];

    drawBullets(ctx, bullets);

    expect(ctx.drawImage).toHaveBeenCalled();
  });
});
