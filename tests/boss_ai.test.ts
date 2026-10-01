import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/game', () => ({ triggerScreenShake: vi.fn(), triggerHitStop: vi.fn() }));
vi.mock('../src/renderer', () => ({ addExplosion: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn() }));

import { getBossPhase, updateBossAttacks, resolveEnemyBullets, bossBulletDamage, getBossLore, BOSS_LORE } from '../src/boss-ai';
import { createBoss, createInitialEntities } from '../src/entities';
import { gameState, resetGameState } from '../src/gameState';
import { triggerScreenShake } from '../src/game';
import { createSoldier } from '../src/entities';
import type { Boss, Entities } from '../src/types';

function setup(level = 1): { entities: Entities; boss: Boss } {
  resetGameState();
  gameState.currentLevel = level;
  const entities = createInitialEntities(480, 800);
  const boss = createBoss(480, level);
  boss.y = 60; // on screen
  entities.boss = boss;
  return { entities, boss };
}

describe('boss lore', () => {
  it('has a name, title and taunt for every boss type', () => {
    for (const type of Object.keys(BOSS_LORE) as Boss['type'][]) {
      const l = getBossLore(type);
      expect(l.name.length).toBeGreaterThan(2);
      expect(l.title).toBeTruthy();
      expect(l.taunt).toBeTruthy();
    }
  });
  it('falls back for unknown types', () => {
    expect(getBossLore('???' as Boss['type']).name).toBe(BOSS_LORE.normal.name);
  });
});

describe('boss phases', () => {
  it('maps hp ratio to phases 1-3', () => {
    const { boss } = setup();
    boss.hp = boss.maxHp; expect(getBossPhase(boss)).toBe(1);
    boss.hp = boss.maxHp * 0.5; expect(getBossPhase(boss)).toBe(2);
    boss.hp = boss.maxHp * 0.1; expect(getBossPhase(boss)).toBe(3);
    boss.maxHp = 0; expect(getBossPhase(boss)).toBe(1);
  });
  it('scales projectile damage with level up to 3', () => {
    expect(bossBulletDamage(1)).toBe(1);
    expect(bossBulletDamage(4)).toBe(2);
    expect(bossBulletDamage(99)).toBe(3);
  });
});

describe('boss attacks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not attack while entering the screen or when no boss', () => {
    const { entities, boss } = setup();
    boss.y = -150;
    for (let i = 0; i < 600; i++) updateBossAttacks(entities, gameState, 1);
    expect(entities.bullets.length).toBe(0);
    entities.boss = null;
    expect(() => updateBossAttacks(entities, gameState, 1)).not.toThrow();
  });

  it('telegraphs first, then fires an aimed volley of 3 enemy bullets', () => {
    const { entities, boss } = setup();
    let sawTelegraph = false;
    for (let i = 0; i < 400 && entities.bullets.length === 0; i++) {
      updateBossAttacks(entities, gameState, 1);
      if ((boss.telegraph ?? 0) > 0) sawTelegraph = true;
    }
    expect(sawTelegraph).toBe(true);
    expect(entities.bullets.length).toBe(3);
    expect(entities.bullets.every(b => b.isEnemy && b.speed > 0)).toBe(true);
  });

  it('announces phase changes and fires bigger patterns later', () => {
    const { entities, boss } = setup(10);
    boss.type = 'mothership';
    updateBossAttacks(entities, gameState, 1);
    boss.hp = boss.maxHp * 0.2; // phase 3
    updateBossAttacks(entities, gameState, 1);
    expect(boss.phase).toBe(3);
    expect(triggerScreenShake).toHaveBeenCalled();
    const counts = new Set<number>();
    for (let round = 0; round < 40; round++) {
      entities.bullets.length = 0;
      for (let i = 0; i < 400 && entities.bullets.length === 0; i++) updateBossAttacks(entities, gameState, 1);
      counts.add(entities.bullets.length);
    }
    // aimed=3, fan=9, rain=11 in phase 3
    expect([...counts].some(c => c > 3)).toBe(true);
  });

  it('stays quiet when the game is over or dying', () => {
    const { entities } = setup();
    gameState.isGameOver = true;
    for (let i = 0; i < 500; i++) updateBossAttacks(entities, gameState, 1);
    expect(entities.bullets.length).toBe(0);
  });
});

describe('enemy bullets', () => {
  it('kill soldiers on hit and are consumed', () => {
    const { entities } = setup(8); // damage 3
    const army = entities.playerArmy;
    const before = army.aliveCount;
    const s = army.soldiers[0];
    entities.bullets.push({ x: s.x, y: s.y, targetX: 0, targetY: 0, speed: 3, damage: 3, isEnemy: true, vx: 0 });
    const killed = resolveEnemyBullets(entities, gameState);
    expect(killed).toBe(3);
    expect(army.aliveCount).toBe(before - 3);
    expect(entities.bullets.length).toBe(0);
    expect(gameState.damageFlash).toBeGreaterThan(0);
  });

  it('miss when far away and ignore player bullets', () => {
    const { entities } = setup();
    entities.bullets.push({ x: 5, y: 5, targetX: 0, targetY: 0, speed: 3, damage: 1, isEnemy: true, vx: 0 });
    const s = entities.playerArmy.soldiers[0];
    entities.bullets.push({ x: s.x, y: s.y, targetX: 0, targetY: 0, speed: -12, damage: 1, isEnemy: false });
    expect(resolveEnemyBullets(entities, gameState)).toBe(0);
    expect(entities.bullets.length).toBe(2);
  });

  it('does nothing after game over', () => {
    const { entities } = setup();
    gameState.isGameOver = true;
    expect(resolveEnemyBullets(entities, gameState)).toBe(0);
  });

  it('can wipe out a tiny army (aliveCount reaches 0)', () => {
    const { entities } = setup(10);
    const army = entities.playerArmy;
    army.soldiers.length = 0;
    army.soldiers.push(createSoldier(240, 700, '#4A90D9'));
    army.aliveCount = 1;
    entities.bullets.push({ x: 240, y: 700, targetX: 0, targetY: 0, speed: 3, damage: 3, isEnemy: true, vx: 0 });
    resolveEnemyBullets(entities, gameState);
    expect(army.aliveCount).toBe(0);
  });
});
