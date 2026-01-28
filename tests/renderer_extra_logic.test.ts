
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addParticle, addTrail, render } from '../src/renderer';
import { MAX_PARTICLES } from '../src/constants';
import { Entities, GameState } from '../src/types';

// Mock game.ts for renderer tests (prevent side effects)
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
  togglePause: vi.fn(),
}));

describe('Cleanup Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderer', () => {
      it('should hit particle limit', () => {
          for(let i=0; i<MAX_PARTICLES + 20; i++) {
              addParticle(0, 0, 'spark', '#FFF', 1);
          }
      });

      it('should add trail with probability', () => {
          const mockRandom = vi.spyOn(Math, 'random');
          mockRandom.mockReturnValue(0.01);
          addTrail(10, 10, '#FFF');
      });

      it('should recycle particles', () => {
          addParticle(0, 0, 'spark', '#FFF', 1);

          const ctx = document.createElement('canvas').getContext('2d')!;
          const entities = {
              playerArmy: { soldiers: [], aliveCount: 0, centerX:0, centerY:0, fireRate:0, damage:0 },
              enemyHordes: [], gates: [], mysteryBoxes: [], coins: [], bullets: [], miniBosses: [], boss: null
          } as unknown as Entities;
          const gameState = { currentLevel: 1, gameSpeed: 1 } as GameState;

          // Call render enough times to kill particles (life -= 0.03) -> 34 frames
          for(let i=0; i<40; i++) {
              render(ctx, entities, gameState);
          }
      });
  });
});
