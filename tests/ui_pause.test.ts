import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPauseModal } from '../src/ui-overlay';

describe('Pause Modal', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.resetAllMocks();
    });

    it('should create modal elements', () => {
        const onResume = vi.fn();
        const onRestart = vi.fn();
        const onSettings = vi.fn();

        createPauseModal(onResume, onRestart, onSettings);

        const modal = document.getElementById('pauseModal');
        expect(modal).toBeTruthy();
        expect(modal?.style.display).toBe('none');

        const buttons = modal?.querySelectorAll('button');
        expect(buttons?.length).toBe(4); // Resume, Restart, Settings, Quit

        // Test Clicks
        if (buttons) {
            buttons[0].click(); // Resume
            expect(onResume).toHaveBeenCalled();

            buttons[1].click(); // Restart
            expect(onRestart).toHaveBeenCalled();

            buttons[2].click(); // Settings
            expect(onSettings).toHaveBeenCalled();
        }
    });

    it('should return if modal already exists', () => {
        createPauseModal(vi.fn(), vi.fn(), vi.fn());
        const modal1 = document.getElementById('pauseModal');

        // Call again
        createPauseModal(vi.fn(), vi.fn(), vi.fn());
        const modals = document.querySelectorAll('#pauseModal');

        expect(modals.length).toBe(1);
    });

    it('quit button should reload page', () => {
        const reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: reloadMock }
        });

        createPauseModal(vi.fn(), vi.fn(), vi.fn());
        const modal = document.getElementById('pauseModal');
        const quitBtn = modal?.querySelectorAll('button')[3];
        quitBtn?.click();

        expect(reloadMock).toHaveBeenCalled();
    });
});
