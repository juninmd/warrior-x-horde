import { describe, it, expect, vi } from 'vitest';
import { gameState, resetGameState } from '../src/gameState';

describe('GameState', () => {
    it('should initialize with default values', () => {
        // Since it's a singleton exported object, we might need to reset it first to ensure clean state
        resetGameState();

        expect(gameState.currentLevel).toBe(1);
        expect(gameState.score).toBe(0);
        expect(gameState.coins).toBe(0);
        expect(gameState.gameSpeed).toBe(0.5);
        expect(gameState.isPaused).toBe(false);
        expect(gameState.isGameOver).toBe(false);
    });

    it('should reset state correctly', () => {
        gameState.currentLevel = 5;
        gameState.score = 1000;
        gameState.coins = 500;
        gameState.isGameOver = true;

        resetGameState();

        expect(gameState.currentLevel).toBe(1);
        expect(gameState.score).toBe(0);
        expect(gameState.coins).toBe(0); // It resets coins too based on source
        expect(gameState.isGameOver).toBe(false);
    });
});
