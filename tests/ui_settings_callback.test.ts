import { describe, it, expect, vi, afterEach } from 'vitest';
import { setupSettingsUI, toggleSettingsMenu, _testing } from '../src/ui-settings';
import { gameState } from '../src/gameState';

// Mock dependencies
vi.mock('../src/settings', () => ({
  SettingsManager: {
    getInstance: () => ({
      soundEnabled: true,
      hapticsEnabled: true,
      quality: 'auto'
    })
  }
}));

vi.mock('../src/audio', () => ({
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn(() => false),
  playMusic: vi.fn()
}));

vi.mock('../src/input', () => ({
  vibrate: vi.fn()
}));

vi.mock('../src/game', () => ({
  toggleFullscreen: vi.fn()
}));

describe('UI Settings Callback Coverage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    _testing.reset();
    vi.restoreAllMocks();
  });

  it('should call onLevelChange callback when GO button is clicked', () => {
    const onLevelChangeSpy = vi.fn();

    // Setup UI with callback
    setupSettingsUI(onLevelChangeSpy);

    // Open menu to ensure elements are created and visible
    toggleSettingsMenu();

    // Find the input and button
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    const goBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'GO') as HTMLButtonElement;

    expect(input).toBeTruthy();
    expect(goBtn).toBeTruthy();

    // Set value and click
    input.value = '5';
    goBtn.click();

    expect(onLevelChangeSpy).toHaveBeenCalledWith(5);
  });

  it('should not show GO button if callback is not provided', () => {
    // Setup UI without callback
    setupSettingsUI();
    toggleSettingsMenu();

    // The "Level" section should probably not exist if no callback provided,
    // based on implementation: `if (onLevelChangeCallback) { ... }`
    // Let's verify that.

    const goBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'GO');
    expect(goBtn).toBeFalsy();
  });

  it('should not call callback if input is invalid', () => {
      const onLevelChangeSpy = vi.fn();
      setupSettingsUI(onLevelChangeSpy);
      toggleSettingsMenu();

      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      const goBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'GO') as HTMLButtonElement;

      // Invalid input <= 0
      input.value = '0';
      goBtn.click();

      expect(onLevelChangeSpy).not.toHaveBeenCalled();
  });
});
