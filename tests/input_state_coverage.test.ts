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

  it('should implement dynamic anchor logic if drag exceeds maxRadius', () => {
    const joystick = new VirtualJoystick();
    joystick.start(100, 100);
    // Drag far beyond maxRadius (50)
    joystick.move(100, 200);
    // dx=0, dy=100. Distance = 100. maxRadius = 50.
    // Angle = Math.atan2(100, 0) = PI/2
    // new startX = 100 - cos(PI/2)*50 = 100
    // new startY = 200 - sin(PI/2)*50 = 150
    expect(joystick.startX).toBe(100);
    expect(joystick.startY).toBe(150);
    expect(joystick.currentX).toBe(100);
    expect(joystick.currentY).toBe(200);
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

      // dx = 150 - 100 = 50
      // dy = 150 - 100 = 50
      // distance = sqrt(5000) = 70.7 > maxRadius(50)
      // angle = atan2(50, 50) = PI/4
      // startX = 150 - cos(PI/4)*50 = 150 - 35.355 = 114.644...
      // dx = 150 - 114.644 = 35.355...
      expect(joystick.getDeltaX()).toBeCloseTo(35.355, 2);

      // We should use values that don't trigger dynamic anchor to get exactly 50
      const joystick2 = new VirtualJoystick();
      joystick2.start(100, 100);
      joystick2.move(140, 100); // dx=40, dy=0. distance=40 <= 50.
      expect(joystick2.getDeltaX()).toBe(40);

      joystick2.move(102, 100); // dx=2 < deadZone(3) -> returns 0
      expect(joystick2.getDeltaX()).toBe(0);

      joystick2.end();
      expect(joystick2.getDeltaX()).toBe(0);
  });
});
