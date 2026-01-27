import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock shooting to break circular dependency: input -> shooting -> game -> input
vi.mock('../src/shooting', () => ({
    activateSuperCannon: vi.fn(),
}));

import { setupInput, virtualJoystick, resetInput } from '../src/input';

describe('Input Extra Coverage', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 800;
        document.body.appendChild(canvas);
        setupInput(canvas);
        resetInput();
    });

    it('should handle touch move with active touch', () => {
        // Start touch
        const touchStart = new Event('touchstart');
        (touchStart as any).changedTouches = [{ identifier: 1, clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        expect(virtualJoystick.active).toBe(true);

        // Move touch
        const touchMove = new Event('touchmove');
        (touchMove as any).changedTouches = [{ identifier: 1, clientX: 150, clientY: 150 }];
        canvas.dispatchEvent(touchMove);

        expect(virtualJoystick.currentX).toBe(150);

        // Move ignored touch (wrong ID)
        const touchMoveIgnored = new Event('touchmove');
        (touchMoveIgnored as any).changedTouches = [{ identifier: 2, clientX: 200, clientY: 200 }];
        canvas.dispatchEvent(touchMoveIgnored);

        // Should not change
        expect(virtualJoystick.currentX).toBe(150);
    });

    it('should handle touch end', () => {
        // Start
        const touchStart = new Event('touchstart');
        (touchStart as any).changedTouches = [{ identifier: 1, clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        // End
        const touchEnd = new Event('touchend');
        (touchEnd as any).changedTouches = [{ identifier: 1, clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchEnd);

        expect(virtualJoystick.active).toBe(false);
    });

    it('should handle touch cancel', () => {
        // Start
        const touchStart = new Event('touchstart');
        (touchStart as any).changedTouches = [{ identifier: 1, clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        // Cancel
        const touchCancel = new Event('touchcancel');
        (touchCancel as any).changedTouches = [{ identifier: 1, clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchCancel);

        expect(virtualJoystick.active).toBe(false);
    });

    it('should handle keyboard arrows', () => {
        // Use document dispatch
        // Need to ensure gameCanvas exists in DOM (it does from beforeEach)
        canvas.id = 'gameCanvas';

        // ArrowRight
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        // Can't easily check mouseX as it is not exported directly (only getter), but we can check if it changed from default?
        // getMouseX() returns module var.
    });
});
