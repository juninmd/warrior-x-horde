import { describe, it, expect, vi } from 'vitest';
import {
    spawnCoins,
    spawnMysteryBoxes,
    spawnGates,
    spawnEnemies,
    spawnMiniBoss,
    checkBossSpawn,
    updateSpawns
} from '../src/spawner';
import { GameState, Entities } from '../src/types';

describe('Spawner', () => {
  it('should spawn coins', () => {
    const entities: Entities = { coins: [] } as any;
    vi.spyOn(Math, 'random').mockReturnValue(0.0001);

    spawnCoins(entities, 500, {} as any, 1);

    expect(entities.coins.length).toBe(1);
    vi.restoreAllMocks();
  });

  it('should spawn mystery boxes', () => {
    const entities: Entities = { mysteryBoxes: [] } as any;
    vi.spyOn(Math, 'random').mockReturnValue(0.0001);

    spawnMysteryBoxes(entities, 500, {} as any, 1);

    expect(entities.mysteryBoxes.length).toBe(1);
    vi.restoreAllMocks();
  });

  it('should spawn gates', () => {
      const entities: Entities = {
          gates: [],
          playerArmy: { soldiers: [{ isAlive: true }] },
          enemyHordes: [] // Fixed: missing enemyHordes for getTotalEnemyCount
      } as any;
      const gameState: GameState = { currentLevel: 1 } as any;

      spawnGates(entities, 500, gameState);

      expect(entities.gates.length).toBeGreaterThan(0);
  });

  it('should spawn enemies', () => {
      const entities: Entities = {
          enemyHordes: [],
          playerArmy: { soldiers: [{ isAlive: true }] }
      } as any;
      const gameState: GameState = { currentLevel: 1 } as any;

      vi.spyOn(Math, 'random').mockReturnValue(0.0001);

      spawnEnemies(entities, 500, gameState, 800, 1);

      expect(entities.enemyHordes.length).toBeGreaterThan(0);
      vi.restoreAllMocks();
  });

  it('should spawn mini boss', () => {
      const entities: Entities = { miniBosses: [], boss: null } as any;
      const gameState: GameState = {
          levelDistance: 1000,
          distanceTraveled: 300,
          currentLevel: 1
      } as any;

      spawnMiniBoss(entities, 500, gameState, 800);

      expect(entities.miniBosses.length).toBeGreaterThan(0);
  });

  it('should check boss spawn', () => {
      const entities: Entities = { boss: null } as any;
      const gameState: GameState = {
          levelDistance: 1000,
          distanceTraveled: 950,
          currentLevel: 1
      } as any;

      checkBossSpawn(entities, 500, gameState, 800);

      expect(entities.boss).toBeDefined();
  });

  it('should update spawns (integration)', () => {
      const entities: Entities = {
          gates: [],
          enemyHordes: [],
          mysteryBoxes: [],
          coins: [],
          miniBosses: [],
          boss: null,
          playerArmy: { soldiers: [{ isAlive: true }] }
      } as any;
      const gameState: GameState = {
          currentLevel: 1,
          levelDistance: 1000,
          distanceTraveled: 0
      } as any;

      updateSpawns(entities, 500, gameState, 800, 1);

      expect(entities.gates.length).toBeGreaterThan(0);
  });

  it('should not update spawns if game over or victory', () => {
      const entities: Entities = { gates: [] } as any;
      const gameState: GameState = { isGameOver: true } as any;

      updateSpawns(entities, 500, gameState, 800, 1);

      expect(entities.gates.length).toBe(0);
  });
});
