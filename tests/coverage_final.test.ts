import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('Final Coverage Fixes', () => {
    beforeEach(() => {
        QualityManager.resetInstance();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should handle stable FPS range (50-55) in checkRecovery', () => {
        const qm = QualityManager.getInstance();
        qm.setQuality('auto');

        // Force low quality state
        // @ts-ignore
        qm.lowQualityTriggered = true;
        // @ts-ignore
        qm.recoveryFrames = 10;

        // 52 FPS -> dt = 1000/52 = 19.23ms
        qm.checkRecovery(19.23);

        // recoveryFrames should not change (neither incremented nor reset)
        // @ts-ignore
        expect(qm.recoveryFrames).toBe(10);
    });

    it('should restore quality with mobile settings', () => {
        // Mock mobile
        vi.stubGlobal('navigator', { userAgent: 'iPhone' });
        const qm = QualityManager.getInstance();

        // @ts-ignore
        qm.lowQualityTriggered = true;
        // @ts-ignore
        qm.recoveryFrames = 301; // Ready to recover

        // Trigger recovery
        qm.checkRecovery(16);

        // Check particle multiplier for mobile
        expect(qm.settings.particleMultiplier).toBe(0.8);
    });
});
