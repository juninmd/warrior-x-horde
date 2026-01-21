import { describe, it, expect } from 'vitest';
import {
    updateMovement,
    updateSoldierFormation,
    moveEntitiesDown,
    updateArmyPosition
} from '../src/movement';
import { Army, GameState, Entities, Soldier, Boss, EnemyHorde, Gate, MysteryBox, Coin, MiniBoss } from '../src/types';

describe('Movement', () => {
  it('should update soldier formation targets', () => {
    const army: Army = {
      soldiers: [
        { x: 0, y: 0, targetX: 0, targetY: 0, isAlive: true }
      ],
      centerX: 100,
      centerY: 100
    } as any;

    updateSoldierFormation(army, 1);

    const s = army.soldiers[0];
    expect(s.targetX).not.toBe(0);
    expect(s.targetY).not.toBe(0);
  });

  it('should update army position', () => {
      const army: Army = {
          soldiers: [],
          centerX: 100,
          centerY: 100,
          targetX: 100
      } as any;

      // Move target to 200
      updateArmyPosition(army, 200, 500, 1);

      expect(army.centerX).toBeGreaterThan(100);
      expect(army.targetX).toBe(200);
  });

  it('should move entities down', () => {
      const entities: Entities = {
          gates: [{ y: 0 }],
          enemyHordes: [],
          mysteryBoxes: [{ y: 0, passed: false }],
          coins: [{ y: 0, passed: false }],
          miniBosses: [],
          boss: { isActive: false },
          playerArmy: { centerX: 250, centerY: 700 }
      } as any;

      const gameState: GameState = {
          gameSpeed: 5,
          currentLevel: 1,
          isGameOver: false,
          isPaused: false,
          distanceTraveled: 0
      } as any;

      moveEntitiesDown(entities, gameState, 1);

      expect(entities.gates[0].y).toBeGreaterThan(0);
      expect(entities.mysteryBoxes[0].y).toBeGreaterThan(0);
      expect(entities.coins[0].y).toBeGreaterThan(0);
      expect(gameState.distanceTraveled).toBeGreaterThan(0);
  });

  it('should move enemy hordes and update their formation', () => {
      const horde: EnemyHorde = {
          y: 0,
          x: 250,
          isActive: true,
          soldiers: [
              { x: 250, y: 0, targetX: 250, targetY: 0, isAlive: true }
          ]
      } as any;

      const entities: Entities = {
          gates: [],
          enemyHordes: [horde],
          mysteryBoxes: [],
          coins: [],
          miniBosses: [],
          boss: null,
          playerArmy: { centerX: 250, centerY: 700 }
      } as any;

      moveEntitiesDown(entities, { gameSpeed: 5, currentLevel: 1 } as any, 1);

      expect(horde.y).toBeGreaterThan(0);
      expect(horde.soldiers[0].y).toBeGreaterThan(0);
  });

  it('should move boss (mothership)', () => {
      const boss: Boss = {
          y: 25,
          x: 250,
          isActive: true,
          type: 'mothership',
          vx: 0,
          vy: 0,
          width: 90
      } as any;

      const entities: Entities = {
          gates: [],
          enemyHordes: [],
          mysteryBoxes: [],
          coins: [],
          miniBosses: [],
          boss: boss,
          playerArmy: { centerX: 250, centerY: 700 }
      } as any;

      moveEntitiesDown(entities, { gameSpeed: 5, currentLevel: 10 } as any, 1);

      // Mothership moves slightly
      // It initializes vx/vy randomly if 0? No, if undefined.
      // But vx/vy is 0 here.
      // Logic: if (boss.vx === undefined) ...
      // So let's pass undefined to trigger init logic
      boss.vx = undefined;
      boss.vy = undefined;

      moveEntitiesDown(entities, { gameSpeed: 5, currentLevel: 10 } as any, 1);

      expect(boss.vx).toBeDefined();
      expect(boss.vy).toBeDefined();
  });

  it('should move mini bosses', () => {
      const mb: MiniBoss = {
          y: 100,
          x: 250,
          isActive: true,
          width: 80
      } as any;

      const entities: Entities = {
          gates: [],
          enemyHordes: [],
          mysteryBoxes: [],
          coins: [],
          miniBosses: [mb],
          boss: null,
          playerArmy: { centerX: 250, centerY: 700 }
      } as any;

      moveEntitiesDown(entities, { gameSpeed: 5, currentLevel: 1 } as any, 1);

      expect(mb.y).toBeGreaterThan(100);
  });

  it('should not move if paused or game over', () => {
      const entities: Entities = { gates: [{ y: 0 }] } as any;

      moveEntitiesDown(entities, { isPaused: true } as any, 1);
      expect(entities.gates[0].y).toBe(0);

      moveEntitiesDown(entities, { isGameOver: true } as any, 1);
      expect(entities.gates[0].y).toBe(0);
  });
});
