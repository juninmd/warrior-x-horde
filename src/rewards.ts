// rewards.ts - Single source of truth for kill/clear rewards (bullets, melee, nuke, beam all pay the same).
import type { Boss, EnemyHorde, GameState, MiniBoss } from './types';
import { COLORS } from './constants';
import { addExplosion, addFloatingText, addParticle } from './renderer';
import { triggerHitStop, triggerScreenShake } from './game';
import { triggerHaptic } from './input';
import { getMods } from './perks';

export function comboMultiplier(gs: GameState): number {
  // 5% per combo step, capped at 3x so long streaks cannot inflate score/coins without bound
  return Math.min(3.0, 1 + (gs.combo || 0) * 0.05) * getMods().comboScoreMult;
}

/** Coins awarded for clearing a whole horde: grows gently with the chapter. */
export function hordeClearCoins(level: number): number {
  return 20 + level * 5;
}

/** Coins for a boss kill. */
export function bossCoins(level: number, mothership: boolean): number {
  return mothership ? 1500 : 250 + level * 50;
}

/** Counts one enemy kill (any source) and drives the kill-streak callouts. */
export function registerKill(gs: GameState, x: number, y: number): void {
  gs.totalKills++;
  gs.killStreak++;
  gs.killStreakTimer = 2500;
  const k = gs.killStreak;
  const call = (t: string, c: string, s: number) => addFloatingText(t, x, y - 80, c, s, 'critical');
  if (k === 5) call('KILLING SPREE', '#2ECC71', 1.3);
  else if (k === 10) call('RAMPAGE!', '#3498DB', 1.5);
  else if (k === 20) call('DOMINATING!', '#9B59B6', 1.8);
  else if (k === 50) call('UNSTOPPABLE!', '#E74C3C', 2.2);
  else if (k === 100) call('GODLIKE!', '#FFD700', 3.0);
}

/** A horde is wiped out (by bullets or melee): combo, score, coins and fanfare. */
export function awardHordeClear(horde: EnemyHorde, gs: GameState, level: number): void {
  horde.isActive = false;
  triggerHitStop(5);
  gs.combo++;
  gs.comboTimer = 2000 + gs.combo * 100;
  if (gs.combo > gs.maxCombo) gs.maxCombo = gs.combo;

  const mult = comboMultiplier(gs);
  gs.score += Math.floor(100 * mult);
  const coins = hordeClearCoins(level);
  gs.coins += coins;

  addExplosion(horde.x, horde.y, COLORS.UI.GOLD);
  addParticle(horde.x, horde.y, 'star', COLORS.UI.GOLD, 8);
  addFloatingText('VICTORY!', horde.x, horde.y, COLORS.UI.GOLD, 1.3);
  addFloatingText(`+$${coins}`, horde.x, horde.y - 20, COLORS.UI.GOLD, 1.2);

  if (gs.combo === 5) addFloatingText('GREAT!', horde.x, horde.y - 60, COLORS.UI.INFO, 1.5, 'critical');
  else if (gs.combo === 10) addFloatingText('EPIC!', horde.x, horde.y - 60, '#FF00FF', 1.8, 'critical');
  else if (gs.combo === 20) addFloatingText('LEGENDARY!', horde.x, horde.y - 60, COLORS.UI.GOLD, 2.0, 'critical');
  else if (gs.combo === 50) addFloatingText('UNSTOPPABLE!', horde.x, horde.y - 60, COLORS.EFFECTS.EXPLOSION, 2.5, 'critical');
  if (gs.combo >= 2) addFloatingText(`${gs.combo}x COMBO!`, horde.x, horde.y - 40, COLORS.UI.GOLD, 1.3);

  if (horde.perfectClearEligible) {
    addFloatingText('PERFECT CLEAR!', horde.x, horde.y - 80, '#00FFFF', 2.5, 'critical');
    gs.score += Math.floor(300 * mult);
    triggerScreenShake(12, 350);
    triggerHaptic('success');
    addParticle(horde.x, horde.y, 'holylight', '#FFFF00', 1);
  } else {
    triggerHaptic('medium');
  }
}

/** Boss dies (any source). Idempotent. Returns true the first time. */
export function defeatBoss(boss: Boss, gs: GameState, level: number): boolean {
  if (!boss.isActive) return false;
  boss.isActive = false;
  const mother = boss.type === 'mothership';

  gs.totalKills++;
  gs.whiteFlash = 1.0;
  gs.slowMoTimer = 2000;
  gs.isVictory = true;
  triggerHitStop(20);
  triggerScreenShake(20, 1000);
  triggerHaptic('heavy');

  const mult = comboMultiplier(gs);
  gs.score += Math.floor((mother ? 5000 : 1000) * mult);
  const coins = bossCoins(level, mother);
  gs.coins += coins;

  const cx = mother ? boss.x : boss.x + boss.width / 2;
  const cy = mother ? boss.y : boss.y;
  addFloatingText(mother ? 'NAVE MÃE DESTRUÍDA!' : 'BOSS DEFEATED!', cx, cy + (mother ? 100 : 0), mother ? '#00FF88' : COLORS.UI.GOLD, 2.0);
  addFloatingText(`+$${coins}`, cx, cy + (mother ? 60 : -40), COLORS.UI.GOLD, 1.8);

  /* v8 ignore start */
  const bursts = mother ? 15 : 5;
  for (let k = 0; k < bursts; k++) {
    setTimeout(() => {
      addExplosion(cx + (Math.random() - 0.5) * (mother ? 150 : boss.width), cy + (Math.random() - 0.5) * (mother ? 80 : boss.height), k % 2 === 0 ? (mother ? '#00FF88' : '#FF6B6B') : '#FFD700');
      addParticle(cx, cy, 'star', mother ? '#00FFAA' : '#FF6B6B', 10);
    }, k * (mother ? 150 : 100));
  }
  /* v8 ignore stop */
  return true;
}

/** Mini-boss dies (any source). Idempotent. */
export function defeatMiniBoss(mb: MiniBoss, gs: GameState, level: number): boolean {
  if (!mb.isActive) return false;
  mb.isActive = false;
  gs.totalKills++;
  triggerHitStop(10);
  const mult = comboMultiplier(gs);
  gs.score += Math.floor(500 * mult);
  const coins = 40 + level * 10;
  gs.coins += coins;
  const cx = mb.x + mb.width / 2;
  const cy = mb.y + mb.height / 2;
  addExplosion(cx, cy, '#FF4500');
  addParticle(cx, cy, 'star', '#FF4500', 10);
  addFloatingText('MINI-BOSS DEFEATED!', cx, mb.y, '#FF4500', 1.4);
  addFloatingText(`+$${coins}`, cx, mb.y - 30, COLORS.UI.GOLD, 1.5);
  triggerHaptic('heavy');
  return true;
}
