// boss-ai.ts - Boss lore, phases and attack patterns.
// Bosses used to be passive damage sponges; now they telegraph and fire projectile
// patterns that get nastier as their HP drops (3 phases).
import { Boss, Entities, GameState } from './types';
import { BOSS_LORE, getBossLore } from './boss-lore';
import type { BossLore } from './boss-lore';
import { BASE_WIDTH } from './constants';
import { createBullet, releaseBullet } from './shooting';
import { cleanupDeadSoldiers } from './collisions';
import { addExplosion, addFloatingText } from './renderer';
import { triggerScreenShake } from './game';
import { fastRemove } from './utils';
import { armyRadius } from './army-geometry';
import { consumeShield, getMods } from './perks';

export { BOSS_LORE, getBossLore };
export type { BossLore };

export function getBossPhase(boss: Boss): 1 | 2 | 3 {
  const ratio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
  if (ratio > 0.66) return 1;
  if (ratio > 0.33) return 2;
  return 3;
}

const TELEGRAPH_FRAMES = 40; // ~0.65s warning before every volley
const PHASE_COOLDOWN: Record<1 | 2 | 3, number> = { 1: 170, 2: 125, 3: 90 };
const PHASE_NAMES: Record<2 | 3, string> = { 2: '🔥 FASE 2: FÚRIA!', 3: '💀 FASE 3: DESESPERO!' };

/** Soldiers lost per projectile: 1 early, up to 3 deep into the campaign. */
export function bossBulletDamage(level: number): number {
  return Math.min(3, 1 + Math.floor(level / 4));
}

function pickPattern(phase: 1 | 2 | 3): NonNullable<Boss['pattern']> {
  const r = Math.random();
  if (phase === 1) return 'aimed';
  if (phase === 2) return r < 0.5 ? 'aimed' : 'fan';
  return r < 0.34 ? 'aimed' : r < 0.67 ? 'fan' : 'rain';
}

function fire(boss: Boss, entities: Entities, level: number): void {
  const phase = getBossPhase(boss);
  const cx = boss.type === 'mothership' ? boss.x : boss.x + boss.width / 2;
  const cy = boss.y + (boss.type === 'mothership' ? 56 : boss.height); // mothership: cannon muzzles
  const army = entities.playerArmy;
  const dmg = bossBulletDamage(level);
  const speed = 3.2 + phase * 0.5 + Math.min(1.5, level * 0.1);

  const shoot = (x: number, angle: number) => {
    const b = createBullet(x, cy, 0, 0, dmg, true);
    b.speed = Math.cos(angle) * speed; // vertical component (angle measured from straight down)
    b.vx = Math.sin(angle) * speed;
    entities.bullets.push(b);
  };

  switch (boss.pattern) {
    case 'fan': {
      const n = phase === 3 ? 9 : 7;
      for (let i = 0; i < n; i++) shoot(cx, -0.75 + (1.5 * i) / (n - 1));
      break;
    }
    case 'rain': {
      const n = phase === 3 ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const x = 30 + ((BASE_WIDTH - 60) * (i + Math.random() * 0.8)) / n;
        shoot(x, 0);
      }
      // always one column on the player so standing still is punished
      shoot(army.centerX, 0);
      break;
    }
    default: {
      const base = Math.atan2(army.centerX - cx, Math.max(60, army.centerY - cy));
      for (const off of [-0.2, 0, 0.2]) shoot(cx, base + off);
    }
  }
}

/** Phase changes, telegraphing and firing. Call once per frame while playing. */
export function updateBossAttacks(entities: Entities, gameState: GameState, dtFactor: number): void {
  const boss = entities.boss;
  if (!boss || !boss.isActive || gameState.isGameOver || gameState.isDying) return;
  const entering = boss.type !== 'mothership' && boss.y < -20;
  if (entering) return;

  const phase = getBossPhase(boss);
  if (boss.phase === undefined) {
    boss.phase = 1;
    boss.attackTimer = 90;
    boss.telegraph = 0;
  }
  if (phase > boss.phase) {
    boss.phase = phase;
    boss.attackTimer = 70;
    boss.telegraph = 0;
    triggerScreenShake(14, 600);
    gameState.whiteFlash = Math.max(gameState.whiteFlash, 0.35);
    addFloatingText(PHASE_NAMES[phase as 2 | 3], BASE_WIDTH / 2, 230, '#FF4040', 1.6);
  }

  if ((boss.telegraph ?? 0) > 0) {
    boss.telegraph = (boss.telegraph as number) - dtFactor;
    if ((boss.telegraph as number) <= 0) {
      boss.telegraph = 0;
      fire(boss, entities, gameState.currentLevel);
    }
    return;
  }

  boss.attackTimer = (boss.attackTimer ?? 0) - dtFactor;
  if (boss.attackTimer <= 0) {
    boss.pattern = pickPattern(phase);
    boss.telegraph = TELEGRAPH_FRAMES;
    boss.attackTimer = PHASE_COOLDOWN[phase] * Math.max(0.7, 1 - gameState.currentLevel * 0.03);
  }
}

/** Boss projectiles hurt the army. Returns the number of soldiers killed. */
export function resolveEnemyBullets(entities: Entities, gameState: GameState): number {
  if (gameState.isGameOver || gameState.isDying) return 0;
  const army = entities.playerArmy;
  const reach = armyRadius(army.aliveCount) + 40;
  let totalKilled = 0;

  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    if (!bullet.isEnemy) continue;

    // quick reject: far from the formation
    if (Math.abs(bullet.x - army.centerX) > reach || Math.abs(bullet.y - army.centerY) > reach) continue;

    let hit = false;
    for (const s of army.soldiers) {
      if (!s.isAlive) continue;
      const dx = bullet.x - s.x;
      const dy = bullet.y - s.y;
      const r = s.size + 4;
      if (dx * dx + dy * dy <= r * r) { hit = true; break; }
    }
    if (!hit) continue;

    if (consumeShield()) {
      addExplosion(bullet.x, bullet.y, '#4AD0FF');
      addFloatingText('BLOQUEADO', bullet.x, bullet.y - 12, '#4AD0FF', 0.8);
      releaseBullet(bullet);
      fastRemove(entities.bullets, i);
      continue;
    }
    let toKill = Math.max(1, bullet.damage - getMods().bossDamageReduction);
    addExplosion(bullet.x, bullet.y, '#FF4040');
    for (let j = army.soldiers.length - 1; j >= 0 && toKill > 0; j--) {
      const s = army.soldiers[j];
      if (!s.isAlive) continue;
      s.isAlive = false;
      army.aliveCount--;
      toKill--;
      totalKilled++;
    }
    releaseBullet(bullet);
    fastRemove(entities.bullets, i);
  }

  if (totalKilled > 0) {
    cleanupDeadSoldiers(army.soldiers);
    gameState.damageFlash = Math.min(0.8, gameState.damageFlash + totalKilled * 0.12);
    triggerScreenShake(6, 200);
  }
  return totalKilled;
}
