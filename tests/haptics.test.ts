import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic, vibrate } from '../src/input';
import { SettingsManager } from '../src/settings';

describe('Haptic System', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;
  let currentTime = 1000;

  beforeEach(() => {
    // Mock navigator.vibrate
    vibrateMock = vi.fn();
    Object.defineProperty(global, 'navigator', {
      value: {
        vibrate: vibrateMock,
        userAgent: 'test'
      },
      writable: true,
      configurable: true
    });

    // Ensure haptics are enabled
    SettingsManager.getInstance().hapticsEnabled = true;

    // Reset time for throttling tests
    vi.useFakeTimers();
    // Advance time to ensure we are past any previous test's time
    currentTime += 1000;
    vi.setSystemTime(currentTime);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should call navigator.vibrate with correct pattern for "light"', () => {
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('should call navigator.vibrate with correct pattern for "heavy"', () => {
    triggerHaptic('heavy');
    expect(vibrateMock).toHaveBeenCalledWith(80);
  });

  it('should call navigator.vibrate with correct pattern for "success"', () => {
    triggerHaptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([40, 30, 40]);
  });

  it('should throttle "light" haptics', () => {
    // First call - should vibrate
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledTimes(1);

    // Immediate second call - should be ignored due to throttle (50ms)
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledTimes(1);

    // Advance time by 60ms
    vi.advanceTimersByTime(60);

    // Third call - should vibrate again
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledTimes(2);
  });

  it('should NOT throttle "heavy" haptics', () => {
    triggerHaptic('heavy');
    expect(vibrateMock).toHaveBeenCalledTimes(1);

    triggerHaptic('heavy');
    expect(vibrateMock).toHaveBeenCalledTimes(2);
  });

  it('should NOT vibrate if settings disable haptics', () => {
    SettingsManager.getInstance().hapticsEnabled = false;
    triggerHaptic('light');
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('should handle undefined navigator gracefully', () => {
    // Temporarily remove navigator
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true
    });

    // Should not throw
    expect(() => triggerHaptic('light')).not.toThrow();

    // Restore navigator
    Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
    });
  });
});
