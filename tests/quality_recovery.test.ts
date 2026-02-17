import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager Recovery', () => {
    beforeEach(() => {
        // Reset singleton
        QualityManager.resetInstance();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should trigger low quality on FPS drops', () => {
        const qm = QualityManager.getInstance();
        qm.setQuality('auto');

        // Simulate bad frames (< 45fps means > 22ms per frame)
        // Threshold is 120 frames
        for (let i = 0; i < 150; i++) {
            qm.updateFPS(30); // 33fps
        }

        expect(qm.lowQualityTriggered).toBe(true);
        expect(qm.settings.enableShadows).toBe(false);
    });

    it('should recover quality after stability', () => {
        const qm = QualityManager.getInstance();
        qm.setQuality('auto');

        // Trigger low quality first
        for (let i = 0; i < 150; i++) {
            qm.updateFPS(30);
        }
        expect(qm.lowQualityTriggered).toBe(true);

        // Simulate stability (FPS > 55 means < 18ms)
        // Need > 300 frames
        for (let i = 0; i < 310; i++) {
            qm.checkRecovery(16); // 60fps
        }

        expect(qm.lowQualityTriggered).toBe(false);
        expect(qm.settings.enableShadows).toBe(true);
    });

    it('should not recover if FPS dips', () => {
        const qm = QualityManager.getInstance();
        qm.setQuality('auto');

        // Trigger low quality
        for (let i = 0; i < 150; i++) {
            qm.updateFPS(30);
        }

        // 200 good frames
        for (let i = 0; i < 200; i++) {
            qm.checkRecovery(16);
        }

        // 1 bad frame (< 50fps means > 20ms)
        qm.checkRecovery(25); // 40fps

        // 150 good frames (total 350 but reset in middle)
        for (let i = 0; i < 150; i++) {
            qm.checkRecovery(16);
        }

        expect(qm.lowQualityTriggered).toBe(true);
    });

    it('should not check recovery in manual mode', () => {
        const qm = QualityManager.getInstance();
        qm.setQuality('low'); // Manual low

        expect(qm.lowQualityTriggered).toBe(true);

        // Even with good frames
        for (let i = 0; i < 500; i++) {
            qm.checkRecovery(16);
        }

        // Should still be low quality (triggered is technically true, but recovery shouldn't run)
        expect(qm.lowQualityTriggered).toBe(true);
    });

    it('should ignore lag spikes > 100ms', () => {
         const qm = QualityManager.getInstance();
         // Manually trigger low quality
         qm['lowQualityTriggered'] = true;

         const initialFrames = qm['recoveryFrames'];
         qm.checkRecovery(150);
         expect(qm['recoveryFrames']).toBe(initialFrames);
    });
});
