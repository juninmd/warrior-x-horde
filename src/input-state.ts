// input-state.ts - Shared state for input to avoid circular dependencies

export class VirtualJoystick {
  active: boolean = false;
  alpha: number = 0;
  startX: number = 0;
  startY: number = 0;
  currentX: number = 0;
  currentY: number = 0;
  maxRadius: number = 50;
  deadZone: number = 5;

  start(x: number, y: number) {
    this.active = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;
  }

  move(x: number, y: number) {
    if (!this.active) return;
    this.currentX = x;
    this.currentY = y;
  }

  end() {
    this.active = false;
  }

  getDeltaX(): number {
    if (!this.active) return 0;
    const dx = this.currentX - this.startX;
    if (Math.abs(dx) < this.deadZone) return 0;
    return dx;
  }
}

export const virtualJoystick = new VirtualJoystick();

// Scale management
let currentScale = 1;

export function setInputScale(scale: number): void {
  currentScale = scale;
}

export function getCurrentScale(): number {
  return currentScale;
}
