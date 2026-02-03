import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityManager } from '../src/quality';

describe('QualityManager Coverage', () => {
  let qualityManager: QualityManager;

  beforeEach(() => {
    // Reset singleton instance hack
    (QualityManager as any)._instance = null;
    qualityManager = QualityManager.getInstance();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should return singleton instance', () => {
    const q1 = QualityManager.getInstance();
    const q2 = QualityManager.getInstance();
    expect(q1).toBe(q2);
  });

  it('should initialize with default settings', () => {
    expect(qualityManager.settings.enableShadows).toBe(true);
    expect(qualityManager.settings.particleMultiplier).toBe(1.0);
  });

  it('should handle setQuality(auto)', () => {
    qualityManager.setQuality('auto');
    expect((qualityManager as any).manualMode).toBe(false);
    expect((qualityManager as any).lowQualityTriggered).toBe(false);
    expect(qualityManager.settings.maxRenderedSoldiers).toBe(150);
  });

  it('should handle setQuality(high)', () => {
    qualityManager.setQuality('high');
    expect((qualityManager as any).manualMode).toBe(true);
    expect(qualityManager.settings.maxRenderedSoldiers).toBe(250);
    expect(qualityManager.settings.enableShadows).toBe(true);
  });

  it('should handle setQuality(low)', () => {
    qualityManager.setQuality('low');
    expect((qualityManager as any).manualMode).toBe(true);
    expect((qualityManager as any).lowQualityTriggered).toBe(true);
    expect(qualityManager.settings.enableShadows).toBe(false);
    expect(qualityManager.settings.particleMultiplier).toBe(0.3);
  });

  it('should ignore updateFPS when in manual mode', () => {
    qualityManager.setQuality('high');
    (qualityManager as any).fpsDropFrames = 0;

    // Simulate horrible FPS
    qualityManager.updateFPS(100); // 10 FPS

    expect((qualityManager as any).fpsDropFrames).toBe(0); // Should not increment
  });

  it('should trigger low quality automatically if FPS drops consistently', () => {
    qualityManager.setQuality('auto');

    // Trigger drops: 120 frames threshold
    for (let i = 0; i < 125; i++) {
        qualityManager.updateFPS(50); // 20 FPS (< 45 threshold)
    }

    expect((qualityManager as any).lowQualityTriggered).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Performance degraded'));
  });

  it('should recover drop frames count if FPS is good', () => {
    qualityManager.setQuality('auto');
    (qualityManager as any).fpsDropFrames = 10;

    qualityManager.updateFPS(16); // 60 FPS

    expect((qualityManager as any).fpsDropFrames).toBe(9);
  });

  it('should ignore very long frames (pauses)', () => {
    qualityManager.setQuality('auto');
    const initial = (qualityManager as any).fpsDropFrames;

    qualityManager.updateFPS(500); // 500ms > 100ms limit

    expect((qualityManager as any).fpsDropFrames).toBe(initial);
  });
});
