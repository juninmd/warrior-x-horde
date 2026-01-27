import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager', () => {
    let qualityManager: QualityManager;

    beforeEach(() => {
        // Reset singleton for testing if possible, or just get instance
        // Since it's a singleton, we might need to reset its internal state
        qualityManager = QualityManager.getInstance();
        // Reset state
        qualityManager['lowQualityTriggered'] = false;
        qualityManager['fpsDropFrames'] = 0;
        qualityManager.settings.enableShadows = true;
        qualityManager.settings.particleMultiplier = 1.0;
        qualityManager.settings.simplifiedRendering = false;
        qualityManager.settings.maxRenderedSoldiers = 150;
    });

    it('should be a singleton', () => {
        const instance1 = QualityManager.getInstance();
        const instance2 = QualityManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should have default settings', () => {
        expect(qualityManager.settings.enableShadows).toBe(true);
        expect(qualityManager.settings.particleMultiplier).toBe(1.0);
        expect(qualityManager.settings.simplifiedRendering).toBe(false);
        expect(qualityManager.settings.maxRenderedSoldiers).toBe(150);
    });

    it('should ignore very long frames (pause)', () => {
        qualityManager.updateFPS(200); // > 100ms
        expect(qualityManager['fpsDropFrames']).toBe(0);
    });

    it('should increment drop frames on low FPS', () => {
        // 40ms = 25 FPS (< 45)
        qualityManager.updateFPS(40);
        expect(qualityManager['fpsDropFrames']).toBe(1);
    });

    it('should decrement drop frames on high FPS', () => {
        qualityManager['fpsDropFrames'] = 10;
        // 16ms = 62.5 FPS (> 45)
        qualityManager.updateFPS(16);
        expect(qualityManager['fpsDropFrames']).toBe(9);
    });

    it('should trigger low quality after sustained low FPS', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Trigger 121 bad frames
        for (let i = 0; i <= 120; i++) {
             qualityManager.updateFPS(40); // 25 FPS
        }

        expect(qualityManager['lowQualityTriggered']).toBe(true);
        expect(qualityManager.settings.enableShadows).toBe(false);
        expect(qualityManager.settings.particleMultiplier).toBe(0.3);
        expect(qualityManager.settings.simplifiedRendering).toBe(true);
        expect(qualityManager.settings.maxRenderedSoldiers).toBe(60);
        expect(consoleSpy).toHaveBeenCalledWith("⚠️ Performance degraded. Switching to Low Quality Mode.");

        consoleSpy.mockRestore();
    });

    it('should not update if already low quality', () => {
         qualityManager['lowQualityTriggered'] = true;
         qualityManager['fpsDropFrames'] = 0;

         qualityManager.updateFPS(40);
         expect(qualityManager['fpsDropFrames']).toBe(0);
    });
});
