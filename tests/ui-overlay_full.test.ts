
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, BuyAction } from '../src/ui-overlay';
import { GameState } from '../src/types';
import { resetGameState, gameState } from '../src/gameState';
import * as input from '../src/input';

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

describe('UI Overlay - Full Coverage', () => {

    beforeEach(() => {
        resetGameState();
        gameState.isStarted = true;
        gameState.coins = 1000; // Rich player for testing

        // Mock body
        document.body.innerHTML = '';
        const superContainer = document.createElement('div');
        superContainer.id = 'superCannonContainer';
        document.body.appendChild(superContainer);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Shop UI', () => {
        it('should create shop container and buttons', () => {
            const onBuy = vi.fn();
            setupShopUI(onBuy);

            const container = document.getElementById('shopContainer');
            expect(container).not.toBeNull();

            // Should have 6 buttons (soldier, bazooka, rambo, laser, nuke, recharge)
            expect(container?.children.length).toBe(6);
        });

        it('should update buttons opacity based on coins', () => {
             const onBuy = vi.fn();
             setupShopUI(onBuy);

             // Default coins 1000, everything affordable
             updateShopUI(gameState);

             const soldierBtn = document.getElementById('shopContainer')!.children[0] as HTMLButtonElement;
             expect(soldierBtn.disabled).toBe(false);
             expect(soldierBtn.style.opacity).toBe('1');

             // Poor player
             gameState.coins = 0;
             updateShopUI(gameState);

             expect(soldierBtn.disabled).toBe(true);
             expect(soldierBtn.style.opacity).toBe('0.5');
        });

        it('should hide shop if game not started or over', () => {
            setupShopUI(vi.fn());
            const container = document.getElementById('shopContainer')!;

            gameState.isStarted = false;
            updateShopUI(gameState);
            expect(container.style.display).toBe('none');

            gameState.isStarted = true;
            gameState.isGameOver = true;
            updateShopUI(gameState);
            expect(container.style.display).toBe('none');
        });

        it('should handle buy clicks', () => {
            const onBuy = vi.fn();
            setupShopUI(onBuy);

            const soldierBtn = document.getElementById('shopContainer')!.children[0] as HTMLButtonElement;
            soldierBtn.click();

            expect(input.vibrate).toHaveBeenCalled();
            expect(onBuy).toHaveBeenCalledWith('soldier', 50);
        });

        it('should handle pointer effects on buttons', () => {
            setupShopUI(vi.fn());
            const btn = document.getElementById('shopContainer')!.children[0] as HTMLButtonElement;

            // Dispatch pointerdown
            const event = new PointerEvent('pointerdown');
            btn.dispatchEvent(event);
            expect(btn.style.transform).toBe('scale(0.95)');

            // Dispatch pointerup
            const eventUp = new PointerEvent('pointerup');
            btn.dispatchEvent(eventUp);
            expect(btn.style.transform).toBe('scale(1)');
        });
    });

    describe('Super Cannon UI', () => {
        it('should setup super cannon button', () => {
            const onActivate = vi.fn();
            setupSuperCannonUI(onActivate);

            const btn = document.getElementById('superCannonBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('⚡ SUPER');
        });

        it('should handle super cannon activation click', () => {
            const onActivate = vi.fn();
            setupSuperCannonUI(onActivate);

            const btn = document.getElementById('superCannonBtn')!;
            btn.click();

            expect(input.vibrate).toHaveBeenCalled();
            expect(onActivate).toHaveBeenCalled();
        });

        it('should update UI states (Ready, Active, Cooldown)', () => {
            setupSuperCannonUI(vi.fn());
            const btn = document.getElementById('superCannonBtn')! as HTMLButtonElement;

            // Ready
            gameState.superCannonReady = true;
            gameState.superCannonActive = false;
            gameState.superCannonLastUsed = 0;
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(false);
            expect(btn.innerHTML).toBe('⚡ SUPER');

            // Active
            gameState.superCannonActive = true;
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(true);
            expect(btn.innerHTML).toBe('⚡ ATIVO!');

            // Cooldown
            gameState.superCannonActive = false;
            gameState.superCannonReady = false;
            gameState.superCannonCooldown = 10000;
            gameState.superCannonLastUsed = Date.now();
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(true);
            expect(btn.innerHTML).toContain('⏳');
        });
    });
});
