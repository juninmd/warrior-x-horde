// tests/visual_physics.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../src/input', () => ({
  virtualJoystick: { active: false, alpha: 0 }
}));
vi.mock('../src/renderer-boss', () => ({ drawBoss: vi.fn() }));
vi.mock('../src/renderer-utils', () => ({
  drawGlassBadge: vi.fn(), drawStar: vi.fn(), drawJoystick: vi.fn(), getComboColor: vi.fn()
}));
vi.mock('../src/quality', () => ({
  QualityManager: {
      getInstance: () => ({
          settings: { particleMultiplier: 1, enableShadows: true, simplifiedRendering: false, maxRenderedSoldiers: 100 },
          updateFPS: vi.fn(),
          checkRecovery: vi.fn()
      })
  }
}));

// Import AFTER mocks
import { addFloatingText, updateFloatingTexts, _testing } from '../src/renderer';

describe('Visual Physics (Floating Text)', () => {
  beforeEach(() => {
    // Clear array logic if needed?
    // Since we don't have a clear function exposed, we assume starting fresh or just look at last added.
    const texts = _testing.getFloatingTexts();
    texts.length = 0;
  });

  it('should initialize with velocity and gravity', () => {
    addFloatingText('100', 100, 100, '#FFF');
    const texts = _testing.getFloatingTexts();
    expect(texts.length).toBe(1);
    const ft = texts[0];

    expect(ft.vx).toBeDefined();
    expect(ft.vy).toBeLessThan(0); // Upward burst
    expect(ft.gravity).toBeGreaterThan(0);
  });

  it('should apply physics update', () => {
    addFloatingText('100', 100, 100, '#FFF');
    const texts = _testing.getFloatingTexts();
    const ft = texts[0];
    const initialY = ft.y;
    const initialVy = ft.vy;

    updateFloatingTexts();

    // Y should change by Vy
    expect(ft.y).toBe(initialY + initialVy);
    // Vy should increase by gravity
    expect(ft.vy).toBe(initialVy + ft.gravity);
  });
});
