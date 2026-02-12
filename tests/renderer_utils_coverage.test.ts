import { describe, it, expect, vi } from 'vitest';
import { drawJoystick } from '../src/renderer-utils';
import { virtualJoystick } from '../src/input-state';

describe('Renderer Utils Coverage', () => {
  it('should draw joystick when active and hit pulse logic', () => {
    // Mock canvas context
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      setLineDash: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: '',
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
    } as any;

    // Set joystick to active
    virtualJoystick.start(100, 100);
    virtualJoystick.move(150, 150);

    // This should hit the 'if (virtualJoystick.active)' block including line 80
    drawJoystick(ctx);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();

    // Reset
    virtualJoystick.end();
  });

  it('should draw joystick when fading out', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      setLineDash: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: '',
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
    } as any;

    virtualJoystick.active = false;
    virtualJoystick.alpha = 0.5; // visible but fading

    drawJoystick(ctx);

    expect(ctx.save).toHaveBeenCalled();
  });
});
