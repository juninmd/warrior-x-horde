import { describe, it, expect, beforeEach } from 'vitest';
import { hudAnim, resetHudAnim, stepHudAnim, fmtNum, rankFor, drawHud, drawProgress, drawChapterChip, drawCoins, drawPerkRow, drawArmyPanel, drawScoreBlock, drawRank } from '../src/hud';
import { gameState, resetGameState } from '../src/gameState';
import { resetPerks, pickPerk, refillShield } from '../src/perks';

const ctx = () => document.createElement('canvas').getContext('2d')!;

describe('hud animation + helpers', () => {
  beforeEach(() => { resetHudAnim(); resetGameState(); resetPerks(); });

  it('formats numbers and maps ranks', () => {
    expect(fmtNum(1234.9)).toBe((1234).toLocaleString('pt-BR'));
    expect(rankFor(0).rank).toBe('D');
    expect(rankFor(500).rank).toBe('C');
    expect(rankFor(1000).rank).toBe('B');
    expect(rankFor(3000).rank).toBe('A');
    expect(rankFor(5000).rank).toBe('S');
  });

  it('counts the score and coins up without overshooting, then snaps', () => {
    gameState.score = 1000; gameState.coins = 50;
    stepHudAnim(gameState, 5, 1000);
    for (let t = 1016; t < 3000; t += 16) {
      stepHudAnim(gameState, 5, t);
      expect(hudAnim.score).toBeLessThanOrEqual(1000);
    }
    expect(hudAnim.score).toBe(1000);
    expect(hudAnim.coins).toBe(50);
  });

  it('pops on coin gain and reports army deltas', () => {
    stepHudAnim(gameState, 10, 1000);
    gameState.coins = 10;
    stepHudAnim(gameState, 10, 1016);
    expect(hudAnim.coinPop).toBeGreaterThan(0.9);
    stepHudAnim(gameState, 14, 1032);
    expect(hudAnim.armyDelta).toBe(4);
    expect(hudAnim.armyDeltaAge).toBeLessThan(0.1);
    stepHudAnim(gameState, 11, 1048);
    expect(hudAnim.armyDelta).toBe(-3);
    for (let t = 1064; t < 4000; t += 16) stepHudAnim(gameState, 11, t);
    expect(hudAnim.coinPop).toBe(0);
    expect(hudAnim.armyDeltaAge).toBeGreaterThan(1);
  });

  it('draws every section in all states without throwing', () => {
    const c = ctx();
    gameState.score = 4000; gameState.highScore = 3000; gameState.combo = 12; gameState.currentLevel = 12;
    pickPerk('damage', null); pickPerk('damage', null); pickPerk('shield', null); refillShield();
    stepHudAnim(gameState, 20, 1000); stepHudAnim(gameState, 25, 1016);
    const stats = { count: 25, power: 40, shotsPerSec: 3 };
    expect(() => drawHud(c, gameState, stats, 1234)).not.toThrow();
    for (const [score, best, combo] of [[10, 0, 0], [95, 100, 0], [200, 100, 5]] as const) {
      gameState.score = score; gameState.highScore = best; gameState.combo = combo;
      expect(() => { drawScoreBlock(c, gameState, 500); drawScoreBlock(c, gameState, 700); }).not.toThrow();
    }
    expect(() => { drawProgress(c, gameState, 1); drawChapterChip(c, 3); drawChapterChip(c, 11); drawCoins(c); drawPerkRow(c); drawArmyPanel(c, { count: 1, power: 1, shotsPerSec: 0 }); }).not.toThrow();
    for (const r of ['D', 'A', 'S']) expect(() => drawRank(c, r, '#fff', 100)).not.toThrow();
    resetPerks();
    expect(() => drawPerkRow(c)).not.toThrow();
  });
});
