import { SettingsManager } from './settings';
import { toggleMute, isMusicMuted, playMusic } from './audio';
import { vibrate } from './input';
import { gameState } from './gameState';
import { toggleFullscreen } from './game';

let settingsModal: HTMLElement | null = null;

export const _testing = {
  reset: () => { settingsModal = null; }
};

function createSettingsModal(): void {
  settingsModal = document.createElement('div');
  settingsModal.id = 'settingsModal';
  settingsModal.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  // Explicitly set display for JSDOM
  settingsModal.style.display = 'none';

  const content = document.createElement('div');
  content.style.cssText = `
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #FFD700;
    border-radius: 20px;
    padding: 30px;
    width: 300px;
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
    text-align: center;
    color: #FFF;
    font-family: Arial, sans-serif;
  `;

  const title = document.createElement('h2');
  title.innerText = 'SETTINGS';
  title.style.cssText = 'margin: 0 0 20px 0; color: #FFD700; font-size: 24px; font-weight: 900;';
  content.appendChild(title);

  const sm = SettingsManager.getInstance();

  // Helper for toggle buttons
  const createToggle = (label: string, id: string, initialValue: boolean | string, onClick: (btn: HTMLButtonElement) => void) => {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;';

    const lbl = document.createElement('span');
    lbl.innerText = label;
    lbl.style.fontWeight = 'bold';

    const btn = document.createElement('button');
    btn.id = id;
    btn.innerText = String(initialValue).toUpperCase();
    btn.style.cssText = `
        padding: 8px 15px;
        background: #444;
        border: 1px solid #666;
        border-radius: 8px;
        color: #FFF;
        cursor: pointer;
        width: 100px;
        font-weight: bold;
    `;

    const updateStyle = (val: boolean | string) => {
        if (val === true || val === 'ON') {
             btn.style.background = '#2ECC71';
             btn.style.borderColor = '#27AE60';
        } else if (val === false || val === 'OFF') {
             btn.style.background = '#E74C3C';
             btn.style.borderColor = '#C0392B';
        } else {
             // For Quality (Auto/High/Low)
             btn.style.background = '#3498DB';
             btn.style.borderColor = '#2980B9';
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

  // Fullscreen
  createToggle('⛶ SCREEN', 'fullscreenBtn', 'FULL', () => {
      /* v8 ignore next */
      toggleFullscreen();
  });

  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'CLOSE';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 12px;
    margin-top: 10px;
    background: #FFD700;
    color: #000;
    border: none;
    border-radius: 10px;
    font-weight: 900;
    cursor: pointer;
    font-size: 16px;
  `;
  closeBtn.onclick = () => {
      vibrate(20);
      toggleSettingsMenu();
  };
  content.appendChild(closeBtn);

  settingsModal.appendChild(content);
  document.body.appendChild(settingsModal);
}

export function setupSettingsUI(): void {
    if (!document.getElementById('settingsModal')) {
        createSettingsModal();
    }
}

export function toggleSettingsMenu(): void {
    if (!settingsModal) setupSettingsUI();
    if (!settingsModal) return;

    if (settingsModal.style.display === 'flex') {
        settingsModal.style.display = 'none';
    } else {
        settingsModal.style.display = 'flex';
        // Sync button states if changed elsewhere (e.g. mute btn)
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) {
           const label = isMusicMuted() ? 'OFF' : 'ON';
           soundBtn.innerText = label;
           soundBtn.style.background = isMusicMuted() ? '#E74C3C' : '#2ECC71';
        }
    }
}
