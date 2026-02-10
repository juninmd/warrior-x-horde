import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupSettingsUI, toggleSettingsMenu, _testing } from '../src/ui-settings';
import { QualityManager } from '../src/quality';

// Mock dependencies
vi.mock('../src/input', () => ({
  vibrate: vi.fn(),
  setInputScale: vi.fn(),
  triggerHaptic: vi.fn(),
  initializeMousePosition: vi.fn(),
  setupInput: vi.fn(),
  getMouseX: vi.fn(),
  setGameStateRef: vi.fn(),
}));

// Mock game.ts to avoid side effects during import if possible,
// but ui-settings imports toggleFullscreen from it.
vi.mock('../src/game', () => ({
  toggleFullscreen: vi.fn(),
  // Add other exports if ui-settings uses them
}));

describe('UI Settings Power Saver Coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _testing.reset();
    QualityManager.getInstance().settings.powerSavingMode = false; // Reset to known state
  });

  it('should handle Power Saver Toggle click', () => {
    setupSettingsUI();
    toggleSettingsMenu(); // Open it

    const btn = document.getElementById('powerBtn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.innerText).toBe('OFF');

    // Click to toggle ON
    btn.click();
    expect(QualityManager.getInstance().settings.powerSavingMode).toBe(true);
    expect(btn.innerText).toBe('ON');

    // Click to toggle OFF
    btn.click();
    expect(QualityManager.getInstance().settings.powerSavingMode).toBe(false);
    expect(btn.innerText).toBe('OFF');
  });

  it('should initialize with Power Saver ON if setting is true', () => {
    QualityManager.getInstance().settings.powerSavingMode = true;
    setupSettingsUI();
    toggleSettingsMenu();

    const btn = document.getElementById('powerBtn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.innerText).toBe('ON');
  });
});
