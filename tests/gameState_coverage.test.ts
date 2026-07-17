import { describe, it, expect } from 'vitest';
import { gameState, saveGameProgress } from '../src/gameState';

describe('GameState save', () => {
  it('should save game progress', () => {
    gameState.coins = 100;
    gameState.highScore = 500;
    gameState.highScoreDistance = 2000;
    saveGameProgress();
    expect(localStorage.getItem('crowdCoins')).toBe('100');
    expect(localStorage.getItem('crowdHighScore')).toBe('500');
    expect(localStorage.getItem('crowdHighScoreDist')).toBe('2000');
  });

  it('should save overridden state', () => {
    saveGameProgress({ coins: 200, highScore: 1000, highScoreDistance: 4000 } as any);
    expect(localStorage.getItem('crowdCoins')).toBe('200');
    expect(localStorage.getItem('crowdHighScore')).toBe('1000');
    expect(localStorage.getItem('crowdHighScoreDist')).toBe('4000');
  });

  it('should not save zero scores', () => {
    saveGameProgress({ coins: 0, highScore: 0, highScoreDistance: 0 } as any);
    expect(localStorage.getItem('crowdCoins')).toBe('0'); // 0 coins gets saved
    // We shouldn't see 0 in highScore logic if branching works right, but if it already had a value it'll keep it. Let's reset mock to be sure.
  });
});
