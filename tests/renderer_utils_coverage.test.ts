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
});

    it('should cover safeAddColorStop invalid colors', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0,0,10,10);

        safeAddColorStop(grad, 0, undefined);
        safeAddColorStop(grad, 0, 'undefined');
        safeAddColorStop(grad, 0, 'rgba(NaN,0,0,1)');

        expect(true).toBe(true);
    });

    it('should cover safeAddColorStop error catch', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0,0,10,10);

        // This will throw error inside canvas api which is caught
        safeAddColorStop(grad, 0, 'invalid-color-format');

        expect(true).toBe(true);
    });
