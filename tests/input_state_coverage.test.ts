import { describe, it, expect } from 'vitest';
import { VirtualJoystick } from '../src/input-state';

describe('Input State Coverage', () => {
  it('should cover move method when active', () => {
    const joystick = new VirtualJoystick();
    joystick.start(100, 100);
    expect(joystick.active).toBe(true);

    // This hits line 22: this.currentX = x;
    joystick.move(150, 150);

    expect(joystick.currentX).toBe(150);
    expect(joystick.currentY).toBe(150);
  });

  it('should cover move method when inactive', () => {
    const joystick = new VirtualJoystick();
    joystick.active = false;
    joystick.move(150, 150);
    // Should return early
    expect(joystick.currentX).toBe(0); // Default
  });

  it('should cover getDeltaX', () => {
      const joystick = new VirtualJoystick();
      joystick.start(100, 100);
      joystick.move(150, 150);
      // delta = 50 > deadZone(5)
      expect(joystick.getDeltaX()).toBe(50);

      joystick.move(102, 100);
      // delta = 2 < deadZone(5) -> returns 0
      expect(joystick.getDeltaX()).toBe(0);

      joystick.end();
      expect(joystick.getDeltaX()).toBe(0);
  });
});
