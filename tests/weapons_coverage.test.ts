import { describe, it, expect, vi, afterEach } from 'vitest';
import { createWeapon } from '../src/weapons';

describe('Weapons Coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should spawn weapon on the left side when random > 0.5', () => {
    // Math.random() > 0.5 -> 'left'
    vi.spyOn(Math, 'random').mockReturnValue(0.6);

    const canvasWidth = 1000;
    const weapon = createWeapon(canvasWidth, 100);

    expect(weapon.x).toBe(canvasWidth * 0.25);
  });

  it('should spawn weapon on the right side when random <= 0.5', () => {
    // Math.random() <= 0.5 -> 'right'
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    const canvasWidth = 1000;
    const weapon = createWeapon(canvasWidth, 100);

    expect(weapon.x).toBe(canvasWidth * 0.75);
  });
});
