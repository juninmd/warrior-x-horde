import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/game', () => ({ triggerScreenShake: vi.fn(), triggerHitStop: vi.fn() }));
vi.mock('../src/renderer', () => ({ addExplosion: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn(), addTrail: vi.fn() }));
vi.mock('../src/audio', () => ({ audioManager: new Proxy({}, { get: () => ({}) }), playSound: vi.fn(), playMusic: vi.fn() }));
vi.mock('../src/input', () => ({ triggerHaptic: vi.fn(), vibrate: vi.fn() }));

import { createInitialEntities, addSoldiersToArmy, multiplySoldiersInArmy, createEnemyHorde, createBoss, createMiniBoss, createGate } from '../src/entities';
import { updateMovement, updateArmyPosition } from '../src/movement';
import { updateShooting, updateBullets } from '../src/shooting';
import { checkCollisions } from '../src/collisions';
import { defeatBoss, defeatMiniBoss, awardHordeClear, hordeClearCoins, bossCoins, comboMultiplier } from '../src/rewards';
import { armyRadius } from '../src/army-geometry';
import { gameState, resetGameState } from '../src/gameState';
import { resetPerks } from '../src/perks';
import type { Entities } from '../src/types';

const DT = 1000 / 60;

function fresh(level = 1): Entities {
  resetGameState(); resetPerks();
  gameState.isStarted = true; gameState.currentLevel = level; gameState.highScore = 0;
  return createInitialEntities(480, 800);
}

describe('army logic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('multiplier gates always recruit at least one soldier (x1.17 of 5 used to be a no-op)', () => {
    const e = fresh();
    const before = e.playerArmy.aliveCount; // 5
    multiplySoldiersInArmy(e.playerArmy, 1.17);
    expect(e.playerArmy.aliveCount).toBe(before + 1);
    expect(e.playerArmy.soldiers.length).toBe(e.playerArmy.aliveCount);
    multiplySoldiersInArmy(e.playerArmy, 2);
    expect(e.playerArmy.aliveCount).toBe((before + 1) * 2);
    multiplySoldiersInArmy(e.playerArmy, 1); // neutral multiplier recruits nobody
    expect(e.playerArmy.aliveCount).toBe((before + 1) * 2);
  });

  it('firepower grows monotonically with army size (it used to plateau at ~45 soldiers)', () => {
    const dps: number[] = [];
    for (const size of [5, 20, 60, 200, 800]) {
      const e = fresh();
      addSoldiersToArmy(e.playerArmy, size - e.playerArmy.aliveCount);
      const boss = createBoss(480, 1);
      boss.hp = boss.maxHp = 1e9; boss.y = 250; boss.x = 190;
      e.boss = boss;
      e.playerArmy.fireRate = 150;
      for (let f = 0; f < 600; f++) {
        vi.setSystemTime(new Date(1_700_000_000_000 + f * DT));
        updateShooting(e, gameState);
        updateBullets(e, gameState, 1);
        boss.y = 250;
      }
      dps.push(1e9 - boss.hp);
    }
    for (let i = 1; i < dps.length; i++) expect(dps[i], `size step ${i}: ${dps.join(',')}`).toBeGreaterThan(dps[i - 1]);
  });

  it('keeps big formations on screen', () => {
    const e = fresh();
    addSoldiersToArmy(e.playerArmy, 1500);
    for (let i = 0; i < 200; i++) updateArmyPosition(e.playerArmy, -500, 480, 1);
    const r = armyRadius(e.playerArmy.aliveCount);
    expect(r).toBeGreaterThan(60);
    expect(e.playerArmy.centerX).toBeGreaterThanOrEqual(50);
    expect(e.playerArmy.centerX - Math.min(r, 90)).toBeGreaterThan(-30);
    for (let i = 0; i < 200; i++) updateArmyPosition(e.playerArmy, 5000, 480, 1);
    expect(e.playerArmy.centerX).toBeLessThanOrEqual(430);
  });

  it('armyRadius is monotonic and tolerant of bad input', () => {
    expect(armyRadius(NaN as unknown as number)).toBe(10);
    expect(armyRadius(0)).toBe(10);
    let last = 0;
    for (const n of [1, 2, 7, 8, 19, 20, 100, 1000]) { const r = armyRadius(n); expect(r).toBeGreaterThanOrEqual(last); last = r; }
  });
});

describe('enemy army logic', () => {
  it('pooled horde hp is the sum of its members (tanks count 4x, runners 0.5x)', () => {
    const h = createEnemyHorde(480, 100, 120, 12);
    const sum = h.soldiers.reduce((a, s) => a + s.hp, 0);
    expect(h.hp).toBe(sum);
    expect(h.maxHp).toBe(sum);
    expect(sum).not.toBe(120 * (3 + Math.floor(11 * 0.6))); // differs from the naive count*hp when archetypes exist
  });

  it('bullets that wipe a horde pay the same as melee: kills, combo, coins', () => {
    const e = fresh(2);
    const h = createEnemyHorde(480, 300, 3, 2);
    h.soldiers.forEach(s => { s.hp = 1; s.x = 240; s.y = 300; });
    h.hp = h.maxHp = 3;
    h.x = 240; h.y = 300;
    e.enemyHordes.push(h);
    const coins0 = gameState.coins, combo0 = gameState.combo;
    for (let i = 0; i < 6; i++) {
      e.bullets.push({ x: 240, y: 300, targetX: 240, targetY: 0, speed: -1, damage: 5, isEnemy: false, vx: 0 });
      updateBullets(e, gameState, 1);
    }
    expect(h.isActive).toBe(false);
    expect(gameState.totalKills).toBe(3);                       // bullet kills used to count as 0
    expect(gameState.combo).toBe(combo0 + 1);                   // and never fed the combo
    expect(gameState.coins).toBeGreaterThanOrEqual(coins0 + 3 + hordeClearCoins(2));
  });

  it('melee clear and bullet clear award identical bonuses', () => {
    const mk = () => { const e = fresh(3); const h = createEnemyHorde(480, 300, 1, 3); e.enemyHordes.push(h); return { e, h }; };
    const a = mk(); awardHordeClear(a.h, gameState, 3);
    const sa = { score: gameState.score, coins: gameState.coins, combo: gameState.combo };
    const b = mk(); awardHordeClear(b.h, gameState, 3);
    expect({ score: gameState.score, coins: gameState.coins, combo: gameState.combo }).toEqual(sa);
  });
});

describe('collision logic', () => {
  it('army-horde melee trades 1:1 per frame and keeps counts consistent', () => {
    const e = fresh();
    addSoldiersToArmy(e.playerArmy, 25);
    const h = createEnemyHorde(480, e.playerArmy.centerY, 40, 1);
    h.x = e.playerArmy.centerX; h.y = e.playerArmy.centerY;
    h.soldiers.forEach(s => { s.x = h.x; s.y = h.y; });
    e.enemyHordes.push(h);
    const a0 = e.playerArmy.aliveCount, h0 = h.soldiers.length;
    checkCollisions(e, gameState);
    expect(e.playerArmy.aliveCount).toBe(a0 - 1);
    expect(h.soldiers.length).toBe(h0 - 1);
    expect(h.count).toBe(h.soldiers.length);
    expect(e.playerArmy.soldiers.length).toBe(e.playerArmy.aliveCount);
    expect(gameState.totalKills).toBe(1);
  });

  it('gates: effect applies once, partner gate is consumed, dodged bad gates grant a bonus', () => {
    const e = fresh();
    const army = e.playerArmy;
    const left = createGate(480, army.centerY - 20, 'left', 1, 5, 5); left.type = 'add'; left.value = 7;
    const right = createGate(480, army.centerY - 20, 'right', 1, 5, 5); right.type = 'subtract'; right.value = 2;
    left.x = 15; right.x = 255; left.width = right.width = 210;
    e.gates.push(left, right);
    army.centerX = 100; army.targetX = 100;
    army.soldiers.forEach(s => { s.x = 100; });
    const before = army.aliveCount;
    checkCollisions(e, gameState);
    expect(army.aliveCount).toBe(before + 7);
    expect(left.passed && right.passed).toBe(true);
    checkCollisions(e, gameState);
    expect(army.aliveCount).toBe(before + 7); // not applied twice

    const bad = createGate(480, army.centerY + 200, 'right', 1, 5, 5); bad.type = 'divide'; bad.value = 2;
    e.gates.push(bad);
    const score0 = gameState.score;
    checkCollisions(e, gameState);
    expect(bad.passed).toBe(true);
    expect(gameState.score).toBeGreaterThanOrEqual(score0 + 50);
  });

  it('gates never wipe the army (subtract/divide keep one soldier)', () => {
    const e = fresh();
    const army = e.playerArmy;
    const g = createGate(480, army.centerY - 10, 'left', 1, 5, 5); g.type = 'subtract'; g.value = 999; g.x = 0; g.width = 480;
    e.gates.push(g);
    checkCollisions(e, gameState);
    expect(army.aliveCount).toBe(1);
  });

  it('boss and mini-boss deaths are idempotent and pay once, from any source', () => {
    const e = fresh(4);
    const boss = createBoss(480, 4); e.boss = boss;
    expect(defeatBoss(boss, gameState, 4)).toBe(true);
    const snap = { s: gameState.score, c: gameState.coins, k: gameState.totalKills };
    expect(defeatBoss(boss, gameState, 4)).toBe(false);
    expect({ s: gameState.score, c: gameState.coins, k: gameState.totalKills }).toEqual(snap);
    expect(gameState.coins).toBe(bossCoins(4, false));
    expect(gameState.isVictory).toBe(true);

    const mb = createMiniBoss(480, 100, 4);
    expect(defeatMiniBoss(mb, gameState, 4)).toBe(true);
    expect(defeatMiniBoss(mb, gameState, 4)).toBe(false);
    expect(gameState.totalKills).toBe(snap.k + 1);
  });

  it('reward economy stays bounded and monotonic by chapter', () => {
    expect(hordeClearCoins(1)).toBeLessThan(hordeClearCoins(10));
    expect(hordeClearCoins(10)).toBeLessThanOrEqual(100);
    expect(bossCoins(1, false)).toBeLessThan(bossCoins(9, false));
    expect(bossCoins(10, true)).toBeGreaterThan(bossCoins(9, false));
    resetGameState(); gameState.combo = 1000;
    expect(comboMultiplier(gameState)).toBeLessThanOrEqual(3);
  });

  it('updateMovement keeps hordes inside the road polygon', () => {
    const e = fresh(3);
    for (let i = 0; i < 6; i++) { const h = createEnemyHorde(480, -50 - i * 90, 20, 3); e.enemyHordes.push(h); }
    for (let f = 0; f < 3000; f++) {
      updateMovement(e, gameState, 480, 240 + Math.sin(f / 50) * 150, 1);
      for (const h of e.enemyHordes) expect(h.x).toBeGreaterThan(-10), expect(h.x).toBeLessThan(490);
    }
  });
});
