import { SettingsManager } from './settings';
import { QualityManager } from './quality';
import { toggleMute, isMusicMuted, playMusic } from './audio';
import { vibrate } from './input';
import { gameState } from './gameState';
import { toggleFullscreen } from './game';

let settingsModal: HTMLElement | null = null;
let onLevelChangeCallback: ((level: number) => void) | null = null;

export const _testing = {
  reset: () => { settingsModal = null; onLevelChangeCallback = null; }
};

function createSettingsModal(): void {
  settingsModal = document.createElement('div');
  settingsModal.id = 'settingsModal';
  settingsModal.className = 'settings-modal';
  // Explicitly set display for JSDOM logic
  settingsModal.style.display = 'none';

  const content = document.createElement('div');
  content.className = 'settings-content';

  const title = document.createElement('h2');
  title.innerText = 'SETTINGS';
  title.className = 'settings-title';
  content.appendChild(title);

  const sm = SettingsManager.getInstance();

  // Helper for toggle buttons
  const createToggle = (label: string, id: string, initialValue: string, onClick: (btn: HTMLButtonElement) => void) => {
    const container = document.createElement('div');
    container.className = 'settings-row';

    const lbl = document.createElement('span');
    lbl.innerText = label;
    lbl.className = 'settings-label';

    const btn = document.createElement('button');
    btn.id = id;
    btn.innerText = String(initialValue).toUpperCase();
    btn.className = 'settings-toggle-btn';

    const updateStyle = (val: string) => {
        // Reset classes
        btn.classList.remove('on', 'off', 'auto');

        if (val === 'ON') {
             btn.classList.add('on');
        } else if (val === 'OFF') {
             btn.classList.add('off');
        } else {
             // For Quality (Auto/High/Low)
             btn.classList.add('auto');
        }
    };
    updateStyle(initialValue);

    btn.onclick = () => {
        vibrate(10);
        onClick(btn);
    };

    container.appendChild(lbl);
    container.appendChild(btn);
    content.appendChild(container);
    return { btn, updateStyle };
  };

  // Sound
  const soundToggle = createToggle('🔊 SOUND', 'soundBtn', isMusicMuted() ? 'OFF' : 'ON', (btn) => {
     const muted = toggleMute(); // Flips state
     sm.soundEnabled = !muted;
     const newState = muted ? 'OFF' : 'ON';
     btn.innerText = newState;
     soundToggle.updateStyle(newState);

     if (!muted && gameState.isStarted && !gameState.isPaused) {
         playMusic(gameState.bossActive);
     }
  });

  // Haptics
  const hapticsToggle = createToggle('📳 HAPTICS', 'hapticsBtn', sm.hapticsEnabled ? 'ON' : 'OFF', (btn) => {
     sm.hapticsEnabled = !sm.hapticsEnabled;
     const newState = sm.hapticsEnabled ? 'ON' : 'OFF';
     btn.innerText = newState;
     hapticsToggle.updateStyle(newState);
     if (sm.hapticsEnabled) vibrate(50);
  });

  // Quality
  const qualities = ['auto', 'high', 'low'];
  const qualityToggle = createToggle('🎨 QUALITY', 'qualityBtn', sm.quality.toUpperCase(), (btn) => {
     let idx = qualities.indexOf(sm.quality);
     idx = (idx + 1) % qualities.length;
     const newQ = qualities[idx] as 'auto' | 'high' | 'low';
     sm.quality = newQ;
     btn.innerText = newQ.toUpperCase();
     qualityToggle.updateStyle(newQ.toUpperCase());
  });

  // Power Saver
  const qm = QualityManager.getInstance();
  const powerToggle = createToggle('⚡ SAVER', 'powerBtn', qm.settings.powerSavingMode ? 'ON' : 'OFF', (btn) => {
     qm.settings.powerSavingMode = !qm.settings.powerSavingMode;
     const newState = qm.settings.powerSavingMode ? 'ON' : 'OFF';
     btn.innerText = newState;
     powerToggle.updateStyle(newState);
  });

  // Fullscreen
  createToggle('⛶ SCREEN', 'fullscreenBtn', 'FULL', () => {
      /* v8 ignore next */
      toggleFullscreen();
  });

  // Debug Level Selector
  if (onLevelChangeCallback) {
      const debugContainer = document.createElement('div');
      debugContainer.className = 'settings-debug-row';

      const lbl = document.createElement('span');
      lbl.innerText = '🔧 LEVEL';
      lbl.className = 'settings-debug-label';

      const controls = document.createElement('div');
      controls.className = 'settings-debug-controls';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '50';
      input.value = String(gameState.currentLevel || 1);
      input.className = 'settings-input';

      const goBtn = document.createElement('button');
      goBtn.innerText = 'GO';
      goBtn.className = 'settings-go-btn';
      goBtn.onclick = () => {
          vibrate(20);
          const val = parseInt(input.value);
          if (val > 0 && onLevelChangeCallback) {
              onLevelChangeCallback(val);
              toggleSettingsMenu();
          }
      };

      controls.appendChild(input);
      controls.appendChild(goBtn);
      debugContainer.appendChild(lbl);
      debugContainer.appendChild(controls);
      content.appendChild(debugContainer);
  }
  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'CLOSE';
  closeBtn.className = 'settings-close-btn'; // Ensure class is correct
  closeBtn.onclick = () => {
      vibrate(20);
      toggleSettingsMenu();
  };
  content.appendChild(closeBtn);

  settingsModal.appendChild(content);
  document.body.appendChild(settingsModal);
}

export function setupSettingsUI(onLevelChange?: (level: number) => void): void {
    if (onLevelChange) onLevelChangeCallback = onLevelChange;
    // Always recreate if not exists
    if (!document.getElementById('settingsModal')) {
        createSettingsModal();
    }
}

export function toggleSettingsMenu(): void {
    if (!settingsModal) setupSettingsUI();

    /* v8 ignore start */
    if (!settingsModal) return;
    /* v8 ignore stop */

    if (settingsModal.classList.contains('active') || settingsModal.style.display === 'flex') {
        settingsModal.classList.remove('active');
        settingsModal.style.display = 'none';
    } else {
        settingsModal.classList.add('active');
        settingsModal.style.display = 'flex';
        // Sync button states if changed elsewhere (e.g. mute btn)
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) {
           const label = isMusicMuted() ? 'OFF' : 'ON';
           soundBtn.innerText = label;
           soundBtn.classList.remove('on', 'off');
           soundBtn.classList.add(isMusicMuted() ? 'off' : 'on');
        }
    }
}
