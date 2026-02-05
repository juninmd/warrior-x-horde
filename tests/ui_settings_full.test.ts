import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupSettingsUI, toggleSettingsMenu, _testing } from '../src/ui-settings';
import { SettingsManager } from '../src/settings';
import * as audio from '../src/audio';
import * as input from '../src/input';
import * as game from '../src/game';
import { gameState } from '../src/gameState';

vi.mock('../src/settings', () => ({
  SettingsManager: {
    getInstance: vi.fn(),
  }
}));

vi.mock('../src/audio', () => ({
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn(),
  playMusic: vi.fn(),
}));

vi.mock('../src/input', () => ({
  vibrate: vi.fn(),
}));

vi.mock('../src/game', () => ({
  toggleFullscreen: vi.fn(),
}));

describe('UI Settings', () => {
  let mockSettings: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    _testing.reset();

    mockSettings = {
      soundEnabled: true,
      hapticsEnabled: true,
      quality: 'auto',
    };

    // @ts-ignore
    SettingsManager.getInstance.mockReturnValue(mockSettings);
    // @ts-ignore
    audio.isMusicMuted.mockReturnValue(false);
  });

  it('should create settings modal', () => {
    setupSettingsUI();
    const modal = document.getElementById('settingsModal');
    expect(modal).not.toBeNull();
    expect(modal?.style.display).toBe('none');
  });

  it('should toggle visibility', () => {
    setupSettingsUI();
    const modal = document.getElementById('settingsModal') as HTMLElement;

    toggleSettingsMenu();
    expect(modal.style.display).toBe('flex');

    toggleSettingsMenu();
    expect(modal.style.display).toBe('none');
  });

  it('should toggle sound', () => {
    setupSettingsUI();
    const btn = document.getElementById('soundBtn') as HTMLButtonElement;

    // Initial state: ON (not muted)
    expect(btn.innerText).toBe('ON');

    // Click to mute
    // @ts-ignore
    audio.toggleMute.mockReturnValue(true); // Now muted
    btn.click();

    expect(mockSettings.soundEnabled).toBe(false);
    expect(btn.innerText).toBe('OFF');

    // Click to unmute
    // @ts-ignore
    audio.toggleMute.mockReturnValue(false); // Now unmuted
    gameState.isStarted = true;
    gameState.isPaused = false;
    btn.click();

    expect(mockSettings.soundEnabled).toBe(true);
    expect(btn.innerText).toBe('ON');
    expect(audio.playMusic).toHaveBeenCalled();
  });

  it('should toggle haptics', () => {
    setupSettingsUI();
    const btn = document.getElementById('hapticsBtn') as HTMLButtonElement;

    expect(btn.innerText).toBe('ON');

    btn.click();
    expect(mockSettings.hapticsEnabled).toBe(false);
    expect(btn.innerText).toBe('OFF');

    btn.click();
    expect(mockSettings.hapticsEnabled).toBe(true);
    expect(btn.innerText).toBe('ON');
    expect(input.vibrate).toHaveBeenCalledWith(50);
  });

  it('should cycle quality', () => {
    setupSettingsUI();
    const btn = document.getElementById('qualityBtn') as HTMLButtonElement;

    expect(btn.innerText).toBe('AUTO');

    // Auto -> High
    btn.click();
    expect(mockSettings.quality).toBe('high');
    expect(btn.innerText).toBe('HIGH');

    // High -> Low
    btn.click();
    expect(mockSettings.quality).toBe('low');
    expect(btn.innerText).toBe('LOW');

    // Low -> Auto
    btn.click();
    expect(mockSettings.quality).toBe('auto');
    expect(btn.innerText).toBe('AUTO');
  });

  it('should toggle fullscreen', () => {
    setupSettingsUI();
    const btn = document.getElementById('fullscreenBtn') as HTMLButtonElement;
    btn.click();
    expect(game.toggleFullscreen).toHaveBeenCalled();
  });

  it('should close menu via Close button', () => {
     setupSettingsUI();
     toggleSettingsMenu(); // Open it
     const modal = document.getElementById('settingsModal') as HTMLElement;
     expect(modal.style.display).toBe('flex');

     // Find Close button (last button)
     const buttons = document.querySelectorAll('button');
     const closeBtn = buttons[buttons.length - 1]; // Assume last is Close based on logic

     // Verify text to be sure
     expect(closeBtn.innerText).toBe('CLOSE');

     closeBtn.click();
     expect(modal.style.display).toBe('none');
  });

  it('should sync sound button state when opening menu', () => {
      setupSettingsUI();
      const modal = document.getElementById('settingsModal') as HTMLElement;
      modal.style.display = 'none';

      // Simulate muted state from elsewhere
      // @ts-ignore
      audio.isMusicMuted.mockReturnValue(true);

      toggleSettingsMenu(); // Open

      const btn = document.getElementById('soundBtn') as HTMLButtonElement;
      expect(btn.innerText).toBe('OFF');
      // Verify color for OFF (red)
      expect(btn.style.background).toBe('rgb(231, 76, 60)'); // #E74C3C

      // Simulate unmuted
      modal.style.display = 'none';
      // @ts-ignore
      audio.isMusicMuted.mockReturnValue(false);

      toggleSettingsMenu(); // Open

      expect(btn.innerText).toBe('ON');
      // Verify color for ON (green)
      expect(btn.style.background).toBe('rgb(46, 204, 113)'); // #2ECC71
  });

  it('should set correct styles for quality button', () => {
      setupSettingsUI();
      const btn = document.getElementById('qualityBtn') as HTMLButtonElement;

      // AUTO -> Blue
      expect(btn.innerText).toBe('AUTO');
      expect(btn.style.background).toBe('rgb(52, 152, 219)'); // #3498DB
  });

  it('should handle toggleSettingsMenu when modal is not present (idempotent)', () => {
       _testing.reset();
       // Mock setupSettingsUI internally if needed?
       // Actually, we want to test if it tries to create it.
       // toggleSettingsMenu calls setupSettingsUI if !settingsModal.

       toggleSettingsMenu();
       const modal = document.getElementById('settingsModal');
       expect(modal).not.toBeNull();
  });

  it('should handle missing sound button gracefully in toggleSettingsMenu', () => {
      setupSettingsUI();
      const modal = document.getElementById('settingsModal') as HTMLElement;
      modal.style.display = 'none';

      // Remove sound button manually
      const soundBtn = document.getElementById('soundBtn');
      if (soundBtn) soundBtn.remove();

      toggleSettingsMenu(); // Should not crash
      expect(modal.style.display).toBe('flex');
  });

  it('should initialize haptics toggle correctly when disabled', () => {
      // @ts-ignore
      SettingsManager.getInstance.mockReturnValue({ ...mockSettings, hapticsEnabled: false });

      setupSettingsUI();
      const btn = document.getElementById('hapticsBtn') as HTMLButtonElement;
      expect(btn.innerText).toBe('OFF');
      expect(btn.style.background).toBe('rgb(231, 76, 60)'); // #E74C3C
  });
});
