import { vi, describe, it, expect, beforeEach } from 'vitest';
import { _testing } from '../src/ui-overlay';

describe('UI Overlay Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle localStorage error when saving default leaderboard', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
        _testing.getLeaderboardElement();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save default leaderboard', expect.any(Error));
    });

    it('should filter out invalid entries from localStorage array', () => {
        const data = [ { score: 100 }, null, "invalid string", 123, { notscore: 50 }, { score: 10 } ];
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));
        const el = _testing.getLeaderboardElement();
        expect(el.innerHTML).not.toContain('NaN');
    });

    it('should handle zero score and NaN values in leaderboard rendering', () => {
        vi.spyOn(JSON, 'parse').mockReturnValue([ { score: 0 }, { score: 'NaN' }, { score: 10 }, { score: 5 }, { score: 1 } ]);
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue('dummy');
        const el = _testing.getLeaderboardElement();
        expect(el.innerHTML).toContain('>0<');
        vi.restoreAllMocks();
    });

    it('should test Infinity to cover isFinite false branch', () => {
        vi.spyOn(JSON, 'parse').mockReturnValue([ { score: Infinity }, { score: 100 }, { score: 50 }, { score: 10 }, { score: 5 } ]);
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue('dummy');
        const el = _testing.getLeaderboardElement();
        expect(el.innerHTML).toContain('>0<');
        vi.restoreAllMocks();
    });
});
