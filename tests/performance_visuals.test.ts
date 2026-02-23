import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderDecorationSprite, _resetSpriteCache, addParticle, _testing } from '../src/renderer';
import { drawJoystick } from '../src/renderer-utils';
import { virtualJoystick } from '../src/input-state';

// Mock OffscreenCanvas locally since setup.ts doesn't export the mock class
class OffscreenCanvasMock {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return document.createElement('canvas').getContext('2d');
  }
}

global.OffscreenCanvas = OffscreenCanvasMock as any;

describe('Performance & Visuals', () => {
  let ctx: any; // Use any to access mock properties
  let shadowBlurHistory: number[] = [];

  beforeEach(() => {
    // Get the mock context from setup.ts
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');

    // Spy on shadowBlur property to track changes
    shadowBlurHistory = [];
    let _shadowBlur = 0;
    Object.defineProperty(ctx, 'shadowBlur', {
        set: (v) => {
            _shadowBlur = v;
            shadowBlurHistory.push(v);
        },
        get: () => _shadowBlur,
        configurable: true
    });

    _resetSpriteCache();
    vi.clearAllMocks();
  });

  describe('Decoration Caching', () => {
    it('should create and cache decoration sprites', () => {
      const sprite1 = renderDecorationSprite('tree', '#00FF00');
      expect(sprite1).toBeDefined();
      expect(sprite1).toBeInstanceOf(OffscreenCanvasMock);

      // Second call should return same instance
      const sprite2 = renderDecorationSprite('tree', '#00FF00');
      expect(sprite2).toBe(sprite1);

      // Different params should return new instance
      const sprite3 = renderDecorationSprite('rock', '#888888');
      expect(sprite3).not.toBe(sprite1);
    });
  });

  describe('Joystick Visuals', () => {
    beforeEach(() => {
        virtualJoystick.active = true;
        virtualJoystick.startX = 100;
        virtualJoystick.startY = 100;
        virtualJoystick.maxRadius = 50;
        virtualJoystick.alpha = 1;
    });

    it('should render normal state when distance < maxRadius', () => {
      virtualJoystick.currentX = 120; // Distance 20
      virtualJoystick.currentY = 100;

      drawJoystick(ctx);

      // The last fillStyle set in drawJoystick is for the thumb stick
      // It should be white for normal state
      expect(ctx.fillStyle).toBe('#FFFFFF');

      // Check history for 15 (normal glow)
      expect(shadowBlurHistory).toContain(15);
      // Ensure it didn't use 25
      expect(shadowBlurHistory).not.toContain(25);
    });

    it('should render maxed state when distance >= maxRadius * 0.95', () => {
      virtualJoystick.currentX = 150; // Distance 50 (max)
      virtualJoystick.currentY = 100;

      drawJoystick(ctx);

       // Should use Gold color for inner fill when maxed
       expect(ctx.fillStyle).toBe('#FFD700');

      // Should have used 25 (high glow)
      expect(shadowBlurHistory).toContain(25);
    });
  });

  describe('Hitmarker Logic', () => {
      it('should add hitmarker particle', () => {
          const startCount = _testing.getParticles().length;
          addParticle(100, 100, 'hitmarker', '#FFF');
          const endCount = _testing.getParticles().length;

          expect(endCount).toBe(startCount + 1);
          const p = _testing.getParticles()[endCount - 1];
          expect(p.type).toBe('hitmarker');
      });
  });
});
