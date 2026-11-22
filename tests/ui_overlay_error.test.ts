import { vi, describe, it, expect, beforeEach } from 'vitest';
import { _testing } from '../src/ui-overlay';

describe('UI Overlay Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows placeholder scores to new players without persisting them', () => {
        // Persisted placeholders would evict a real first score below 800 from the top 5.
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
        const setItem = vi.spyOn(window.localStorage, 'setItem');
        const el = _testing.getLeaderboardElement();
        expect(el.querySelectorAll('.leaderboard-item')).toHaveLength(5);
        expect(setItem).not.toHaveBeenCalledWith('crowdLeaderboard', expect.anything());
        vi.restoreAllMocks();
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
