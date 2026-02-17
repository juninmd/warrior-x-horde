import { describe, it, expect, vi } from 'vitest';
import { drawBoss } from '../src/renderer-boss';
import { Boss } from '../src/types';

describe('Renderer Boss', () => {
    it('should draw boss (normal)', () => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const boss: Boss = {
            type: 'beast',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            hp: 100,
            maxHp: 100,
            isActive: true,
            color: '#000',
            spawnTime: 0,
            isMoving: false,
            hitTimer: 0
        } as any;

        drawBoss(ctx, boss, 0);
        expect(ctx.fill).toHaveBeenCalled();
    });

    it('should draw boss (mothership)', () => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const boss: Boss = {
            type: 'mothership',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            hp: 100,
            maxHp: 100,
            isActive: true,
            color: '#000',
            spawnTime: 0,
            isMoving: false,
            hitTimer: 0
        } as any;

        drawBoss(ctx, boss, 0);
        expect(ctx.fill).toHaveBeenCalled();
    });
});
