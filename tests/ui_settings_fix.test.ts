import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/game', () => ({
  toggleFullscreen: vi.fn(),
}));

import { setupSettingsUI, toggleSettingsMenu, _testing } from '../src/ui-settings';

describe('UI Settings Fix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _testing.reset();
  });

  it('should cover existing settingsModal branch in setupSettingsUI', () => {
    setupSettingsUI(); // Creates it
    expect(document.getElementById('settingsModal')).not.toBeNull();
    setupSettingsUI(); // Tests if it exists
    expect(document.getElementById('settingsModal')).not.toBeNull();
  });
});
