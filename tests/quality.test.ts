
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
});
