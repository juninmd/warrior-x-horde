
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { createPlayerArmy, createEnemyHorde, createSoldier } from '../src/entities';
import { GameState, Entities, Gate, MysteryBox, MiniBoss, Boss } from '../src/types';
import { resetGameState, gameState } from '../src/gameState';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as game from '../src/game';

// Mock dependencies to avoid side effects
vi.mock('../src/renderer', () => ({
  addFloatingText: vi.fn(),
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  playSound: vi.fn(),
  audioManager: {
    powerUp: 'powerUp',
    nerf: 'nerf',
    gameOver: 'gameOver',
    victory: 'victory',
  },
}));

vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

describe('Collisions - Full Coverage', () => {
  let entities: Entities;
  const BASE_WIDTH = 480;
  const BASE_HEIGHT = 800;

  beforeEach(() => {
    resetGameState();
    gameState.isStarted = true;
    entities = {
      playerArmy: createPlayerArmy(BASE_WIDTH, BASE_HEIGHT),
      enemyHordes: [],
      gates: [],
      mysteryBoxes: [],
      bullets: [],
      particles: [],
      floatingTexts: [],
      miniBosses: [],
      boss: null,
      coins: []
    };

    // Position army at a known location for tests
    entities.playerArmy.centerX = 100;
    entities.playerArmy.centerY = 100;

    // Clear initial soldiers and add controlled ones
    entities.playerArmy.soldiers = [];
    entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 1));
  });

  describe('Gate Collisions', () => {
    const createGate = (type: Gate['type'], value: number): Gate => ({
      id: 1,
      x: 80, // Army is at 100, width approx 20-30 depending on soldiers
      y: 80,
      width: 100,
      height: 50,
      type,
      value,
      color: '#FFF',
      label: type,
      passed: false,
    });

    it('should handle ADD gate', () => {
      const gate = createGate('add', 5);
      entities.gates.push(gate);
      const initialCount = entities.playerArmy.soldiers.length;

      checkCollisions(entities, gameState);

      expect(gate.passed).toBe(true);
      expect(entities.playerArmy.soldiers.length).toBe(initialCount + 5);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('+5'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle MULTIPLY gate', () => {
      const gate = createGate('multiply', 3);
      entities.gates.push(gate);
      // Add more soldiers to verify multiply
      entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));
      const initialCount = entities.playerArmy.soldiers.length;

      checkCollisions(entities, gameState);

      expect(entities.playerArmy.soldiers.length).toBe(initialCount * 3);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('×3'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle SUBTRACT gate', () => {
      // Add enough soldiers first
      for(let i=0; i<10; i++) entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));
      const initialCount = entities.playerArmy.soldiers.length;

      const gate = createGate('subtract', 5);
      entities.gates.push(gate);

      checkCollisions(entities, gameState);

      expect(entities.playerArmy.soldiers.length).toBe(initialCount - 5);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('-5'), expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should handle DIVIDE gate', () => {
        // Add enough soldiers first: 10 total
        for(let i=0; i<9; i++) entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));
        const initialCount = entities.playerArmy.soldiers.length; // 10

        const gate = createGate('divide', 2);
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        // Divide by 2 removes 50%, so 5 remain
        expect(entities.playerArmy.soldiers.length).toBe(5);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('÷2'), expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should handle FIRERATE gate', () => {
        const gate = createGate('firerate', 0.8);
        entities.gates.push(gate);
        const initialRate = entities.playerArmy.fireRate;

        checkCollisions(entities, gameState);

        expect(entities.playerArmy.fireRate).toBe(initialRate * 0.8);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('Fire Rate UP!'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle DAMAGE gate', () => {
        const gate = createGate('damage', 2);
        entities.gates.push(gate);
        const initialDmg = entities.playerArmy.damage;

        checkCollisions(entities, gameState);

        expect(entities.playerArmy.damage).toBe(initialDmg * 2);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('DMG x2'), expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should handle SUPERWARRIOR gate', () => {
        const gate = createGate('superwarrior', 1);
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(entities.playerArmy.soldiers.some(s => s.isSuper)).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('SUPER WARRIOR'), expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should pass sibling gates', () => {
        const gate1 = createGate('add', 1);
        gate1.id = 1;
        const gate2 = createGate('multiply', 2);
        gate2.id = 2;
        gate2.y = gate1.y + 5; // Close enough Y

        entities.gates.push(gate1, gate2);

        checkCollisions(entities, gameState);

        expect(gate1.passed).toBe(true);
        expect(gate2.passed).toBe(true); // Should be marked passed even if not hit directly
    });
  });

  describe('Mystery Box Collisions', () => {
      const createBox = (): MysteryBox => ({
          x: 80,
          y: 80,
          width: 40,
          height: 40,
          type: 'mystery',
          hp: 10,
          passed: false,
          color: '#FFF'
      });

      // We need to mock Math.random to test specific effects
      const mockRandom = (val: number) => {
          vi.spyOn(Math, 'random').mockReturnValue(val);
      };

      it('should handle REINFORCEMENTS effect (index 0)', () => {
          const box = createBox();
          entities.mysteryBoxes.push(box);
          mockRandom(0.05); // 0.05 * 10 = 0.5 -> index 0

          checkCollisions(entities, gameState);

          expect(box.passed).toBe(true);
          expect(renderer.addFloatingText).toHaveBeenCalledWith('REINFORCEMENTS!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
      });

      it('should handle NUKE effect (index 1)', () => {
          const box = createBox();
          entities.mysteryBoxes.push(box);
          const horde = createEnemyHorde(100, 300, 10, 1);
          entities.enemyHordes.push(horde);

          mockRandom(0.15); // Index 1

          checkCollisions(entities, gameState);

          expect(horde.isActive).toBe(false);
          expect(renderer.addFloatingText).toHaveBeenCalledWith('NUKE!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
      });

      it('should handle BAZOOKA effect (index 4)', () => {
        const box = createBox();
        entities.mysteryBoxes.push(box);
        mockRandom(0.45); // Index 4

        checkCollisions(entities, gameState);

        expect(entities.playerArmy.soldiers.some(s => s.type === 'bazooka')).toBe(true);
      });

      it('should handle BAD effects (divide - index 7)', () => {
        for(let i=0; i<10; i++) entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));
        const box = createBox();
        entities.mysteryBoxes.push(box);
        mockRandom(0.75); // Index 7

        checkCollisions(entities, gameState);

        expect(renderer.addFloatingText).toHaveBeenCalledWith('DIVIDE & CONQUERED!', expect.any(Number), expect.any(Number), expect.any(String));
        expect(audio.playSound).toHaveBeenCalledWith('nerf');
      });
  });

  describe('Battle Collisions', () => {
      it('should fight Horde', () => {
          // Army is at 100,100. createEnemyHorde(width, y, ...) puts it at width/2.
          // So width=200 -> x=100.
          const horde = createEnemyHorde(200, 100, 5, 1);
          entities.enemyHordes.push(horde);

          checkCollisions(entities, gameState);

          expect(gameState.isBattling).toBe(true);
          // Soldiers should die on both sides
          // Just verify state changed
          expect(entities.playerArmy.soldiers.length).toBeLessThan(2); // Started with 1 + added none
      });

      it('should win Horde battle', () => {
          // Give army more power
          for(let i=0; i<20; i++) entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));
          const horde = createEnemyHorde(200, 100, 1, 1); // Weak horde, aligned with army at x=100
          entities.enemyHordes.push(horde);

          checkCollisions(entities, gameState);

          expect(horde.isActive).toBe(false);
          expect(renderer.addFloatingText).toHaveBeenCalledWith('VICTORY!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
      });

      it('should fight MiniBoss', () => {
          const mb: MiniBoss = {
              x: 80, y: 80, width: 40, height: 40, hp: 100, isActive: true, maxHp: 100, color: '#F00', type: 'miniboss', hitTimer: 0
          };
          entities.miniBosses.push(mb);
          entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));

          checkCollisions(entities, gameState);

          expect(gameState.isBattling).toBe(true);
          expect(mb.hp).toBeLessThan(100);
      });
  });

  describe('Boss Collisions', () => {
      it('should damage Boss on contact', () => {
          const boss: Boss = {
              x: 80, y: 80, width: 100, height: 100, hp: 1000, maxHp: 1000, isActive: true, type: 'tank', color: '#000', hitTimer: 0,
              spawnTime: 0, isMoving: false
          };
          entities.boss = boss;

          // Add soldiers
          for(let i=0; i<10; i++) entities.playerArmy.soldiers.push(createSoldier(100, 100, '#FFF', 0));

          checkCollisions(entities, gameState);

          expect(boss.hp).toBeLessThan(1000);
          expect(gameState.damageFlash).toBeGreaterThan(0);
      });
  });

  describe('Coin Collisions', () => {
      it('should collect Coin', () => {
          entities.coins.push({
              x: 100, y: 100, width: 20, height: 20, value: 10, passed: false, bounceOffset: 0, id: 1
          });

          checkCollisions(entities, gameState);

          expect(entities.coins[0].passed).toBe(true);
          expect(gameState.coins).toBe(10);
      });
  });

  describe('Bullet vs MysteryBox', () => {
     it('should destroy box with bullets', () => {
         const box: MysteryBox = {
             x: 200, y: 200, width: 40, height: 40, type: 'mystery', hp: 10, passed: false, color: '#FFF', hitTimer: 0
         };
         entities.mysteryBoxes.push(box);

         // Bullet hits box
         entities.bullets.push({
             x: 220, y: 220, targetX: 220, targetY: 300, speed: 10, damage: 100, isEnemy: false
         });

         checkCollisions(entities, gameState);

         expect(box.passed).toBe(true);
         expect(renderer.addFloatingText).toHaveBeenCalledWith('DESTROYED!', expect.any(Number), expect.any(Number), expect.any(String));
     });
  });

  describe('Game Over Condition', () => {
      it('should trigger game over if army is empty', () => {
          entities.playerArmy.soldiers = [];
          entities.playerArmy.aliveCount = 0;
          checkCollisions(entities, gameState);
          expect(gameState.isGameOver).toBe(true);
      });
  });
});
