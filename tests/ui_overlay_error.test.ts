import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _testing } from '../src/ui-overlay';

describe('UI Overlay Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle localStorage error when saving default leaderboard', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock getItem to return null so it tries to save defaults
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);

        // Mock setItem to throw
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        // Call the function that triggers the error
        _testing.getLeaderboardHTML();

        // Verify that the error was caught and logged
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save default leaderboard', expect.any(Error));
    });

    it('should filter out invalid entries from localStorage array', () => {
        const data = [
            { score: 100 },
            null,
            "invalid string",
            123,
            { notscore: 50 }
        ];
        vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));

        const html = _testing.getLeaderboardHTML();

        // The invalid entries should be ignored
        expect(html).toContain('100');
        expect(html).not.toContain('NaN');
    });
});
