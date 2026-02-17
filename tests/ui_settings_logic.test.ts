
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupSettingsUI, toggleSettingsMenu, _testing } from '../src/ui-settings';
import { SettingsManager } from '../src/settings';
import { gameState } from '../src/gameState';
import * as audioModule from '../src/audio';
import * as gameModule from '../src/game';

// Mock modules
vi.mock('../src/audio', () => ({
  toggleMute: vi.fn(() => false), // returns isMuted (false = unmuted)
  isMusicMuted: vi.fn(() => true), // initially muted
  playMusic: vi.fn(),
  stopAllMusic: vi.fn(),
  audioManager: {}
}));

vi.mock('../src/game', () => ({
  toggleFullscreen: vi.fn(),
  gameState: {}, // overwritten in beforeEach
}));

vi.mock('../src/input', () => ({
  vibrate: vi.fn(),
}));

describe('UI Settings Coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _testing.reset();
    vi.clearAllMocks();

    // Reset SettingsManager
    const sm = SettingsManager.getInstance();
    sm.soundEnabled = true;
    sm.hapticsEnabled = true;
    sm.quality = 'auto';

    // Set gameState
    Object.assign(gameState, {
        isStarted: true,
        isPaused: false,
        bossActive: false
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should play music when unmuting if game is active', () => {
    setupSettingsUI();
    toggleSettingsMenu(); // Open menu

    const soundBtn = document.getElementById('soundBtn') as HTMLButtonElement;
    expect(soundBtn).toBeTruthy();

    // Mock toggleMute to return false (unmuted)
    vi.mocked(audioModule.toggleMute).mockReturnValue(false);

    // Click sound button
    soundBtn.click();

    expect(audioModule.toggleMute).toHaveBeenCalled();
    // Since game is started and not paused, playMusic should be called
    expect(audioModule.playMusic).toHaveBeenCalledWith(false);
  });
});
