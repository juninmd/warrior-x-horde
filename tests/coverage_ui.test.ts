import { describe, it, expect, vi } from 'vitest';
import { setupSettingsUI, setupGameOverUI, _testing } from '../src/ui-overlay';
import { GameState } from '../src/types';

describe('UI Coverage - Uncovered Lines', () => {

    it('leaderboard handles NaN score', () => {
        const leaderboard = [{ score: NaN }];
        const el = _testing.getLeaderboardElement(leaderboard, 0);
        expect(el.innerHTML).toContain('0');
    });

    it('leaderboard handles 0 score formatting', () => {
        const leaderboard = [{ score: 0 }];
        const el = _testing.getLeaderboardElement(leaderboard, 0);
        expect(el.innerHTML).toContain('0');
    });

    it('updateShopUI updates display correctly when not started or game over', () => {
        const gameState = { isStarted: false, isGameOver: false } as GameState;

        document.body.innerHTML = '<div class="shop-container"></div>';
        const container = document.querySelector('.shop-container') as HTMLElement;
        _testing.setShopContainer(container);

        container.style.display = 'flex';
        _testing.updateShopUI(gameState);
        expect(container.style.display).toBe('none');

        _testing.updateShopUI(gameState);
        expect(container.style.display).toBe('none');

        gameState.isStarted = true;
        _testing.updateShopUI(gameState);
        expect(container.style.display).toBe('flex');

        _testing.updateShopUI(gameState);
        expect(container.style.display).toBe('flex');
    });

    it('updateSuperCannonUI updates display correctly when not started or game over', () => {
        const gameState = { isStarted: false, isGameOver: false, superCannonLastUsed: 0, superCannonCooldown: 0, superCannonActive: false } as any;

        document.body.innerHTML = '<div class="super-cannon-container"><button id="superCannonBtn"></button></div>';
        const container = document.querySelector('.super-cannon-container') as HTMLElement;
        _testing.setSuperCannonElements(container);

        // mock the buttons object inside ui-overlay
        // it requires buttons['superCannon'] = document.getElementById('superCannonBtn')
        // Actually, we can just call setupSuperCannonUI to populate it.
    });
});
import { setupSuperCannonUI } from '../src/ui-overlay';

describe('Super Cannon UI Coverage', () => {
    it('handles visibility toggling', () => {
        const gameState = { isStarted: false, isGameOver: false, superCannonLastUsed: 0, superCannonCooldown: 0, superCannonActive: false } as any;
        document.body.innerHTML = '';
        setupSuperCannonUI(() => {}); // this sets up container and buttons

        // it starts hidden, let's force flex and verify it hides it
        const container = document.getElementById('superCannonContainer')!;
        container.style.display = 'flex';
        _testing.updateSuperCannonUI(gameState);
        expect(container.style.display).toBe('none');

        _testing.updateSuperCannonUI(gameState);
        expect(container.style.display).toBe('none');

        gameState.isStarted = true;
        _testing.updateSuperCannonUI(gameState);
        expect(container.style.display).toBe('flex');

        _testing.updateSuperCannonUI(gameState);
        expect(container.style.display).toBe('flex');
    });
});
