import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Headless simulation of the real update pipeline (same order as game.ts) with a bot,
// asserting structural invariants every frame.
vi.mock('../src/game', () => ({ triggerScreenShake: vi.fn(), triggerHitStop: vi.fn() }));
vi.mock('../src/renderer', () => ({ addExplosion: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn(), addTrail: vi.fn() }));
vi.mock('../src/audio', () => ({ audioManager: new Proxy({}, { get: () => ({}) }), playSound: vi.fn(), playMusic: vi.fn() }));
vi.mock('../src/input', () => ({ triggerHaptic: vi.fn(), vibrate: vi.fn(), getMouseX: () => 240 }));

import { createInitialEntities, addSoldiersToArmy } from '../src/entities';
import { updateMovement } from '../src/movement';
import { updateShooting, updateBullets, updateSuperCannon } from '../src/shooting';
import { updateSpawns, resetSpawnerState } from '../src/spawner';
import { checkCollisions } from '../src/collisions';
import { updateBossAttacks, resolveEnemyBullets } from '../src/boss-ai';
import { updateEnemyRanged } from '../src/enemy-ai';
import { gameState, resetGameState } from '../src/gameState';
import { resetPerks } from '../src/perks';
import { MAX_HEROES } from '../src/constants';
import type { Entities } from '../src/types';

const W = 480;
const DT = 1000 / 60;

function mulberry(seed: number) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function checkInvariants(e: Entities, frame: number, ctx: string): void {
  const tag = `[${ctx} f${frame}]`;
  const army = e.playerArmy;
  let alive = 0;
  for (const s of army.soldiers) {
    if (s.isAlive) alive++;
    expect(Number.isFinite(s.x) && Number.isFinite(s.y), `${tag} soldier NaN`).toBe(true);
    expect(s.x > -200 && s.x < W + 200, `${tag} soldier x out of range ${s.x}`).toBe(true);
  }
  expect(army.aliveCount, `${tag} aliveCount vs alive soldiers`).toBe(alive);
  expect(army.soldiers.length, `${tag} dead soldiers left in army array`).toBe(alive);
  expect(army.aliveCount >= 0 && army.aliveCount <= MAX_HEROES, `${tag} aliveCount range ${army.aliveCount}`).toBe(true);
  expect(Number.isFinite(army.centerX), `${tag} centerX`).toBe(true);
  expect(army.centerX >= 40 && army.centerX <= W - 40, `${tag} centerX range ${army.centerX}`).toBe(true);
  expect(Number.isFinite(army.fireRate) && army.fireRate >= 40, `${tag} fireRate ${army.fireRate}`).toBe(true);
  expect(Number.isFinite(army.damage) && army.damage > 0, `${tag} damage ${army.damage}`).toBe(true);

  for (const h of e.enemyHordes) {
    if (!h.isActive) continue;
    let ha = 0;
    for (const s of h.soldiers) { if (s.isAlive) ha++; expect(Number.isFinite(s.x + s.y), `${tag} horde soldier NaN`).toBe(true); }
    expect(h.count, `${tag} horde.count vs alive`).toBe(ha);
    expect(h.soldiers.length, `${tag} dead soldiers left in horde`).toBe(ha);
    expect(h.hp <= h.maxHp + 1e-6, `${tag} horde hp > maxHp`).toBe(true);
    expect(Number.isFinite(h.x + h.y), `${tag} horde NaN`).toBe(true);
  }
  for (const b of e.bullets) expect(Number.isFinite(b.x + b.y), `${tag} bullet NaN`).toBe(true);
  expect(e.bullets.length, `${tag} bullet leak`).toBeLessThan(600);
  expect(e.enemyHordes.length, `${tag} horde leak`).toBeLessThan(40);
  expect(e.gates.length, `${tag} gate leak`).toBeLessThan(20);
  expect(e.mysteryBoxes.length, `${tag} box leak`).toBeLessThan(10);
  expect(e.coins.length, `${tag} coin leak`).toBeLessThan(60);
  expect(Number.isFinite(gameState.score) && Number.isFinite(gameState.coins), `${tag} score/coins`).toBe(true);
  expect(gameState.coins >= 0, `${tag} negative coins`).toBe(true);
  if (e.boss) expect(Number.isFinite(e.boss.x + e.boss.y + e.boss.hp), `${tag} boss NaN`).toBe(true);
}

function runSim(seed: number, level: number, frames: number, opts: { startSoldiers?: number } = {}): { entities: Entities; frames: number } {
  const rng = mulberry(seed);
  resetGameState(); resetPerks(); resetSpawnerState();
  gameState.isStarted = true;
  gameState.currentLevel = level;
  gameState.levelDistance = 15000 + (level - 1) * 900;
  gameState.gameSpeed = Math.min(2, gameState.baseGameSpeed + level * 0.1);
  gameState.coins = 0; gameState.highScore = 0;
  const e = createInitialEntities(W, 800);
  if (opts.startSoldiers) addSoldiersToArmy(e.playerArmy, opts.startSoldiers);

  let target = 240;
  let f = 0;
  for (; f < frames && !gameState.isGameOver; f++) {
    vi.setSystemTime(new Date(1_700_000_000_000 + f * DT));
    if (f % 40 === 0) target = 60 + rng() * 360; // wander across the road
    if (gameState.isDying) { gameState.slowMoTimer -= DT; if (gameState.slowMoTimer <= 0) { gameState.isGameOver = true; } }
    updateMovement(e, gameState, W, target, 1);
    updateShooting(e, gameState);
    updateBullets(e, gameState, 1);
    updateBossAttacks(e, gameState, 1);
    updateEnemyRanged(e, gameState, 1);
    resolveEnemyBullets(e, gameState);
    updateSuperCannon(e, gameState, DT);
    updateSpawns(e, W, gameState, 1);
    checkCollisions(e, gameState);
    // keep the combo timer semantics of the game loop
    if (gameState.comboTimer > 0) { gameState.comboTimer -= DT; if (gameState.comboTimer <= 0) gameState.combo = 0; }
    // level handling mimics game.ts victory
    if (gameState.isVictory) break;
    checkInvariants(e, f, `seed${seed} L${level}`);
  }
  return { entities: e, frames: f };
}

describe('simulation invariants (bot plays the real update pipeline)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  for (const level of [1, 3, 6, 9]) {
    for (const seed of [1, 2, 3]) {
      it(`level ${level}, seed ${seed}: 2500 frames keep all invariants`, () => {
        const r = runSim(seed * 101 + level, level, 2500, { startSoldiers: level * 10 });
        expect(r.frames).toBeGreaterThan(50);
      }, 120000);
    }
  }
});
