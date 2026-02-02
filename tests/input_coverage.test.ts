
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState } from '../src/types';
import * as shooting from '../src/shooting';

// Mock gameState
const mockGameState = {
  isStarted: true,
  isGameOver: false,
  isPaused: false,
  superCannonReady: true,
  superCannonActive: false,
  superCannonCooldown: 30000,
  superCannonLastUsed: 0,
  currentLevel: 1, // Fix: Needed for renderer theme
};

vi.mock('../src/gameState', () => ({
  gameState: mockGameState,
}));

vi.mock('../src/shooting', () => ({
  activateSuperCannon: vi.fn(),
  updateShooting: vi.fn(),
  updateBullets: vi.fn(),
  updateSuperCannon: vi.fn(),
  createBullet: vi.fn(),
}));

// We need to trigger the event listener.
// The listener is attached in setupInput.
// But we can't easily access the listener function if it's anonymous.
// However, we can simulate the browser behavior.
// If we import game.ts, it calls setupInput.

import { setGameStateRef } from '../src/input';

describe('Input Coverage', () => {
    it('should trigger Super Cannon on Space key', async () => {
        setGameStateRef(mockGameState as any);

        // Spy on document.addEventListener
        const addListenerSpy = vi.spyOn(document, 'addEventListener');

        // Import game to trigger setupInput
        await import('../src/game');

        // Find keydown listener
        const calls = addListenerSpy.mock.calls;
        const keydownCall = calls.find(call => call[0] === 'keydown');

        expect(keydownCall).toBeDefined();
        if (!keydownCall) return;

        const handler = keydownCall[1] as EventListener;

        // Mock activateSuperCannon to update state for verification
        vi.mocked(shooting.activateSuperCannon).mockImplementation((gs: any) => {
            gs.superCannonActive = true;
        });

        // Call handler manually
        const event = { key: ' ', preventDefault: vi.fn() } as unknown as KeyboardEvent;
        handler(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(shooting.activateSuperCannon).toHaveBeenCalled();
        expect(mockGameState.superCannonActive).toBe(true);
    });
});
