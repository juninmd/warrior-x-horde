import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { setupInput, getMouseX, initializeMousePosition } from '../src/input';

describe('Input Events', () => {
  let canvas: HTMLCanvasElement;
  let mockBoundingRect: DOMRect;

  beforeAll(() => {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 480;
    mockBoundingRect = { left: 0, width: 480 } as DOMRect;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(mockBoundingRect);
    document.body.appendChild(canvas);

    setupInput(canvas);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle mouse events', () => {
    // Initial position
    initializeMousePosition(480);
    expect(getMouseX()).toBe(240);

    // mousedown
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100 }));
    expect(getMouseX()).toBe(100);

    // mousemove (dragging)
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
    expect(getMouseX()).toBe(150);

    // mouseup
    canvas.dispatchEvent(new MouseEvent('mouseup'));

    // mousemove (not dragging)
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));
    expect(getMouseX()).toBe(150); // should not change
  });

  it('should handle keyboard events', () => {
    initializeMousePosition(480);

    // Default start is 240
    // step is 30

    // ArrowLeft
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(getMouseX()).toBe(210);

    // a
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(getMouseX()).toBe(180);

    // A
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
    expect(getMouseX()).toBe(150);

    // ArrowRight
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(getMouseX()).toBe(180);

    // d
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(getMouseX()).toBe(210);

    // D
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D' }));
    expect(getMouseX()).toBe(240);

    // Clamp
    for (let i=0; i<20; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    }
    expect(getMouseX()).toBeGreaterThanOrEqual(240);

    for (let i=0; i<40; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    }
    expect(getMouseX()).toBe(0);
  });
});
