import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateBullets } from '../src/shooting';
import { createMiniBoss, createBullet } from '../src/shooting'; // Wait, createBullet is in shooting, createMiniBoss in entities
import { createMiniBoss as makeMiniBoss } from '../src/entities';
import { GameState, Entities } from '../src/types';
import { resetGameState, gameState } from '../src/gameState';
import * as renderer from '../src/renderer';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  addFloatingText: vi.fn(),
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  playSound: vi.fn(),
  audioManager: {},
}));

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
}));

describe('Shooting Fix - MiniBoss Infinite Money', () => {
    let entities: Entities;

    beforeEach(() => {
        resetGameState();
        gameState.isStarted = true;
        entities = {
            bullets: [],
            miniBosses: [],
            enemyHordes: [],
            playerArmy: { soldiers: [], aliveCount: 0 } as any,
            gates: [],
            mysteryBoxes: [],
            coins: [],
            boss: null
        } as any;
    });

    it('should NOT award double coins if MiniBoss is killed by multiple bullets in same frame', () => {
        const mb = makeMiniBoss(480, 100, 1);
        mb.hp = 10; // Low HP
        mb.x = 100;
        mb.y = 100;
        mb.width = 50;
        mb.height = 50;
        entities.miniBosses.push(mb);

        // Two bullets hitting the mini boss
        const b1 = { x: 125, y: 125, speed: -10, damage: 10, isEnemy: false, targetX: 0, targetY: 0 };
        const b2 = { x: 125, y: 125, speed: -10, damage: 10, isEnemy: false, targetX: 0, targetY: 0 };
        entities.bullets.push(b1, b2);

        // Run update
        updateBullets(entities, gameState, 1.0);

        // Logic:
        // Bullet 1 hits. hp -> 0. isActive -> false. Score += 200.
        // Bullet 2 hits (grid has MB). hp -> -10.
        // IF BUGGY: isActive -> false (again). Score += 200 (Total 400).
        // IF FIXED: Check !isActive -> skip reward.

        expect(gameState.score).toBe(200); // Should be exactly 200
        expect(mb.isActive).toBe(false);
    });
});
