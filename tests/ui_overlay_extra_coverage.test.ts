import { describe, it, expect, vi } from 'vitest';
import { _testing, updateStartScreenLeaderboard, setupStartScreenInstallBtn } from '../src/ui-overlay';

describe('UI Overlay Extra Coverage', () => {
    it('should handle NaN score in leaderboard', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify([
            { score: 'NaN', timestamp: 0 }
        ]));
        vi.spyOn(JSON, 'parse').mockImplementation(() => [{score: NaN, timestamp: 0}]);

        const el = _testing.getLeaderboardElement();
        expect(el.innerHTML).toContain('0</div>');
        vi.restoreAllMocks();
    });

    it('should handle infinite score in leaderboard', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify([
            { score: 'Infinity', timestamp: 0 }
        ]));
        vi.spyOn(JSON, 'parse').mockImplementation(() => [{score: Infinity, timestamp: 0}]);

        const el = _testing.getLeaderboardElement();
        expect(el.innerHTML).toContain('0</div>');
        vi.restoreAllMocks();
    });

    it('should cover start screen logo branch', () => {
        document.body.innerHTML = `
            <div class="start-screen-content">
                <div class="game-logo"></div>
                <button class="start-btn"></button>
            </div>`;
        updateStartScreenLeaderboard();
        expect((document.querySelector('.game-logo') as HTMLElement).style.fontFamily).toContain('Rajdhani');
    });

    it('should cover fallback append in updateStartScreenLeaderboard', () => {
        document.body.innerHTML = `
            <div class="start-screen-content"></div>`;
        updateStartScreenLeaderboard();
        expect(document.getElementById('startScreenLeaderboard')).not.toBeNull();
    });

    it('should cover setupStartScreenInstallBtn logic', async () => {
        document.body.innerHTML = `
            <div class="start-screen-content">
                <button class="start-btn"></button>
            </div>`;

        let promptCalled = false;
        const mockPrompt = {
            prompt: () => { promptCalled = true; },
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };

        setupStartScreenInstallBtn(mockPrompt as any);
        const installBtn = document.getElementById('startInstallBtn');
        expect(installBtn).not.toBeNull();

        // Prevent duplicate append
        setupStartScreenInstallBtn(mockPrompt as any);
        const btns = document.querySelectorAll('#startInstallBtn');
        expect(btns.length).toBe(1);

        const e = new Event('click');
        vi.spyOn(e, 'stopPropagation');
        await installBtn!.onclick!(e as any);

        expect(promptCalled).toBe(true);
        expect(document.getElementById('startInstallBtn')).toBeNull();
    });


    it('should cover fallback append in setupStartScreenInstallBtn', () => {
        document.body.innerHTML = `
            <div class="start-screen-content">
                <button class="start-btn"></button>
            </div>`;


        const mockPrompt = {
            prompt: () => {},
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };

        setupStartScreenInstallBtn(mockPrompt as any);
        expect(document.getElementById('startInstallBtn')).not.toBeNull();
    });
});
