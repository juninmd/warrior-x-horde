import { describe, it, expect, vi } from 'vitest';

// Mock dependencies to avoid side effects
vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
    canvas: { width: 480, height: 800 }
}));

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

import { drawGlassBadge, drawStar, drawJoystick, getComboColor } from '../src/renderer-utils';
import { COLORS } from '../src/constants';
import { virtualJoystick } from '../src/input-state';

describe('Renderer Utils', () => {
    it('should get combo color', () => {
        expect(getComboColor(2)).toBe(COLORS.UI.SUCCESS); // Green
        expect(getComboColor(3)).toBe(COLORS.UI.INFO); // Blue
        expect(getComboColor(5)).toBe(COLORS.EFFECTS.EXPLOSION); // Red
        expect(getComboColor(7)).toBe(COLORS.UI.GOLD); // Gold
        expect(getComboColor(10)).toBe('#FF00FF'); // Magenta
        expect(getComboColor(15)).toBe(COLORS.PLAYER.LASER); // Cyan
    });

    it('should draw glass badge', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            roundRect: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            textAlign: '',
            textBaseline: '',
        } as unknown as CanvasRenderingContext2D;

        drawGlassBadge(ctx, 10, 10, 100, 50, 'Test', '#FFF');
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalled();
    });

    it('should draw star', () => {
        const ctx = {
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        drawStar(ctx, 100, 100, 5, 20, 10);
        expect(ctx.lineTo).toHaveBeenCalled();
    });

    it('should draw joystick', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arc: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            closePath: vi.fn(),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        drawJoystick(ctx);
        // If joystick inactive, nothing happens.
        expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('should draw active joystick', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arc: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            closePath: vi.fn(),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        // Manually set active on the mock
        virtualJoystick.active = true;
        virtualJoystick.startX = 100;
        virtualJoystick.startY = 100;
        virtualJoystick.currentX = 120;
        virtualJoystick.currentY = 120;
        // Important: alpha must be > 0.01 to draw.
        // The drawJoystick function increases alpha if active.
        // alpha starts at 0. +0.2 = 0.2. 0.2 > 0.01. So it draws.

        drawJoystick(ctx);

        expect(ctx.beginPath).toHaveBeenCalled();
    });
});
