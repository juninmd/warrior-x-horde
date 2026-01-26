import { describe, it, expect, vi } from 'vitest';

// Mock dependencies to avoid side effects
vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
    canvas: { width: 480, height: 800 }
}));

vi.mock('../src/input', () => ({
    virtualJoystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    }
}));

import { drawGlassBadge, drawStar, drawJoystick, getComboColor } from '../src/renderer-utils';
import { COLORS } from '../src/constants';
import { virtualJoystick } from '../src/input';

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
        const ctx = document.createElement('canvas').getContext('2d')!;
        drawGlassBadge(ctx, 10, 10, 100, 50, 'Test', '#FFF');
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalled();
    });

    it('should draw star', () => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        drawStar(ctx, 100, 100, 5, 20, 10);
        expect(ctx.lineTo).toHaveBeenCalled();
    });

    it('should draw joystick', () => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        drawJoystick(ctx);
        // If joystick inactive, nothing happens.
        expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('should draw active joystick', () => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        // Manually set active
        virtualJoystick.active = true;
        virtualJoystick.startX = 100;
        virtualJoystick.startY = 100;
        virtualJoystick.currentX = 120;
        virtualJoystick.currentY = 120;

        drawJoystick(ctx);

        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.arc).toHaveBeenCalled();
    });
});
