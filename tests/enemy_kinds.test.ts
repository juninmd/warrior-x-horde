import { describe, it, expect, beforeEach } from 'vitest';
import { createEnemyUnit, enemyKindChances, ENEMY_KINDS, createEnemyHorde, createInitialEntities } from '../src/entities';
import { updateEnemyRanged, countEnemyBullets } from '../src/enemy-ai';
import { gameState, resetGameState } from '../src/gameState';

describe('enemy archetypes', () => {
  it('level 1 has only plain zombies; later levels unlock kinds with capped odds', () => {
    expect(enemyKindChances(1)).toEqual({ runner: 0, tank: 0, spitter: 0 });
    const l2 = enemyKindChances(2);
    expect(l2.runner).toBeGreaterThan(0); expect(l2.spitter).toBeGreaterThan(0); expect(l2.tank).toBe(0);
    expect(enemyKindChances(3).tank).toBeGreaterThan(0);
    const big = enemyKindChances(99);
    expect(big).toEqual({ runner: 0.15, tank: 0.1, spitter: 0.12 });
  });

  it('rolls kinds deterministically with an injected rng', () => {
    // spitter band is [0, .12), tank [.12, .22), runner [.22, .37) at high level
    expect(createEnemyUnit(0, 0, 4, 99, true, () => 0.01).kind).toBe('spitter');
    expect(createEnemyUnit(0, 0, 4, 99, true, () => 0.15).kind).toBe('tank');
    expect(createEnemyUnit(0, 0, 4, 99, true, () => 0.3).kind).toBe('runner');
    expect(createEnemyUnit(0, 0, 4, 99, true, () => 0.9).kind).toBeUndefined();
    expect(createEnemyUnit(0, 0, 4, 99, false, () => 0).kind).toBeUndefined(); // horde center stays plain
  });

  it('applies size, color and hp multipliers', () => {
    const t = createEnemyUnit(0, 0, 4, 99, true, () => 0.15);
    expect(t.size).toBe(ENEMY_KINDS.tank.size);
    expect(t.color).toBe(ENEMY_KINDS.tank.color);
    expect(t.hp).toBe(16);
    const r = createEnemyUnit(0, 0, 1, 99, true, () => 0.3);
    expect(r.hp).toBe(1); // never below 1
    const s = createEnemyUnit(0, 0, 4, 99, true, () => 0.01);
    expect(s.cooldown).toBeGreaterThan(0);
  });

  it('hordes at high level contain special kinds', () => {
    const h = createEnemyHorde(480, 0, 200, 12);
    const kinds = new Set(h.soldiers.map(s => s.kind));
    expect(kinds.has('spitter') || kinds.has('tank') || kinds.has('runner')).toBe(true);
  });
});

describe('spitter ranged attacks', () => {
  beforeEach(() => resetGameState());

  function setup() {
    const e = createInitialEntities(480, 800);
    const horde = createEnemyHorde(480, 300, 10, 1);
    horde.isActive = true;
    horde.soldiers.forEach(s => { s.y = 300; });
    horde.soldiers[1].kind = 'spitter';
    horde.soldiers[1].cooldown = 0;
    e.enemyHordes = [horde];
    return e;
  }

  it('fires aimed acid at the army and then waits', () => {
    const e = setup();
    expect(updateEnemyRanged(e, gameState, 1)).toBe(1);
    const b = e.bullets[0];
    expect(b.isEnemy).toBe(true);
    expect(b.speed).toBeGreaterThan(0);
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    expect(countEnemyBullets(e)).toBe(1);
  });

  it('does not shoot while fading in, when dead, game over, or over the bullet cap', () => {
    let e = setup(); e.enemyHordes[0].soldiers.forEach(s => { s.y = 20; });
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    e = setup(); e.enemyHordes[0].soldiers[1].isAlive = false;
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    e = setup(); gameState.isGameOver = true;
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    gameState.isGameOver = false;
    e = setup();
    for (let i = 0; i < 24; i++) e.bullets.push({ x: 0, y: 0, targetX: 0, targetY: 0, speed: 3, damage: 1, isEnemy: true, vx: 0 });
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    e = setup(); e.enemyHordes[0].isActive = false;
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
  });
});

describe('spitter cooldown', () => {
  it('counts down before firing and tolerates a missing cooldown', () => {
    resetGameState();
    const e = createInitialEntities(480, 800);
    const horde = createEnemyHorde(480, 300, 4, 1);
    horde.soldiers.forEach(s => { s.y = 300; });
    horde.soldiers[1].kind = 'spitter';
    horde.soldiers[1].cooldown = 5;
    e.enemyHordes = [horde];
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    horde.soldiers[1].cooldown = undefined; // defaults to 120 and keeps counting
    expect(updateEnemyRanged(e, gameState, 1)).toBe(0);
    expect(horde.soldiers[1].cooldown).toBe(119);
  });
});
