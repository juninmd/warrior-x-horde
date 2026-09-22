import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderSkinSelector } from '../src/ui-skins';
import * as skinsModule from '../src/skins';

describe('UI Skins Extra Coverage', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div class="start-screen-content"></div>';
        vi.restoreAllMocks();
    });

    it('should cover loop in renderSkinSelector and early return in event listener', () => {
        vi.spyOn(skinsModule, 'getHighScore').mockReturnValue(0); // None unlocked except default
        vi.spyOn(skinsModule, 'selectSkin').mockReturnValue(false); // Simulate selectSkin returning false
        const onChange = vi.fn();

        renderSkinSelector(onChange);
        const cards = document.querySelectorAll('.skin-card');
        expect(cards.length).toBeGreaterThan(0);

        const firstCard = cards[0] as HTMLElement;
        const e = new Event('click');
        vi.spyOn(e, 'stopPropagation');
        firstCard.dispatchEvent(e);

        expect(e.stopPropagation).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should cover fallback when no start button is present in start-screen-content', () => {
        // start-screen-content has no .start-btn
        renderSkinSelector();
        expect(document.getElementById('skinSelector')).not.toBeNull();
    });


    it('should cover insertBefore in renderSkinSelector and successful selectSkin click', () => {
        document.body.innerHTML = '<div class="start-screen-content"><button class="start-btn"></button></div>';

        vi.spyOn(skinsModule, 'getHighScore').mockReturnValue(1000000); // All unlocked
        vi.spyOn(skinsModule, 'selectSkin').mockReturnValue(true); // Simulate success
        const onChange = vi.fn();

        renderSkinSelector(onChange);

        // Assert insertBefore branch worked
        const panel = document.getElementById('skinSelector');
        expect(panel).not.toBeNull();
        expect(panel?.nextElementSibling?.className).toBe('start-btn');

        const cards = document.querySelectorAll('.skin-card');
        const firstCard = cards[0] as HTMLElement;
        const e = new Event('click');
        vi.spyOn(e, 'stopPropagation');
        firstCard.dispatchEvent(e);

        expect(e.stopPropagation).toHaveBeenCalled();
        expect(onChange).toHaveBeenCalled();
    });

    it('should cover early return when startScreenContent is missing', () => {
        document.body.innerHTML = '';
        renderSkinSelector();
        expect(document.getElementById('skinSelector')).toBeNull();
    });

    it('should cover undefined onChange in event listener', () => {
        document.body.innerHTML = '<div class="start-screen-content"></div>';
        vi.spyOn(skinsModule, 'getHighScore').mockReturnValue(1000000); // All unlocked
        vi.spyOn(skinsModule, 'selectSkin').mockReturnValue(true);

        renderSkinSelector(); // Call without onChange

        const cards = document.querySelectorAll('.skin-card');
        const firstCard = cards[0] as HTMLElement;
        const e = new Event('click');
        vi.spyOn(e, 'stopPropagation');
        firstCard.dispatchEvent(e);

        expect(e.stopPropagation).toHaveBeenCalled();
        // Just checking it doesn't crash when onChange is undefined
    });
});
