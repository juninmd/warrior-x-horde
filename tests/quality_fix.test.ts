import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager Coverage Fixes', () => {
  beforeEach(() => {
    QualityManager.resetInstance();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should detect mobile device and set lower threshold', () => {
    // Mock navigator userAgent to simulate mobile
    vi.stubGlobal('navigator', {
        userAgent: 'iPhone'
    });

    const qm = QualityManager.getInstance();
    // @ts-ignore
    expect(qm.isMobile).toBe(true);

    // Call updateFPS enough times to trigger low quality with lower threshold (30)
    // We need to drop FPS below 45. dt > 22ms (1000/22 = 45.45) -> 45FPS.
    // dt = 30ms -> 33 FPS.

    // We need > 30 frames of bad FPS.
    for (let i = 0; i <= 31; i++) {
        qm.updateFPS(30);
    }

    // Check if low quality triggered
    // @ts-ignore
    expect(qm.lowQualityTriggered).toBe(true);
  });

  it('should use higher threshold for desktop', () => {
    // Mock navigator userAgent to simulate desktop
    vi.stubGlobal('navigator', {
        userAgent: 'Chrome' // Not mobile
    });

    const qm = QualityManager.getInstance();
    // @ts-ignore
    expect(qm.isMobile).toBe(false);

    // threshold is 120.
    // 35 bad frames shouldn't trigger it
    for (let i = 0; i <= 35; i++) {
        qm.updateFPS(30);
    }
    // @ts-ignore
    expect(qm.lowQualityTriggered).toBe(false);

    // 125 frames should
    for (let i = 0; i <= 90; i++) {
        qm.updateFPS(30);
    }
     // @ts-ignore
    expect(qm.lowQualityTriggered).toBe(true);
  });

  it('should handle missing navigator gracefully', () => {
      // Stub navigator to undefined
      vi.stubGlobal('navigator', undefined);

      const qm = QualityManager.getInstance();
      // @ts-ignore
      expect(qm.isMobile).toBe(false);
  });
});
