
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupInput, virtualJoystick, resetInput, vibrate, setGameStateRef } from '../src/input';
import { GameState } from '../src/types';

// Mock dependencies
vi.mock('../src/shooting', () => ({
  activateSuperCannon: vi.fn(),
}));

describe('Input Coverage', () => {
  let canvas: HTMLCanvasElement;
  let shootingMock: any;

  beforeEach(async () => {
    // Mock Touch global
    global.Touch = class {
        identifier: number;
        target: EventTarget;
        clientX: number;
        clientY: number;
        constructor(init: any) {
            this.identifier = init.identifier;
            this.target = init.target;
            this.clientX = init.clientX;
            this.clientY = init.clientY;
        }
    } as any;

    vi.restoreAllMocks();
    resetInput();
    canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 800;
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas);

    // Setup input
    setupInput(canvas);

    shootingMock = await import('../src/shooting');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle touch start', () => {
    const event = new TouchEvent('touchstart', {
      changedTouches: [
        new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })
      ]
    });

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 480, height: 800 })
    });

    canvas.dispatchEvent(event);

    expect(virtualJoystick.active).toBe(true);
    expect(virtualJoystick.startX).toBe(100);
  });

  it('should handle touch move', () => {
    // Start first
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    }));

    // Move
    const event = new TouchEvent('touchmove', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 150, clientY: 100 })]
    });

    canvas.dispatchEvent(event);

    expect(virtualJoystick.currentX).toBe(150);
  });

  it('should ignore touch move from other finger', () => {
    // Start finger 1
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    }));

    // Move finger 2
    const event = new TouchEvent('touchmove', {
      changedTouches: [new Touch({ identifier: 2, target: canvas, clientX: 150, clientY: 100 })]
    });

    canvas.dispatchEvent(event);

    expect(virtualJoystick.currentX).toBe(100); // Should stay at 100
  });

  it('should handle touch end', () => {
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    }));

    const event = new TouchEvent('touchend', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    });

    canvas.dispatchEvent(event);

    expect(virtualJoystick.active).toBe(false);
  });

  it('should handle touch cancel', () => {
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    }));

    const event = new TouchEvent('touchcancel', {
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: 100, clientY: 100 })]
    });

    canvas.dispatchEvent(event);

    expect(virtualJoystick.active).toBe(false);
  });

  it('should handle mouse events', () => {
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 480, height: 800 })
    });

    // Mousedown
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100 }));
    // Mousemove
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
    // Mouseup
    canvas.dispatchEvent(new MouseEvent('mouseup'));

    // We can't check internal mouseX easily unless exported,
    // but we can check if it didn't crash.
    // virtualJoystick is only for touch.
  });

  it('should handle keyboard events', () => {
    const gameState: GameState = { isGameOver: false, isStarted: true } as any;
    setGameStateRef(gameState);

    // Arrow Left
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    // Arrow Right
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  });

  it('should vibrate safely', () => {
    const vibrateSpy = vi.spyOn(navigator, 'vibrate');
    vibrate(100);
    expect(vibrateSpy).toHaveBeenCalledWith(100);
  });
});
