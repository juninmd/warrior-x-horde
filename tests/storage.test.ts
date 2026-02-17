
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAudio, toggleMute, resetAudio } from '../src/audio';
import { saveGameProgress, resetGameState, gameState } from '../src/gameState';

describe('Storage Coverage', () => {
  // Save original methods
  const originalGetItem = window.localStorage.getItem;
  const originalSetItem = window.localStorage.setItem;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Restore original mock implementations from setup.ts explicitly
    window.localStorage.getItem = originalGetItem;
    window.localStorage.setItem = originalSetItem;

    resetAudio(); // Ensure initAudio runs
  });

  describe('Audio Storage', () => {
    it('should handle localStorage error during init', () => {
      const getItemSpy = vi.spyOn(window.localStorage, 'getItem');
      getItemSpy.mockImplementationOnce(() => {
        throw new Error('Access denied');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      initAudio();

      expect(consoleSpy).toHaveBeenCalledWith('LocalStorage access denied', expect.any(Error));
      getItemSpy.mockRestore();
    });

    it('should handle localStorage error during toggleMute', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
      setItemSpy.mockImplementationOnce(() => {
        throw new Error('Access denied');
      });

      // Should not throw
      expect(() => toggleMute()).not.toThrow();
      setItemSpy.mockRestore();
    });
  });

  describe('GameState Storage', () => {
    it('should save high score if greater than 0', () => {
      gameState.highScore = 100;
      gameState.coins = 50;

      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      saveGameProgress();

      expect(setItemSpy).toHaveBeenCalledWith('crowdCoins', '50');
      expect(setItemSpy).toHaveBeenCalledWith('crowdHighScore', '100');
      setItemSpy.mockRestore();
    });

    it('should NOT save high score if 0', () => {
        gameState.highScore = 0;
        gameState.coins = 50;

        const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

        saveGameProgress();

        expect(setItemSpy).toHaveBeenCalledWith('crowdCoins', '50');
        expect(setItemSpy).not.toHaveBeenCalledWith('crowdHighScore', '0');
        setItemSpy.mockRestore();
    });

    it('should reset game state correctly', () => {
        // Setup dirty state
        gameState.score = 500;
        gameState.isGameOver = true;
        gameState.currentLevel = 5;

        resetGameState();

        expect(gameState.score).toBe(0);
        expect(gameState.isGameOver).toBe(false);
        expect(gameState.currentLevel).toBe(1);
    });
  });
});
