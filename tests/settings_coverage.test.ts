import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsManager } from '../src/settings';
import { QualityManager } from '../src/quality';

describe('SettingsManager Coverage', () => {
  let setQualitySpy: any;
  let warnSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    // Spy on QualityManager setQuality
    setQualitySpy = vi.spyOn(QualityManager.getInstance(), 'setQuality');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset singleton instance if possible
    (SettingsManager as any).instance = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load default settings if localStorage is empty', () => {
    const sm = SettingsManager.getInstance();
    expect(sm.hapticsEnabled).toBe(true);
    expect(sm.soundEnabled).toBe(true);
    expect(sm.quality).toBe('auto');
    expect(sm.highContrastEnabled).toBe(false);
  });

  it('should load settings from localStorage', () => {
    localStorage.setItem('crowdRunnerSettings', JSON.stringify({
      hapticsEnabled: false,
      soundEnabled: false,
      quality: 'high',
      masterVolume: 0.5
    }));

    const sm = SettingsManager.getInstance();

    expect(sm.hapticsEnabled).toBe(false);
    expect(sm.soundEnabled).toBe(false);
    expect(sm.quality).toBe('high');

    expect(setQualitySpy).toHaveBeenCalledWith('high');
  });

  it('should fall back to auto when stored quality is invalid', () => {
    localStorage.setItem('crowdRunnerSettings', JSON.stringify({ quality: 'ultra' }));

    const sm = SettingsManager.getInstance();

    expect(sm.quality).toBe('auto');
  });

  it('should handle corrupt localStorage data', () => {
    localStorage.setItem('crowdRunnerSettings', '{ corrupt json');

    const sm = SettingsManager.getInstance();
    expect(sm.hapticsEnabled).toBe(true); // Fallback to default

    expect(warnSpy).toHaveBeenCalled();
  });

  it('should save settings when modified', () => {
    const sm = SettingsManager.getInstance();
    sm.hapticsEnabled = false;

    const stored = JSON.parse(localStorage.getItem('crowdRunnerSettings') || '{}');
    expect(stored.hapticsEnabled).toBe(false);
  });

  it('should update high contrast mode and toggle class on body', () => {
    const sm = SettingsManager.getInstance();

    // Test setting to true
    sm.highContrastEnabled = true;
    expect(sm.highContrastEnabled).toBe(true);
    expect(document.body.classList.contains('high-contrast')).toBe(true);

    let stored = JSON.parse(localStorage.getItem('crowdRunnerSettings') || '{}');
    expect(stored.highContrastEnabled).toBe(true);

    // Test setting to false
    sm.highContrastEnabled = false;
    expect(sm.highContrastEnabled).toBe(false);
    expect(document.body.classList.contains('high-contrast')).toBe(false);

    stored = JSON.parse(localStorage.getItem('crowdRunnerSettings') || '{}');
    expect(stored.highContrastEnabled).toBe(false);
  });

  it('should apply high contrast mode on initialization if stored in settings', () => {
    localStorage.setItem('crowdRunnerSettings', JSON.stringify({
      highContrastEnabled: true
    }));

    const sm = SettingsManager.getInstance();
    expect(sm.highContrastEnabled).toBe(true);
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    document.body.classList.remove('high-contrast'); // cleanup
  });

  it('should update quality and notify QualityManager', () => {
    const sm = SettingsManager.getInstance();
    setQualitySpy.mockClear();

    sm.quality = 'low';

    expect(sm.quality).toBe('low');
    expect(setQualitySpy).toHaveBeenCalledWith('low');

    const stored = JSON.parse(localStorage.getItem('crowdRunnerSettings') || '{}');
    expect(stored.quality).toBe('low');
  });

  it('should update sound enabled state', () => {
    const sm = SettingsManager.getInstance();
    sm.soundEnabled = false;
    expect(sm.soundEnabled).toBe(false);

    const stored = JSON.parse(localStorage.getItem('crowdRunnerSettings') || '{}');
    expect(stored.soundEnabled).toBe(false);
  });

  it('should handle localStorage write errors gracefully', () => {
    const sm = SettingsManager.getInstance();

    // Spy on window.localStorage.setItem specifically for JSDOM
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
    });

    // Toggle value to force save
    sm.hapticsEnabled = !sm.hapticsEnabled;

    expect(warnSpy).toHaveBeenCalledWith('Failed to save settings', expect.any(Error));

    setItemSpy.mockRestore();
  });
});
