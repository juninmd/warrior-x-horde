// Setup mock before imports
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
} as unknown as Storage;

import { updateShooting } from './src/shooting';
import { GameState, Entities } from './src/types';

// Simple mock objects
const mockGameState = {
  isGameOver: false,
  isVictory: false,
} as GameState;

const mockEntities = {
  playerArmy: {
    lastShotTime: 0,
    fireRate: 50, // very fast to trigger every time
    aliveCount: 1000,
    soldiers: Array.from({ length: 1000 }, (_, i) => ({
      isAlive: true,
      type: 'normal',
      isSuper: false,
      x: 0,
      y: 0,
    })),
    centerX: 0,
    centerY: 0,
    damage: 1,
    scanIndex: 0
  },
  enemyHordes: Array.from({ length: 10 }, (_, i) => ({
    isActive: true,
    soldiers: [{ x: 0, y: i * 50 }], // at least 1
    x: 0,
    y: i * 50,
    width: 100,
    height: 100
  })),
  boss: null,
  miniBosses: [],
  bullets: []
} as unknown as Entities;

// Warmup
for (let i=0; i<100; i++) {
  updateShooting(mockEntities, mockGameState);
  mockEntities.playerArmy.lastShotTime = 0; // reset
  mockEntities.bullets = [];
}

const start = performance.now();
for (let i=0; i<10000; i++) {
  updateShooting(mockEntities, mockGameState);
  mockEntities.playerArmy.lastShotTime = 0; // reset
  mockEntities.bullets = [];
}
const end = performance.now();
console.log(`Duration: ${end - start}ms`);
