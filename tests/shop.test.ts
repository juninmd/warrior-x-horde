import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/game', () => ({ triggerScreenShake: vi.fn(), triggerHitStop: vi.fn() }));
vi.mock('../src/renderer', () => ({ addExplosion: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn() }));
vi.mock('../src/input', () => ({ triggerHaptic: vi.fn(), vibrate: vi.fn() }));

import { purchase, applyNuke } from '../src/shop';
import { SHOP_ITEMS, getItem, getPrice, resetShop, tickShop, cooldownLeft, blockedReason, timesBought } from '../src/shop-catalog';
import { createInitialEntities, createEnemyHorde, createBoss, createMiniBoss } from '../src/entities';
import { gameState, resetGameState } from '../src/gameState';
import { getShieldCharges, resetPerks, MAX_SHIELD_CHARGES } from '../src/perks';

function setup(level = 1, coins = 100000) {
  resetGameState(); resetPerks(); resetShop();
  gameState.currentLevel = level; gameState.coins = coins; gameState.isStarted = true;
  return createInitialEntities(480, 800);
}

describe('shop catalog & pricing', () => {
  beforeEach(() => resetShop());

  it('has six distinct items with prices, icons and explanations', () => {
    expect(SHOP_ITEMS).toHaveLength(6);
    expect(new Set(SHOP_ITEMS.map(i => i.id)).size).toBe(6);
    expect(SHOP_ITEMS[4].type).toBe('nuke');
    for (const i of SHOP_ITEMS) { expect(i.basePrice).toBeGreaterThan(0); expect(i.desc.length).toBeGreaterThan(15); expect(i.icon).toBeTruthy(); }
  });

  it('price rises with purchases (+12%) and chapters (+35%), rounded to 5', () => {
    const soldier = getItem('soldier')!;
    expect(getPrice(soldier, 1)).toBe(50);
    expect(getPrice(soldier, 5)).toBe(120); // 50 * 2.4
    expect(getPrice(soldier, 10)).toBeGreaterThan(getPrice(soldier, 5));
    expect(getPrice(soldier, NaN as unknown as number)).toBe(50); // partial states tolerated
    const e = setup(1);
    purchase('soldier', e, gameState);
    expect(timesBought('soldier')).toBe(1);
    expect(getPrice(soldier, 1)).toBe(55);
    for (const i of SHOP_ITEMS) expect(getPrice(i, 1) % 5).toBe(0);
  });

  it('income at each chapter affords a basic purchase every ~20s (economy sanity)', () => {
    // measured bot income: ~4-6 coins/s at chapter 1, ~20 coins/s around chapter 5
    expect(getPrice(getItem('soldier')!, 1) / 5).toBeLessThanOrEqual(12);
    expect(getPrice(getItem('soldier')!, 5) / 20).toBeLessThanOrEqual(8);
    expect(getPrice(getItem('nuke')!, 1)).toBeGreaterThanOrEqual(300);
  });
});

describe('purchases', () => {
  it('troops and special squads join the army and spend coins', () => {
    const e = setup();
    const a0 = e.playerArmy.aliveCount;
    expect(purchase('soldier', e, gameState)).toMatchObject({ ok: true, cost: 50 });
    expect(e.playerArmy.aliveCount).toBe(a0 + 10);
    purchase('bazooka', e, gameState);
    purchase('laser', e, gameState);
    expect(e.playerArmy.aliveCount).toBe(a0 + 14);
    expect(e.playerArmy.soldiers.filter(s => s.type === 'bazooka')).toHaveLength(2);
    expect(e.playerArmy.soldiers.filter(s => s.type === 'laser')).toHaveLength(2);
    expect(e.playerArmy.soldiers.length).toBe(e.playerArmy.aliveCount);
  });

  it('refuses when coins are short and charges nothing', () => {
    const e = setup(1, 49);
    const r = purchase('soldier', e, gameState);
    expect(r).toMatchObject({ ok: false, reason: 'coins' });
    expect(gameState.coins).toBe(49);
    expect(purchase('rambo' as never, e, gameState)).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('shield stacks up to the cap', () => {
    const e = setup();
    for (let i = 0; i < 10; i++) purchase('shield', e, gameState);
    expect(getShieldCharges()).toBe(MAX_SHIELD_CHARGES);
    expect(blockedReason(getItem('shield')!, gameState)).toBe('max');
    expect(purchase('shield', e, gameState)).toMatchObject({ ok: false, reason: 'max' });
  });

  it('super recharge only works while it is cooling down', () => {
    const e = setup();
    gameState.superCannonReady = true; gameState.superCannonActive = false;
    expect(purchase('recharge_super', e, gameState)).toMatchObject({ ok: false, reason: 'ready' });
    const coins = gameState.coins;
    expect(gameState.coins).toBe(coins);
    gameState.superCannonReady = false; gameState.superCannonLastUsed = Date.now();
    expect(purchase('recharge_super', e, gameState).ok).toBe(true);
    expect(gameState.superCannonReady).toBe(true);
    expect(gameState.superCannonLastUsed).toBe(0);
  });

  it('nuke has a 30s game-time cooldown that ticks down with the simulation', () => {
    const e = setup();
    expect(purchase('nuke', e, gameState).ok).toBe(true);
    const item = getItem('nuke')!;
    expect(cooldownLeft(item)).toBe(30000);
    expect(purchase('nuke', e, gameState)).toMatchObject({ ok: false, reason: 'cooldown' });
    tickShop(29000);
    expect(blockedReason(item, gameState)).toBe('cooldown');
    tickShop(2000);
    expect(cooldownLeft(item)).toBe(0);
    expect(purchase('nuke', e, gameState).ok).toBe(true);
  });
});

describe('nuke effects', () => {
  it('kills every horde member with proper credit, keeps player bullets, drops hostile ones', () => {
    const e = setup(3);
    e.enemyHordes = [];
    const h = createEnemyHorde(480, 200, 12, 3); e.enemyHordes.push(h);
    const h2 = createEnemyHorde(480, 100, 5, 3); e.enemyHordes.push(h2);
    e.bullets.push({ x: 1, y: 1, targetX: 0, targetY: 0, speed: -12, damage: 3, isEnemy: false, vx: 0 });
    e.bullets.push({ x: 2, y: 2, targetX: 0, targetY: 0, speed: 3, damage: 1, isEnemy: true, vx: 0 });
    const kills = applyNuke(e, gameState);
    expect(kills).toBe(17);
    expect(gameState.totalKills).toBe(17);
    expect(h.isActive || h2.isActive).toBe(false);
    expect(h.count).toBe(0);
    expect(h.soldiers).toHaveLength(0);
    expect(e.bullets.filter(b => b.isEnemy)).toHaveLength(0);
    expect(e.bullets.filter(b => !b.isEnemy)).toHaveLength(1);
  });

  it('wounds bosses (25% max HP, capped) and can finish a weak boss; mini-bosses lose 60%', () => {
    const e = setup(2);
    const boss = createBoss(480, 2); e.boss = boss;
    const mb = createMiniBoss(480, 100, 2); e.miniBosses.push(mb);
    const hp0 = boss.hp, mhp0 = mb.hp;
    applyNuke(e, gameState);
    expect(boss.hp).toBeCloseTo(hp0 - Math.min(boss.maxHp * 0.25, 6000));
    expect(boss.isActive).toBe(true);
    expect(mb.hp).toBeCloseTo(mhp0 * 0.4);
    boss.hp = 10;
    applyNuke(e, gameState);
    expect(boss.isActive).toBe(false);
    expect(gameState.isVictory).toBe(true);
  });
});
