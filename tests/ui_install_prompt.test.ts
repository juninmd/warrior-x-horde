
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showGameOverScreen, setupGameOverUI, _testing } from '../src/ui-overlay';
import { GameState } from '../src/types';

describe('UI Overlay Interactions', () => {
    let mockGameState: GameState;
    let installPromptMock: any;
    let onRestartMock: any;

    beforeEach(() => {
        document.body.innerHTML = '';
        _testing.resetContainers();

        installPromptMock = {
            prompt: vi.fn(),
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };

        onRestartMock = vi.fn();

        mockGameState = {
            isStarted: true,
            isGameOver: true,
            score: 1000,
            coins: 100,
            highScore: 2000,
            maxCombo: 10,
            totalKills: 50,
            runStartTime: Date.now() - 60000,
            deferredInstallPrompt: installPromptMock,
            isVictory: false,
            currentLevel: 1,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            highScoreDistance: 0,
            nearMissCount: 0
        } as unknown as GameState;
    });

    it('should NOT show prompt if deferredInstallPrompt is null when clicked', () => {
        setupGameOverUI(onRestartMock, () => {});
        showGameOverScreen(mockGameState);

        const btn = document.getElementById('goInstallBtn') as HTMLButtonElement;
        mockGameState.deferredInstallPrompt = null;
        btn.click();

        expect(installPromptMock.prompt).not.toHaveBeenCalled();
    });

    it('should show prompt if deferredInstallPrompt exists', async () => {
        setupGameOverUI(onRestartMock, () => {});
        showGameOverScreen(mockGameState);

        const btn = document.getElementById('goInstallBtn') as HTMLButtonElement;
        await btn.click();

        expect(installPromptMock.prompt).toHaveBeenCalled();
    });

    it('should restart game when clicking background', () => {
        setupGameOverUI(onRestartMock, () => {});
        showGameOverScreen(mockGameState);

        const container = document.getElementById('gameOverContainer');
        expect(container).toBeTruthy();

        // Trigger click on background
        container!.click();

        // The background click triggers restart button click
        // restart button has a timeout of 300ms before calling onRestart
        // So we need to advance timers or wait.
        // But wait, setupGameOverUI just adds the click listener to click the button.
        // The button listener has the timeout.

        // Let's use fake timers to handle the timeout
        vi.useFakeTimers();

        // Reset the mock because setupGameOverUI might have been called before
        // But here we are in the test

        // Re-trigger click
        container!.click();

        vi.advanceTimersByTime(300);

        expect(onRestartMock).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should NOT crash if restart button is missing when clicking background', () => {
         setupGameOverUI(onRestartMock, () => {});
         // Don't call showGameOverScreen, so content (and button) are missing

         const container = document.getElementById('gameOverContainer');
         // We need container to exist, setupGameOverUI creates it.

         container!.click();

         expect(onRestartMock).not.toHaveBeenCalled();
    });
});
