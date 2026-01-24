import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupInput, VirtualJoystick, getMouseX, setGameStateRef, virtualJoystick } from '../src/input';
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

describe('Input', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        document.body.innerHTML = '<canvas id="gameCanvas"></canvas>';
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
    });

    it('should setup input listeners', () => {
        setupInput(canvas);
        // Verify listeners attached? Hard to verify addEventListener calls directly unless spied on prototype.
        // But we can trigger events.
    });

    it('should update mouse position on mouse events', () => {
        setupInput(canvas);

        const mousedown = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
        canvas.dispatchEvent(mousedown);

        expect(getMouseX()).toBe(100);

        const mousemove = new MouseEvent('mousemove', { clientX: 200, clientY: 100 });
        canvas.dispatchEvent(mousemove);

        expect(getMouseX()).toBe(200);

        const mouseup = new MouseEvent('mouseup');
        canvas.dispatchEvent(mouseup);
        // Dragging stops, but mouseX remains at last position
        expect(getMouseX()).toBe(200);
    });

    it('should handle touch events', () => {
        setupInput(canvas);
        setGameStateRef({ isGameOver: false } as any);

        const touchStart = new Event('touchstart');
        const touchObj = { clientX: 300, clientY: 500, identifier: 1 };
        // @ts-ignore
        touchStart.changedTouches = [touchObj];
        // @ts-ignore
        touchStart.touches = [touchObj];
        canvas.dispatchEvent(touchStart);

        // Touch sets touchStartX and armyStartX.
        // It also activates virtual joystick.
        expect(virtualJoystick.active).toBe(true);
        expect(virtualJoystick.startX).toBe(300);

        const touchMove = new Event('touchmove');
        const touchMoveObj = { clientX: 350, clientY: 550, identifier: 1 };
        // @ts-ignore
        touchMove.changedTouches = [touchMoveObj];
        // @ts-ignore
        touchMove.touches = [touchMoveObj]; // +50px
        canvas.dispatchEvent(touchMove);

        // Input logic calculates relative movement.
        expect(virtualJoystick.currentX).toBe(350);

        const touchEnd = new Event('touchend');
        // @ts-ignore
        touchEnd.changedTouches = [{ clientX: 350, clientY: 550, identifier: 1 }];
        canvas.dispatchEvent(touchEnd);
        expect(virtualJoystick.active).toBe(false);
    });

    it('should handle virtual joystick class', () => {
        const vj = new VirtualJoystick();
        vj.start(10, 10);
        expect(vj.active).toBe(true);

        vj.move(20, 20);
        expect(vj.currentX).toBe(20);

        expect(vj.getDeltaX()).toBe(10);

        vj.end();
        expect(vj.active).toBe(false);
        expect(vj.getDeltaX()).toBe(0);
    });

    it('should handle keyboard events', () => {
        setupInput(canvas);
        const initialX = getMouseX();

        const keyLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        document.dispatchEvent(keyLeft);

        expect(getMouseX()).toBeLessThan(initialX); // Should decrease or stay 0
    });
});
