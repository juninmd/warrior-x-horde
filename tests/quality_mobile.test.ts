
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager Mobile Detection', () => {
    let originalUserAgent: string;

    beforeEach(() => {
        originalUserAgent = navigator.userAgent;
        QualityManager.resetInstance();
    });

    afterEach(() => {
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
        QualityManager.resetInstance();
    });

    it('should detect mobile device and adjust settings', () => {
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Linux; Android 10; SM-G980F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
            configurable: true
        });

        const qm = QualityManager.getInstance();
        expect(qm.settings.particleMultiplier).toBe(0.8);
        expect(qm.settings.enableShadows).toBe(false);
        expect(qm.settings.resolutionScale).toBe(0.65);

        // Test auto setQuality logic for mobile
        qm.setQuality('auto');
        expect(qm.settings.resolutionScale).toBe(0.65);
        expect(qm.settings.particleMultiplier).toBe(0.8);
        expect(qm.settings.enableShadows).toBe(false);
    });

    it('should detect desktop device and adjust settings', () => {
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            configurable: true
        });

        const qm = QualityManager.getInstance();
        // Default values for desktop
        expect(qm.settings.particleMultiplier).toBe(1.0);
        expect(qm.settings.enableShadows).toBe(true);
        expect(qm.settings.resolutionScale).toBe(1.0);

        // Test auto setQuality logic for desktop
        qm.setQuality('auto');
        expect(qm.settings.particleMultiplier).toBe(1.0);
        expect(qm.settings.resolutionScale).toBe(1.0);
        expect(qm.settings.enableShadows).toBe(true);
    });
});
