// Setup mock before imports
import { vi } from 'vitest';
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
});

vi.stubGlobal('Audio', class {
  constructor(src?: string) {}
  play() { return Promise.resolve(); }
  pause() {}
  cloneNode() { return new globalThis.Audio(); }
});

import { describe, bench } from 'vitest';
import { checkCollisions } from './src/collisions';
import { GameState, Entities } from './src/types';

describe('checkCollisions performance', () => {
  const mockGameState = {
    isGameOver: false,
    isDying: false,
    isVictory: false,
    score: 0,
    coins: 0
  } as GameState;

  const mockEntities = {
    playerArmy: {
      lastShotTime: 0,
      fireRate: 50, // very fast to trigger every time
      aliveCount: 1,
      soldiers: [{ x: -1000, y: -1000, isAlive: true }], // away from things
      centerX: -1000,
      centerY: -1000,
      damage: 1,
    },
    enemyHordes: [],
    gates: [],
    coins: [],
    boss: null,
    miniBosses: [],
    mysteryBoxes: Array.from({ length: 50 }, (_, i) => ({
      passed: false,
      hp: 100,
      x: Math.random() * 500,
      y: Math.random() * 500,
      width: 50,
      height: 50
    })),
    bullets: Array.from({ length: 1000 }, (_, i) => ({
      isEnemy: false,
      damage: 1,
      x: Math.random() * 500,
      y: Math.random() * 500
    }))
  } as unknown as Entities;

  bench('mystery boxes vs bullets', () => {
    checkCollisions(mockEntities, mockGameState);
  });
});
