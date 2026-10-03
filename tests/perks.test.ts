import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PERKS, resetPerks, pickPerk, perkCount, getMods, rollOffers, refillShield, consumeShield, getShieldCharges, getTakenPerks } from '../src/perks';
import { createInitialEntities } from '../src/entities';
import { showPerkChoice, closePerkChoice, isPerkChoiceOpen } from '../src/ui-perks';

describe('perks', () => {
  beforeEach(() => resetPerks());

  it('has unique ids and sane definitions', () => {
    expect(new Set(PERKS.map(p => p.id)).size).toBe(PERKS.length);
    PERKS.forEach(p => { expect(p.max).toBeGreaterThan(0); expect(p.desc.length).toBeGreaterThan(5); });
  });

  it('stacks modifiers and respects max', () => {
    expect(getMods().damageMult).toBe(1);
    pickPerk('damage', null); pickPerk('damage', null);
    expect(getMods().damageMult).toBeCloseTo(1.4);
    for (let i = 0; i < 10; i++) pickPerk('firerate', null);
    expect(perkCount('firerate')).toBe(5);
    expect(pickPerk('nope', null)).toBe(false);
    pickPerk('greed', null); pickPerk('armor', null); pickPerk('combo', null);
    for (let i = 0; i < 9; i++) pickPerk('supercool', null);
    const m = getMods();
    expect(m.coinMult).toBeCloseTo(1.4);
    expect(m.bossDamageReduction).toBe(1);
    expect(m.comboScoreMult).toBeCloseTo(1.25);
    expect(m.superCooldownMult).toBeCloseTo(0.25);
    expect(getTakenPerks().length).toBe(6);
  });

  it('reinforce adds 10 soldiers; shield charges refill and are consumed', () => {
    const e = createInitialEntities(480, 800);
    const before = e.playerArmy.aliveCount;
    pickPerk('reinforce', e);
    expect(e.playerArmy.aliveCount).toBe(before + 10);
    expect(consumeShield()).toBe(false);
    pickPerk('shield', e);
    expect(getShieldCharges()).toBe(2);
    expect(consumeShield()).toBe(true); expect(consumeShield()).toBe(true); expect(consumeShield()).toBe(false);
    refillShield();
    expect(getShieldCharges()).toBe(2);
  });

  it('rolls distinct offers, skips maxed perks and handles tiny pools', () => {
    const offers = rollOffers(3);
    expect(new Set(offers.map(o => o.id)).size).toBe(3);
    PERKS.filter(p => p.max < 99).forEach(p => { for (let i = 0; i < p.max; i++) pickPerk(p.id, null); });
    const rest = rollOffers(3);
    expect(rest.map(o => o.id)).toEqual(['reinforce']);
  });
});

describe('perk modal', () => {
  beforeEach(() => { document.body.innerHTML = '<div class="game-canvas-wrapper"></div>'; resetPerks(); });

  it('renders cards, picks by click and by number key, once', () => {
    const offers = rollOffers(3);
    const onPick = vi.fn();
    showPerkChoice(offers, 2, onPick);
    expect(isPerkChoiceOpen()).toBe(true);
    expect(document.querySelectorAll('.perk-card')).toHaveLength(3);
    (document.querySelectorAll('.perk-card')[1] as HTMLElement).click();
    expect(onPick).toHaveBeenCalledWith(offers[1].id);
    expect(isPerkChoiceOpen()).toBe(false);

    pickPerk('damage', null);
    showPerkChoice(offers, 3, onPick);
    expect(document.querySelector('.perk-taken')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(onPick).toHaveBeenLastCalledWith(offers[2].id);
    closePerkChoice();
  });
});

import { resolveEnemyBullets } from '../src/boss-ai';
import { gameState, resetGameState } from '../src/gameState';
import { createInitialEntities } from '../src/entities';
import { pickPerk as pick, resetPerks as reset } from '../src/perks';

describe('perks in combat', () => {
  it('shield blocks a projectile; armor reduces boss damage but never below 1', () => {
    vi.mock('../src/game', () => ({ triggerScreenShake: vi.fn(), triggerHitStop: vi.fn() }));
    vi.mock('../src/renderer', () => ({ addExplosion: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn() }));
    reset(); resetGameState();
    const e = createInitialEntities(480, 800);
    const s = e.playerArmy.soldiers[0];
    const mk = (dmg: number) => ({ x: s.x, y: s.y, targetX: 0, targetY: 0, speed: 3, damage: dmg, isEnemy: true, vx: 0 });
    pick('shield', null);
    e.bullets.push(mk(3));
    const alive = e.playerArmy.aliveCount;
    expect(resolveEnemyBullets(e, gameState)).toBe(0); // absorbed
    expect(e.playerArmy.aliveCount).toBe(alive);
    expect(e.bullets).toHaveLength(0);
    pick('shield', null); // consume remaining charge then armor
    resolveEnemyBullets(e, gameState);
    reset(); pick('armor', null); pick('armor', null);
    e.bullets.push(mk(1));
    expect(resolveEnemyBullets(e, gameState)).toBe(1); // 1 - 2 -> clamped to 1
    e.bullets.push(mk(3));
    expect(resolveEnemyBullets(e, gameState)).toBe(1); // 3 - 2 = 1
  });
});
