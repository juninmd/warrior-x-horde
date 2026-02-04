
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawBullets, preRenderSprites, _resetSpriteCache } from '../src/renderer';
import { Bullet } from '../src/types';
import { BASE_HEIGHT } from '../src/constants';

// Mock game to prevent circular dependency / side effects during import
vi.mock('../src/game', () => ({
    // Empty mock
}));

// Mock input to prevent circular dependency via renderer-utils -> input -> game
vi.mock('../src/input', () => ({
    virtualJoystick: { draw: vi.fn() },
    setInputScale: vi.fn(),
    getMouseX: vi.fn(),
    initializeMousePosition: vi.fn(),
    resetInput: vi.fn(),
}));

describe('Renderer Culling', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    _resetSpriteCache();
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;
    vi.spyOn(ctx, 'drawImage');
  });

  it('should cull bullets outside viewport', () => {
    // Ensure sprites are ready so we hit the cached path
    preRenderSprites();

    const bullets: Bullet[] = [
      { x: 100, y: 100, dx: 0, dy: 0, damage: 1, isEnemy: false, speed: 10 }, // Visible
      { x: 100, y: -100, dx: 0, dy: 0, damage: 1, isEnemy: false, speed: 10 }, // Top (Culled)
      { x: 100, y: BASE_HEIGHT + 100, dx: 0, dy: 0, damage: 1, isEnemy: false, speed: 10 } // Bottom (Culled)
    ];

    drawBullets(ctx, bullets);

    // Should only draw the visible bullet
    // 1 call to drawImage (for the sprite)
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});
