
import { describe, it, expect, beforeEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager', () => {
  let qm: QualityManager;

  beforeEach(() => {
    // Reset instance (singleton hack if needed, or just setQuality)
    qm = QualityManager.getInstance();
    qm.setQuality('auto');
  });

  it('should handle "high" quality setting', () => {
    qm.setQuality('high');
    expect(qm.settings.enableShadows).toBe(true);
    expect(qm.settings.particleMultiplier).toBe(1.0);
    expect(qm.settings.maxRenderedSoldiers).toBe(250);
  });

  it('should handle "low" quality setting', () => {
    qm.setQuality('low');
    expect(qm.settings.enableShadows).toBe(false);
    expect(qm.settings.particleMultiplier).toBe(0.3);
  });

  it('should handle "auto" quality setting', () => {
    qm.setQuality('low'); // First change it
    qm.setQuality('auto');
    expect(qm.settings.enableShadows).toBe(true);
    expect(qm.settings.particleMultiplier).toBe(1.0);
  });

  it('should detect mobile device and adjust settings', () => {
    // Hack to reset singleton for this test
    // @ts-ignore
    QualityManager._instance = undefined;

    // Mock User Agent
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPhone' },
        writable: true
    });

    const mobileQm = QualityManager.getInstance();
    expect(mobileQm.settings.particleMultiplier).toBe(0.8);

    // Cleanup
    Object.defineProperty(global, 'navigator', { value: originalNavigator, writable: true });
    // @ts-ignore
    QualityManager._instance = undefined;
  });
});
