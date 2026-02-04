import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupInput, VirtualJoystick, getMouseX, setGameStateRef, virtualJoystick, setInputScale, vibrate, initializeMousePosition, resetInput, triggerHaptic } from '../src/input';
import { GameState } from '../src/types';

// Mock dependencies
vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
    canvas: { width: 480, height: 800, offsetLeft: 0, offsetTop: 0, clientWidth: 480, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0 }) }
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    toggleMute: vi.fn().mockReturnValue(true),
    audioManager: {}
}));

vi.mock('../src/shooting', () => ({
    activateSuperCannon: vi.fn(),
}));

import { activateSuperCannon } from '../src/shooting';

describe('Input', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        document.body.innerHTML = '<canvas id="gameCanvas"></canvas><button id="btn">Btn</button>';
        canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        // Mock getBoundingClientRect
        canvas.getBoundingClientRect = vi.fn(() => ({
            left: 0,
            top: 0,
            width: 480,
            height: 800,
            right: 480,
            bottom: 800,
            x: 0,
            y: 0,
            toJSON: () => {}
        }));

        resetInput();
        vi.clearAllMocks();
    });

    it('should setup input listeners', () => {
        setupInput(canvas);
        // We verify via event triggering
    });

    it('should update mouse position on mouse events', () => {
        setupInput(canvas);
        setInputScale(1);

        const mousedown = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
        canvas.dispatchEvent(mousedown);

        expect(getMouseX()).toBe(100);

        const mousemove = new MouseEvent('mousemove', { clientX: 200, clientY: 100 });
        canvas.dispatchEvent(mousemove);

        expect(getMouseX()).toBe(200);

        // Check mouseleave stops dragging
        const mouseleave = new MouseEvent('mouseleave');
        canvas.dispatchEvent(mouseleave);

        // Try to move after leaving
        const mousemove2 = new MouseEvent('mousemove', { clientX: 300, clientY: 100 });
        canvas.dispatchEvent(mousemove2);

        expect(getMouseX()).toBe(200); // Should not update

        const mouseup = new MouseEvent('mouseup');
        canvas.dispatchEvent(mouseup);
        // Dragging stops, but mouseX remains at last position
        expect(getMouseX()).toBe(200);
    });

    it('should handle touch events', () => {
        setupInput(canvas);
        setGameStateRef({ isGameOver: false } as any);
        setInputScale(1);

        const preventDefaultSpy = vi.fn();

        const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
        const touchObj = { clientX: 300, clientY: 500, identifier: 1 };
        // @ts-ignore
        touchStart.changedTouches = [touchObj];
        // @ts-ignore
        touchStart.touches = [touchObj];
        touchStart.preventDefault = preventDefaultSpy;

        Object.defineProperty(touchStart, 'target', { value: canvas });

        canvas.dispatchEvent(touchStart);

        // It should prevent default to avoid scroll, unless on button
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(virtualJoystick.active).toBe(true);
        expect(virtualJoystick.startX).toBe(300);

        // Touch move
        const touchMove = new Event('touchmove', { bubbles: true, cancelable: true });
        const touchMoveObj = { clientX: 350, clientY: 550, identifier: 1 };
        // @ts-ignore
        touchMove.changedTouches = [touchMoveObj];
        // @ts-ignore
        touchMove.touches = [touchMoveObj];

        const preventDefaultMove = vi.fn();
        touchMove.preventDefault = preventDefaultMove;

        canvas.dispatchEvent(touchMove);

        expect(preventDefaultMove).toHaveBeenCalled();
        expect(virtualJoystick.currentX).toBe(350);

        // Touch end
        const touchEnd = new Event('touchend');
        // @ts-ignore
        touchEnd.changedTouches = [{ clientX: 350, clientY: 550, identifier: 1 }];
        canvas.dispatchEvent(touchEnd);
        expect(virtualJoystick.active).toBe(false);
    });

    it('should not prevent default on button touch', () => {
        setupInput(canvas);
        setGameStateRef({ isGameOver: false } as any);

        const btn = document.getElementById('btn')!;
        const preventDefaultSpy = vi.fn();

        const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
        Object.defineProperty(touchStart, 'target', { value: btn });
        touchStart.preventDefault = preventDefaultSpy;
        // @ts-ignore
        touchStart.changedTouches = [];

        canvas.dispatchEvent(touchStart);

        expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should ignore other touches during drag', () => {
        setupInput(canvas);
        setGameStateRef({ isGameOver: false } as any);

        // Start drag with ID 1
        const touchStart1 = new Event('touchstart');
        // @ts-ignore
        touchStart1.changedTouches = [{ clientX: 100, clientY: 100, identifier: 1 }];
        canvas.dispatchEvent(touchStart1);

        expect(virtualJoystick.active).toBe(true);
        expect(virtualJoystick.startX).toBe(100);

        // Try start drag with ID 2
        const touchStart2 = new Event('touchstart');
        // @ts-ignore
        touchStart2.changedTouches = [{ clientX: 200, clientY: 200, identifier: 2 }];
        canvas.dispatchEvent(touchStart2);

        // Should still track 1
        expect(virtualJoystick.startX).toBe(100);
    });

    it('should handle touchcancel', () => {
        setupInput(canvas);

        // Start
        const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
        Object.defineProperty(touchStart, 'target', { value: canvas });
        // @ts-ignore
        touchStart.changedTouches = [{ clientX: 100, clientY: 100, identifier: 1 }];
        // @ts-ignore
        touchStart.touches = [{ clientX: 100, clientY: 100, identifier: 1 }];

        canvas.dispatchEvent(touchStart);
        expect(virtualJoystick.active).toBe(true);

        // Cancel
        const touchCancel = new Event('touchcancel', { bubbles: true });
        Object.defineProperty(touchCancel, 'target', { value: canvas });
        // @ts-ignore
        touchCancel.changedTouches = [{ clientX: 100, clientY: 100, identifier: 1 }];
        canvas.dispatchEvent(touchCancel);

        expect(virtualJoystick.active).toBe(false);
    });

    it('should handle virtual joystick class', () => {
        const vj = new VirtualJoystick();
        vj.start(10, 10);
        expect(vj.active).toBe(true);

        vj.move(20, 20);
        expect(vj.currentX).toBe(20);

        expect(vj.getDeltaX()).toBe(10); // 20 - 10 = 10

        // Deadzone check
        vj.move(12, 12);
        expect(vj.getDeltaX()).toBe(0); // 12 - 10 = 2 < 5

        vj.end();
        expect(vj.active).toBe(false);
        expect(vj.getDeltaX()).toBe(0);

        // getDeltaX when inactive
        expect(vj.getDeltaX()).toBe(0);
    });

    it('should handle keyboard events', () => {
        setupInput(canvas);
        initializeMousePosition(480);
        const initialX = getMouseX(); // 240

        // Left
        const keyLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        document.dispatchEvent(keyLeft);
        expect(getMouseX()).toBeLessThan(initialX);

        // Right
        const keyRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        document.dispatchEvent(keyRight);

        // A / D keys
        const keyA = new KeyboardEvent('keydown', { key: 'a' });
        document.dispatchEvent(keyA);

        const keyD = new KeyboardEvent('keydown', { key: 'd' });
        document.dispatchEvent(keyD);

        // Space for Super Cannon
        setGameStateRef({ isGameOver: false } as any);
        const keySpace = new KeyboardEvent('keydown', { key: ' ' });
        const preventDefaultSpy = vi.spyOn(keySpace, 'preventDefault');

        document.dispatchEvent(keySpace);

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(activateSuperCannon).toHaveBeenCalled();
    });

    it('should vibrate', () => {
        // Use existing mock
        vibrate(100);
        expect(navigator.vibrate).toHaveBeenCalledWith(100);
    });

    it('should trigger haptic pattern', () => {
        triggerHaptic('success');
        expect(navigator.vibrate).toHaveBeenCalledWith([40, 30, 40]);
    });
});
