import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { GameState, Entities, MiniBoss, EnemyHorde, Soldier, Boss, MysteryBox, Bullet, Gate } from '../src/types';
import * as renderer from '../src/renderer';
import * as utils from '../src/utils';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
  addFloatingText: vi.fn(),
  playSound: vi.fn(),
  audioManager: { powerUp: 'mock-sound', nerf: 'mock-sound' },
}));

vi.mock('../src/gameState', () => ({
  saveGameProgress: vi.fn(),
}));

vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

vi.mock('../src/input', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('../src/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkBounds: vi.fn(),
    getArmyBounds: vi.fn(() => ({ left: 0, right: 100, top: 0, bottom: 100 })), // Valid bounds
    getEntityBounds: vi.fn(() => ({ left: 0, right: 100, top: 0, bottom: 100 })), // Valid bounds
  };
});

describe('Collisions Coverage Gap', () => {
  let gameState: GameState;
  let entities: Entities;

  beforeEach(() => {
    vi.clearAllMocks();

    gameState = {
      score: 0,
      coins: 0,
      isBattling: false,
      isGameOver: false,
      isDying: false,
      damageFlash: 0,
      killStreak: 0,
      killStreakTimer: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      highScore: 0,
      level: 1,
      currentLevel: 1,
      slowMoTimer: 0,
      isVictory: false,
      whiteFlash: 0,
    } as GameState;

    entities = {
      playerArmy: {
        soldiers: [],
        aliveCount: 1,
        centerX: 100,
        centerY: 100,
        radius: 20,
        fireRate: 100,
        damage: 1,
      },
      enemyHordes: [],
      gates: [],
      bullets: [],
      particles: [],
      miniBosses: [],
      mysteryBoxes: [],
      coins: [],
      floatingTexts: [],
      explosions: [],
      boss: null,
    } as unknown as Entities;
  });

  it('should handle miniBoss collision when miniBoss.hp <= 0 but still active', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const miniBoss: MiniBoss = {
      id: 1, x: 100, y: 100, width: 50, height: 50, hp: 0, maxHp: 100, type: 'machine', isActive: true,
      bullets: [], fireRate: 100, lastFireTime: 0
    };
    entities.miniBosses.push(miniBoss);

    checkCollisions(entities, gameState);

    expect(miniBoss.isActive).toBe(false);
    expect(gameState.score).toBe(300);
  });

  it('should return early from miniBoss battle if player army is dead', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const miniBoss: MiniBoss = {
      id: 1, x: 100, y: 100, width: 50, height: 50, hp: 100, maxHp: 100, type: 'machine', isActive: true,
      bullets: [], fireRate: 100, lastFireTime: 0
    };
    entities.miniBosses.push(miniBoss);
    entities.playerArmy.aliveCount = 0;
    entities.playerArmy.soldiers = [];

    checkCollisions(entities, gameState);

    expect(miniBoss.isActive).toBe(true);
    expect(gameState.score).toBe(0);
  });

  it('should trigger combo milestones when clearing a horde', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const milestones = [
      { start: 4, expect: "GREAT!" },
      { start: 9, expect: "EPIC!" },
      { start: 19, expect: "LEGENDARY!" },
      { start: 49, expect: "UNSTOPPABLE!" }
    ];

    milestones.forEach(m => {
        vi.clearAllMocks();
        gameState.combo = m.start;
        const horde: EnemyHorde = {
            id: 1, x: 100, y: 100, width: 50, height: 50,
            soldiers: [], count: 0, isActive: true, formation: 'rect'
        };
        entities.enemyHordes = [horde];

        checkCollisions(entities, gameState);

        expect(renderer.addFloatingText).toHaveBeenCalledWith(m.expect, expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
    });
  });

  it('should trigger killstreak milestones during battle', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const playerSoldier: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    const enemySoldier: Soldier = { id: 2, x: 100, y: 100, isAlive: true, type: 'regular', hp: 1, maxHp: 10, damage: 1, speed: 1, vx:0, vy:0 };

    entities.playerArmy.soldiers = [playerSoldier];
    entities.playerArmy.aliveCount = 1;

    const milestones = [
        { start: 4, expect: "KILLING SPREE" },
        { start: 9, expect: "RAMPAGE!" },
        { start: 19, expect: "DOMINATING!" },
        { start: 49, expect: "UNSTOPPABLE!" },
        { start: 99, expect: "GODLIKE!" }
    ];

    milestones.forEach(m => {
        vi.clearAllMocks();
        gameState.killStreak = m.start;

        playerSoldier.isAlive = true;
        enemySoldier.isAlive = true;
        entities.playerArmy.aliveCount = 1;

        const horde: EnemyHorde = {
            id: 1, x: 100, y: 100, width: 50, height: 50,
            soldiers: [enemySoldier], count: 1, isActive: true, formation: 'rect'
        };
        entities.enemyHordes = [horde];

        checkCollisions(entities, gameState);

        expect(renderer.addFloatingText).toHaveBeenCalledWith(m.expect, expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
    });
  });

  it('should handle bullet vs mystery box interaction', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(false);

    const box: MysteryBox = {
        id: 1, x: 100, y: 100, width: 40, height: 40, hp: 10,
        type: 'weapon', passed: false, value: 0
    };
    entities.mysteryBoxes.push(box);

    const bullet: Bullet = {
        id: 1, x: 110, y: 110, vx: 0, vy: 0, damage: 10,
        isEnemy: false, speed: 10, active: true
    };
    entities.bullets.push(bullet);

    checkCollisions(entities, gameState);

    expect(box.hp).toBe(0);
    expect(box.passed).toBe(true);
    expect(bullet.y).toBe(-1000);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('DESTROYED!', expect.any(Number), expect.any(Number), expect.any(String));
  });

  it('should handle boss defeat', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const boss: Boss = {
        id: 1, x: 100, y: 100, width: 100, height: 100, hp: 5, maxHp: 100,
        type: 'mothership', isActive: true, bullets: [], fireRate: 100, lastFireTime: 0, vx: 0, vy: 0
    };
    entities.boss = boss;

    const playerSoldier: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    entities.playerArmy.soldiers = [playerSoldier];
    entities.playerArmy.aliveCount = 1;

    checkCollisions(entities, gameState);

    expect(boss.hp).toBeLessThanOrEqual(0);
    expect(boss.isActive).toBe(false);
    expect(gameState.isVictory).toBe(true);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('BOSS DEFEATED!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
  });

  it('should kill player soldiers during boss battle', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const boss: Boss = {
        id: 1, x: 100, y: 100, width: 100, height: 100, hp: 1000, maxHp: 1000,
        type: 'mothership', isActive: true, bullets: [], fireRate: 100, lastFireTime: 0, vx: 0, vy: 0
    };
    entities.boss = boss;

    const s1: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    const s2: Soldier = { id: 2, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    entities.playerArmy.soldiers = [s1, s2];
    entities.playerArmy.aliveCount = 2;

    checkCollisions(entities, gameState);

    expect(s1.isAlive).toBe(false);
    expect(s2.isAlive).toBe(false);
    expect(renderer.addExplosion).toHaveBeenCalledTimes(2);
  });

  it('should handle nuke effect branches', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.15);

    // Give soldiers so they survive the battle collision (caused by mock checkBounds=true)
    const createSoldiers = () => [{isAlive:true}, {isAlive:true}] as Soldier[];

    const h1 = { id: 1, isActive: false, y: 100, x: 100, width: 20, height: 20, soldiers: createSoldiers() } as EnemyHorde;
    const h2 = { id: 2, isActive: true, y: -10, x: 100, width: 20, height: 20, soldiers: createSoldiers() } as EnemyHorde;
    const h3 = { id: 3, isActive: true, y: 900, x: 100, width: 20, height: 20, soldiers: createSoldiers() } as EnemyHorde;
    const h4 = { id: 4, isActive: true, y: 400, x: 100, width: 20, height: 20, soldiers: createSoldiers() } as EnemyHorde;

    entities.enemyHordes = [h1, h2, h3, h4];

    const box: MysteryBox = { id: 1, x: 100, y: 100, width: 40, height: 40, passed: false, hp: 0, maxHp: 1, hitTimer: 0 };
    entities.mysteryBoxes = [box];

    vi.mocked(utils.checkBounds).mockReturnValue(true);

    checkCollisions(entities, gameState);

    expect(h1.isActive).toBe(false);
    expect(h2.isActive).toBe(true);
    expect(h3.isActive).toBe(true);
    expect(h4.isActive).toBe(false);
  });

  it('should not collide if bounds do not overlap (branch coverage)', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(false);

    entities.miniBosses.push({ isActive: true, x:0, y:0, width:10, height:10, hp:10, maxHp:10, type:'normal', bullets:[], fireRate:1, lastFireTime:0 } as MiniBoss);
    entities.enemyHordes.push({ isActive: true, x:0, y:0, width:10, height:10, soldiers:[], count:0, formation:'rect' } as EnemyHorde);

    checkCollisions(entities, gameState);

    expect(renderer.addFloatingText).not.toHaveBeenCalled();
  });

  it('should use default damage 1 if army damage is falsy', () => {
     vi.mocked(utils.checkBounds).mockReturnValue(true);

     entities.playerArmy.damage = 0; // Falsy
     entities.playerArmy.centerX = 100;

     // Align gate with army (centerX=100)
     const gate: Gate = {
         type: 'damage', value: 2,
         x: 90, y: 50, width: 20, height: 20,
         passed: false, id:1, side:'left', color:'red'
     };
     entities.gates.push(gate);

     // Bounds: top:0, bottom:100. Gate y=50. Overlap!

     checkCollisions(entities, gameState);

     // (0 || 1) * 2 = 2
     expect(entities.playerArmy.damage).toBe(2);
  });

  it('should not trigger milestones for non-milestone values (branch coverage)', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    // Combo 6 (5 -> 6)
    gameState.combo = 5;
    const horde: EnemyHorde = { id: 1, x: 0, y: 0, width: 20, height: 20, soldiers: [], count: 0, isActive: true, formation: 'rect' };
    entities.enemyHordes = [horde];

    checkCollisions(entities, gameState);

    // Should NOT call addFloatingText with milestone messages
    expect(renderer.addFloatingText).not.toHaveBeenCalledWith("GREAT!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

    // Killstreak 7 (6 -> 7)
    vi.clearAllMocks();
    gameState.killStreak = 6;
    entities.enemyHordes = [];
    const playerSoldier: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    const enemySoldier: Soldier = { id: 2, x: 100, y: 100, isAlive: true, type: 'regular', hp: 1, maxHp: 10, damage: 1, speed: 1, vx:0, vy:0 };
    entities.playerArmy.soldiers = [playerSoldier];
    entities.playerArmy.aliveCount = 1;
    const activeHorde: EnemyHorde = {
        id: 2, x: 100, y: 100, width: 50, height: 50,
        soldiers: [enemySoldier], count: 1, isActive: true, formation: 'rect'
    };
    entities.enemyHordes = [activeHorde];

    checkCollisions(entities, gameState);

    expect(gameState.killStreak).toBe(7);
    expect(renderer.addFloatingText).not.toHaveBeenCalledWith("KILLING SPREE", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });

  it('should kill player soldiers during miniboss battle', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const mb: MiniBoss = {
        id: 1, x: 100, y: 100, width: 50, height: 50, hp: 100, maxHp: 100,
        type: 'normal', isActive: true, bullets: [], fireRate: 100, lastFireTime: 0
    };
    entities.miniBosses = [mb];

    // 2 Soldiers, casualties=1
    const s1: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    const s2: Soldier = { id: 2, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 10, speed: 1, vx:0, vy:0 };
    entities.playerArmy.soldiers = [s1, s2];
    entities.playerArmy.aliveCount = 2;

    checkCollisions(entities, gameState);

    expect(s1.isAlive).toBe(true); // First one (index 0) survives
    expect(s2.isAlive).toBe(false); // Last one (index 1) dies
    expect(renderer.addExplosion).toHaveBeenCalledTimes(1);
  });

  it('should handle inconsistent state where aliveCount > 0 but no alive soldiers found (branch coverage)', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    const horde: EnemyHorde = {
        id: 1, x: 0, y: 0, width: 20, height: 20,
        soldiers: [{isAlive:true} as any], count: 1, isActive: true, formation: 'rect'
    };
    entities.enemyHordes = [horde];

    // Inconsistent player army
    entities.playerArmy.aliveCount = 1;
    entities.playerArmy.soldiers = [{isAlive:false, x:0, y:0} as any]; // Dead!

    checkCollisions(entities, gameState);

    // killed should be 0.
    // damageFlash not increased.
    expect(gameState.damageFlash).toBe(0);
  });

  it('should trigger milestones when clearing a horde via battle (block 2 coverage)', () => {
    vi.mocked(utils.checkBounds).mockReturnValue(true);

    // Combo 4 -> 5
    gameState.combo = 4;

    const enemySoldier: Soldier = { id: 2, x: 100, y: 100, isAlive: true, type: 'regular', hp: 1, maxHp: 10, damage: 1, speed: 1, vx:0, vy:0 };
    const horde: EnemyHorde = {
        id: 1, x: 100, y: 100, width: 50, height: 50,
        soldiers: [enemySoldier], count: 1, isActive: true, formation: 'rect'
    };
    entities.enemyHordes = [horde];

    const playerSoldier: Soldier = { id: 1, x: 100, y: 100, isAlive: true, type: 'regular', hp: 10, maxHp: 10, damage: 1, speed: 1, vx:0, vy:0 };
    entities.playerArmy.soldiers = [playerSoldier];
    entities.playerArmy.aliveCount = 1;

    checkCollisions(entities, gameState);

    expect(horde.isActive).toBe(false);
    expect(renderer.addFloatingText).toHaveBeenCalledWith("GREAT!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });
});
