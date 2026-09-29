import { safeAddColorStop } from '../src/renderer-utils';
import { describe, it, expect, vi } from 'vitest';

// Mock input-state to control joystick state
vi.mock('../src/input-state', () => ({
    virtualJoystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        maxRadius: 50,
        alpha: 0
    }
}));

import { drawJoystick } from '../src/renderer-utils';
import { virtualJoystick } from '../src/input-state';

describe('Renderer Utils Coverage', () => {
    it('should draw joystick when active and hit pulse logic', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            arc: vi.fn(), // Added arc
            globalAlpha: 0,
            strokeStyle: '',
            lineWidth: 0,
            fillStyle: '',
            shadowColor: '',
            shadowBlur: 0
        } as unknown as CanvasRenderingContext2D;

        virtualJoystick.active = true;
        virtualJoystick.startX = 100;
        virtualJoystick.startY = 100;
        virtualJoystick.currentX = 200; // Far away to trigger clamp
        virtualJoystick.currentY = 200;
        virtualJoystick.alpha = 0.5;

        drawJoystick(ctx);

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
        // Check clamp logic indirectly by ensuring it ran through
        expect(ctx.translate).toHaveBeenCalled();
    });

    it('should draw joystick when fading out', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            arc: vi.fn(), // Added arc
            globalAlpha: 0
        } as unknown as CanvasRenderingContext2D;

        virtualJoystick.active = false;
        virtualJoystick.alpha = 0.5; // Start with some alpha

        drawJoystick(ctx);

        expect(virtualJoystick.alpha).toBeLessThan(0.5);
        expect(ctx.save).toHaveBeenCalled();
    });


    it('should catch error when color is an object', async () => {
        const { safeAddColorStop } = await import('../src/renderer-utils');
        const gradient = {
            addColorStop: vi.fn()
        };
        gradient.addColorStop.mockImplementation((offset, color) => {
            if (color === 'throw') throw new Error('Invalid color');
        });

        safeAddColorStop(gradient, 0, 'throw');
        expect(gradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(0,0,0,0)');
    });
});

    it('should catch error in safeAddColorStop and execute fallback', async () => {
        const { safeAddColorStop } = await import('../src/renderer-utils');

        let shouldThrow = true;
        const gradient = {
            addColorStop: vi.fn().mockImplementation((offset, color) => {
                if (shouldThrow) {
                    shouldThrow = false;
                    throw new Error("Invalid gradient");
                }
            })
        };
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        safeAddColorStop(gradient as any, 0, '#FFF');

        expect(consoleSpy).toHaveBeenCalled();
        expect(gradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(0,0,0,0)');
        consoleSpy.mockRestore();
    });

    it('should handle invalid string color in safeAddColorStop', async () => {
        const { safeAddColorStop } = await import('../src/renderer-utils');
        const gradient = {
            addColorStop: vi.fn()
        };
        safeAddColorStop(gradient as any, 0, 'undefined');
        expect(gradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(0,0,0,0)');
    });
